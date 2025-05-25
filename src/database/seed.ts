import {drizzle} from 'drizzle-orm/bun-sqlite';
import {Database} from 'bun:sqlite';
import * as schema from '../schema';
import {v4 as uuidv4} from 'uuid';
import { memory_categories } from '../config/memory.config';
import {type NewMessage} from '../schema/message';
import { tools as schemaTools } from '../schema/tool';

const sqlite = new Database('./agi.db');
const db = drizzle(sqlite, {schema});

const categories = memory_categories;

const users = [
  {
    uuid: uuidv4(),
    name: 'Test User',
    email: 'user@example.com',
    token: process.env.API_KEY, // random token for auth
    active: true,
    phone: '+1234567890', // placeholder phone
    context: 'test user',
    environment: JSON.stringify({
      location: 'Default Location',
      time: new Date().toISOString(),
      weather: 'Clear, 20°C',
      music: 'No music playing',
      activity: 'Idle'
    })
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

const documents = [
  {
    uuid: uuidv4(),
    source_uuid: conversations[0].uuid,
    conversation_uuid: conversations[0].uuid,
    text: 'Project setup instructions...',
    metadata: JSON.stringify({
      title: 'Setup Guide',
      description: 'Instructions to set up the project',
      headers: [
        {
          h1: 'Introduction',
          h2: 'Requirements',
          h3: 'Installation',
          h4: '',
          h5: '',
          h6: ''
        }
      ],
      images: ['https://example.com/setup-image1.png'],
      links: ['https://example.com/setup-guide']
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const memories = [
  {
    uuid: uuidv4(),
    name: 'Project Ideas',
    category_uuid: categories[1].uuid,
    document_uuid: documents[0].uuid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const conversationMemories = [
  {
    conversation_uuid: conversations[0].uuid,
    memory_uuid: memories[0].uuid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

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

    await db.insert(schema.documents).values(documents);
    console.log('✅ Documents seeded successfully');

    await db.insert(schema.memories).values(memories);
    console.log('✅ Memories seeded successfully');

    await db.insert(schema.conversationMemories).values(conversationMemories);
    console.log('✅ Conversation Memories seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding:', error);
  }
};

main();
