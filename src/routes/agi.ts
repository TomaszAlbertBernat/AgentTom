import { Hono } from 'hono';
import type { AppEnv } from '../types/hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { conversations } from '../schema/conversation';
import { messages } from '../schema/message';
import { eq } from 'drizzle-orm';
import { completion } from '../services/common/llm.service';
import { streamResponse } from '../utils/response';
import { observer } from '../services/agent/observer.service';

// The auth middleware populates c.get('request').user
const agi = new Hono<AppEnv>();

// Default model for AGI routes
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Validation schemas
const messageSchema = z.union([
  z.object({
    content: z.string().min(1),
    conversation_id: z.string().optional(),
  }),
  z.object({
    message: z.string().min(1),
    conversation_id: z.string().optional(),
  })
]);

// Cron/system chat schema
const cronChatSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string().min(1)
  })).min(1)
});

// Create new conversation
agi.post('/conversations', async (c) => {
  const conversation_uuid = uuidv4();
  const req = c.get('request') as any;
  const user_id = req?.user?.uuid || req?.user?.id;

  await db.insert(conversations).values({
    uuid: conversation_uuid,
    user_id,
    name: 'New Conversation',
  });

  return c.json({ conversation_id: conversation_uuid });
});

// Send message
agi.post('/messages', zValidator('json', messageSchema), async (c) => {
  const body = c.req.valid('json') as any;
  const content = body.content ?? body.message;
  const conversation_id = body.conversation_id as string | undefined;
  const req = c.get('request') as any;
  const user_id = req?.user?.uuid || req?.user?.id;

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

  // Prepare messages for LLM (filter out tool messages and ensure content exists)
  const llm_messages = history
    .filter(msg => msg.role !== 'tool' && msg.content) // Filter out tool messages and null content
    .map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content!,
    }));

  // Get AI response via centralized LLM service
  const ai_response = await completion.text({
    model: DEFAULT_MODEL,
    messages: llm_messages,
    temperature: 0.7,
    max_tokens: 2000,
    user: { uuid: user_id, name: 'agi' }
  }) as string;

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

// Streaming chat (SSE)
agi.post('/chat/stream', zValidator('json', messageSchema), async (c) => {
  const body = c.req.valid('json') as any;
  const content = body.content ?? body.message;
  const conversation_id = body.conversation_id as string | undefined;
  const req = c.get('request') as any;
  const user_id = req?.user?.uuid || req?.user?.id;

  // Ensure conversation exists
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
  await db.insert(messages).values({
    uuid: uuidv4(),
    conversation_uuid: current_conversation_id,
    role: 'user',
    content_type: 'text',
    content,
  });

  // Build conversation history
  const history = await db.query.messages.findMany({
    where: (messages, { eq }) => eq(messages.conversation_uuid, current_conversation_id),
    orderBy: (messages, { asc }) => [asc(messages.created_at)],
  });

  const llm_messages = history
    .filter(msg => msg.role !== 'tool' && msg.content)
    .map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content!,
    }));

  // Initialize trace and generation for streaming
  const trace = observer.initializeTrace('agi_chat_stream')!;
  const generation = observer.startGeneration({
    name: 'completion_stream',
    input: llm_messages,
  });

  // Create async iterable text stream
  const text_stream = await completion.stream({
    model: DEFAULT_MODEL,
    messages: llm_messages,
    temperature: 0.7,
    max_tokens: 2000,
    user: { uuid: user_id, name: 'agi-stream' }
  });

  // Convert AsyncIterable<string> to ReadableStream<string>
  const readable = new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of text_stream as AsyncIterable<string>) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });

  return streamResponse(
    c,
    readable,
    {
      traceId: trace.id,
      generationId: generation.id,
      messages: llm_messages,
      conversation_id: current_conversation_id,
    },
    DEFAULT_MODEL
  );
});

// Get conversation history
agi.get('/conversations/:id/messages', async (c) => {
  const conversation_id = c.req.param('id');
  const req = c.get('request') as any;
  const user_id = req?.user?.uuid || req?.user?.id;

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

// AGI chat endpoint for system/cron usage (non-streaming)
agi.post('/chat', zValidator('json', cronChatSchema), async (c) => {
  const { conversation_id, messages: incoming } = c.req.valid('json');
  const req = c.get('request') as any;
  const user_id = req?.user?.uuid || req?.user?.id || 'system';

  // Ensure conversation exists
  let current_conversation_id = conversation_id;
  if (!current_conversation_id) {
    current_conversation_id = uuidv4();
    await db.insert(conversations).values({
      uuid: current_conversation_id,
      user_id,
      name: 'Chat Conversation',
    });
  }

  // Persist the latest user message if present
  const lastUser = [...incoming].reverse().find(m => m.role === 'user');
  if (lastUser) {
    await db.insert(messages).values({
      uuid: uuidv4(),
      conversation_uuid: current_conversation_id,
      role: 'user',
      content_type: 'text',
      content: lastUser.content,
    });
  }

  // Build history from DB and prepend system messages from incoming
  const history = await db.query.messages.findMany({
    where: (messages, { eq }) => eq(messages.conversation_uuid, current_conversation_id!),
    orderBy: (messages, { asc }) => [asc(messages.created_at)],
  });

  const llm_messages = [
    ...incoming.filter(m => m.role === 'system').map(m => ({ role: 'system' as const, content: m.content })),
    ...history
      .filter(msg => msg.role !== 'tool' && msg.content)
      .map(msg => ({ role: msg.role as 'user' | 'assistant' | 'system', content: msg.content! })),
    ...incoming.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
  ];

  const ai_response = await completion.text({
    model: DEFAULT_MODEL,
    messages: llm_messages,
    temperature: 0.7,
    max_tokens: 2000,
    user: { uuid: user_id, name: 'agi-cron' }
  }) as string;

  await db.insert(messages).values({
    uuid: uuidv4(),
    conversation_uuid: current_conversation_id!,
    role: 'assistant',
    content_type: 'text',
    content: ai_response,
  });

  await db.update(conversations)
    .set({ updated_at: new Date().toISOString() })
    .where(eq(conversations.uuid, current_conversation_id!));

  return c.json({ conversation_id: current_conversation_id, response: ai_response });
});

export { agi as agiRoutes };
