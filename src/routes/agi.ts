import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { conversations } from '../schema/conversation';
import { messages } from '../schema/message';
import { eq } from 'drizzle-orm';

// Import JWT middleware
import { jwtMiddleware } from '../routes/auth';

// Define the JWT payload type
interface JwtPayload {
  user_id: string;
  [key: string]: any;
}

// Define an extended Context type
interface AppContext {
  jwtPayload: JwtPayload;
}

const agi = new Hono<{ Variables: AppContext }>();

// Apply JWT middleware to all routes
agi.use('*', jwtMiddleware);

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
  const conversation_uuid = uuidv4();
  const user_id = c.get('jwtPayload').user_id;

  await db.insert(conversations).values({
    uuid: conversation_uuid,
    user_id,
    name: 'New Conversation',
  });

  return c.json({ conversation_id: conversation_uuid });
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
      uuid: current_conversation_id,
      user_id,
      name: 'Chat Conversation',
    });
  }

  // Store user message
  const user_message_id = uuidv4();
  await db.insert(messages).values({
    uuid: user_message_id,
    conversation_uuid: current_conversation_id,
    role: 'user',
    content_type: 'text',
    content,
  });

  // Get conversation history
  const history = await db.query.messages.findMany({
    where: (messages, { eq }) => eq(messages.conversation_uuid, current_conversation_id),
    orderBy: (messages, { asc }) => [asc(messages.created_at)],
  });

  // Prepare messages for OpenAI (filter out tool messages and ensure content exists)
  const openai_messages = history
    .filter(msg => msg.role !== 'tool' && msg.content) // Filter out tool messages and null content
    .map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content!,
    }));

  // Get AI response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: openai_messages,
    temperature: 0.7,
    max_tokens: 2000,
  });

  const ai_response = completion.choices[0].message.content || 'Sorry, I could not generate a response.';

  // Store AI response
  const ai_message_id = uuidv4();
  await db.insert(messages).values({
    uuid: ai_message_id,
    conversation_uuid: current_conversation_id,
    role: 'assistant',
    content_type: 'text',
    content: ai_response,
  });

  // Update conversation timestamp
  await db.update(conversations)
    .set({ updated_at: new Date().toISOString() })
    .where(eq(conversations.uuid, current_conversation_id));

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
      eq(conversations.uuid, conversation_id),
      eq(conversations.user_id, user_id)
    ),
  });

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Get messages
  const history = await db.query.messages.findMany({
    where: (messages, { eq }) => eq(messages.conversation_uuid, conversation_id),
    orderBy: (messages, { asc }) => [asc(messages.created_at)],
  });

  return c.json({ messages: history });
});

export { agi as agiRoutes };
