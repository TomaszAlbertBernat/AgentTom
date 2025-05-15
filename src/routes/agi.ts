import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { conversations } from '../schema/conversations';
import { messages } from '../schema/messages';

const agi = new Hono();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validation schemas
const messageSchema = z.object({
  content: z.string().min(1),
  conversation_id: z.string().optional(),
});

// Create new conversation
agi.post('/conversations', async (c) => {
  const conversation_id = uuidv4();
  const user_id = c.get('jwtPayload').user_id;

  await db.insert(conversations).values({
    id: conversation_id,
    user_id,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return c.json({ conversation_id });
});

// Send message
agi.post('/messages', zValidator('json', messageSchema), async (c) => {
  const { content, conversation_id } = c.req.valid('json');
  const user_id = c.get('jwtPayload').user_id;

  // Get or create conversation
  let current_conversation_id = conversation_id;
  if (!current_conversation_id) {
    current_conversation_id = uuidv4();
    await db.insert(conversations).values({
      id: current_conversation_id,
      user_id,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // Store user message
  const user_message_id = uuidv4();
  await db.insert(messages).values({
    id: user_message_id,
    conversation_id: current_conversation_id,
    role: 'user',
    content,
    created_at: new Date(),
  });

  // Get conversation history
  const history = await db.query.messages.findMany({
    where: (messages, { eq }) => eq(messages.conversation_id, current_conversation_id),
    orderBy: (messages, { asc }) => [asc(messages.created_at)],
  });

  // Prepare messages for OpenAI
  const openai_messages = history.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  // Get AI response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: openai_messages,
    temperature: 0.7,
    max_tokens: 2000,
  });

  const ai_response = completion.choices[0].message.content;

  // Store AI response
  const ai_message_id = uuidv4();
  await db.insert(messages).values({
    id: ai_message_id,
    conversation_id: current_conversation_id,
    role: 'assistant',
    content: ai_response,
    created_at: new Date(),
  });

  // Update conversation timestamp
  await db.update(conversations)
    .set({ updated_at: new Date() })
    .where(eq(conversations.id, current_conversation_id));

  return c.json({
    conversation_id: current_conversation_id,
    response: ai_response,
  });
});

// Get conversation history
agi.get('/conversations/:id/messages', async (c) => {
  const conversation_id = c.req.param('id');
  const user_id = c.get('jwtPayload').user_id;

  // Verify conversation belongs to user
  const conversation = await db.query.conversations.findFirst({
    where: (conversations, { eq, and }) => and(
      eq(conversations.id, conversation_id),
      eq(conversations.user_id, user_id)
    ),
  });

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Get messages
  const history = await db.query.messages.findMany({
    where: (messages, { eq }) => eq(messages.conversation_id, conversation_id),
    orderBy: (messages, { asc }) => [asc(messages.created_at)],
  });

  return c.json({ messages: history });
});

export { agi as agiRoutes };
