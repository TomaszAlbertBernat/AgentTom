import * as schema from '../schema';
import { db } from './index';
import {v4 as uuidv4} from 'uuid';
import { memory_categories } from '../config/memory.config';
import {type NewMessage} from '../schema/message';
import { tools as schemaTools } from '../schema/tool';
import { documentService } from '../services/agent/document.service';

const categories = memory_categories;

const users = [
  {
    uuid: uuidv4(),
    name: 'Test User',
    email: 'user@example.com',
    token: process.env.API_KEY, // random token for auth
    active: true,
    context: 'test user',
    environment: {
      location: 'Default Location',
      time: new Date().toISOString(),
      weather: 'Clear, 20°C',
      music: 'No music playing',
      activity: 'Idle'
    }
  }
];

const conversations = [
  {
    uuid: uuidv4(),
    user_id: users[0].uuid,
    name: 'Project Discussion',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const messages: NewMessage[] = [
  {
    uuid: uuidv4(),
    conversation_uuid: conversations[0].uuid,
    role: 'user' as const,
    content_type: 'text' as const,
    content: 'Hi, can you help me with the project setup?',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    uuid: uuidv4(),
    conversation_uuid: conversations[0].uuid,
    role: 'assistant' as const,
    content_type: 'text' as const,
    content: "Sure! Let's get started. What framework are you using?",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let seededDocumentUuid: string | null = null;

const memories: Array<{ uuid: string; name: string; category_uuid: string; document_uuid: string; created_at: string; updated_at: string; }> = [];

const conversationMemories: Array<{ conversation_uuid: string; memory_uuid: string; created_at: string; updated_at: string; }> = [];

// Seed tools
const seedTools = async () => {
  const initialTools = [
    {
      uuid: uuidv4(),
      name: 'weather',
      description: 'Get weather information for a location',
      instruction: 'Use this tool to get current weather conditions for any location.',
    },
    {
      uuid: uuidv4(),
      name: 'calculator',
      description: 'Perform mathematical calculations',
      instruction: 'Use this tool to evaluate mathematical expressions and perform calculations.',
    },
    {
      uuid: uuidv4(),
      name: 'translator',
      description: 'Translate text between languages',
      instruction: 'Use this tool to translate text from one language to another.',
    },
  ];

  for (const tool of initialTools) {
    await db.insert(schemaTools).values(tool);
  }

  console.log('Tools seeded successfully');
};

const main = async () => {
  console.log('🌱 Seeding...');

  try {
    await seedTools();
    console.log('✅ Tools seeded successfully');

    await db.insert(schema.categories).values(categories);
    console.log('✅ Categories seeded successfully');

    await db.insert(schema.users).values(users);
    console.log('✅ Users seeded successfully');

    await db.insert(schema.conversations).values(conversations);
    console.log('✅ Conversations seeded successfully');

    await db.insert(schema.messages).values(messages);
    console.log('✅ Messages seeded successfully');

    // Create a sample document using the service to ensure metadata alignment
    const createdDoc = await documentService.createDocument({
      conversation_uuid: conversations[0].uuid,
      source_uuid: conversations[0].uuid,
      text: 'Project setup instructions...\n\n- Install Bun\n- Configure env\n- Run migrations',
      metadata_override: {
        name: 'Setup Guide',
        description: 'Instructions to set up the project',
        headers: { h1: ['Introduction'], h2: ['Requirements'], h3: ['Installation'] },
        urls: ['https://example.com/setup-guide'],
        images: ['https://example.com/setup-image1.png'],
        should_index: false
      },
      content_type: 'full'
    });
    seededDocumentUuid = createdDoc.uuid;
    console.log('✅ Document created successfully');

    // Seed a sample memory referencing the created document
    const memoryUuid = uuidv4();
    memories.push({
      uuid: memoryUuid,
      name: 'Project Ideas',
      category_uuid: categories[1].uuid,
      document_uuid: seededDocumentUuid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await db.insert(schema.memories).values(memories as any);
    console.log('✅ Memories seeded successfully');

    conversationMemories.push({
      conversation_uuid: conversations[0].uuid,
      memory_uuid: memoryUuid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await db.insert(schema.conversationMemories).values(conversationMemories as any);
    console.log('✅ Conversation Memories seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding:', error);
  }
};

main();
