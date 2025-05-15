# AliceAGI Architecture

This document describes the architecture and core components of AliceAGI.

## 📁 Project Structure

```
src/
├── config/         # Configuration files and environment setup
├── database/       # Database setup, migrations, and seed data
├── dto/           # Data Transfer Objects for API requests/responses
├── middleware/    # Custom middleware (auth, rate limiting, etc.)
├── prompts/       # AI prompts and conversation templates
├── routes/        # API route handlers and controllers
├── schema/        # Database schemas and models
├── services/      # Business logic and external service integrations
├── types/         # TypeScript type definitions and interfaces
├── utils/         # Utility functions and helpers
├── app.ts         # Application setup and configuration
└── index.ts       # Entry point and server initialization
```

## 🏗️ Core Components

### 1. Application Layer
- **Entry Point** (`index.ts`)
  - Server initialization
  - Middleware setup
  - Route registration
  - Service initialization

- **App Configuration** (`app.ts`)
  - Hono application setup
  - Global middleware configuration
  - Error handling setup

### 2. API Layer
- **Routes** (`routes/`)
  - Authentication routes
  - AGI endpoints
  - File management
  - Tool execution
  - Conversation handling

- **Middleware** (`middleware/`)
  - Authentication
  - Rate limiting
  - Error handling
  - Request validation with Zod
  - Logging

### 3. Service Layer
- **AI Services** (`services/ai/`)
  - OpenAI integration (Vercel AI SDK)
  - Prompt management
  - Response processing

- **Tool Services** (`services/tools/`)
  - Tool execution
  - Tool configuration
  - Tool state management

- **Vector Services** (`services/vector/`)
  - Vector search
  - Embedding generation
  - Similarity matching

### 4. Data Layer
- **Database** (`database/`)
  - SQLite setup with Drizzle ORM
  - Migration management
  - Seed data

- **Schemas** (`schema/`)
  - Database models
  - Type definitions
  - Zod validation schemas

## 🔄 Data Flow

1. **Request Flow**
   ```
   Client Request
   → Middleware (Auth, Rate Limit, Zod Validation)
   → Route Handler
   → Service Layer
   → Database/External Services
   → Response
   ```

2. **AI Processing Flow**
   ```
   User Input
   → Zod Input Validation
   → Context Building
   → Prompt Generation
   → OpenAI Model Processing
   → Response Generation
   → Vector Storage
   → User Response
   ```

3. **Tool Execution Flow**
   ```
   Tool Request
   → Zod Tool Validation
   → Context Preparation
   → Tool Execution
   → Result Processing
   → Response Generation
   ```

## 🔒 Security Architecture

1. **Authentication**
   - JWT-based authentication
   - Token refresh mechanism
   - Session management

2. **Authorization**
   - Role-based access control
   - Resource-level permissions
   - API key management

3. **Data Protection**
   - Zod input validation
   - Output sanitization
   - Rate limiting
   - CORS protection

## 📊 Monitoring Architecture

1. **Error Tracking**
   - Sentry integration
   - Error categorization
   - Stack trace analysis

2. **Performance Monitoring**
   - Response time tracking
   - Resource usage monitoring
   - API call tracking

3. **AI Monitoring**
   - Langfuse integration
   - Prompt tracking
   - Response quality monitoring

## 🔄 State Management

1. **Application State**
   - In-memory caching
   - Session storage
   - Configuration management

2. **AI State**
   - Conversation context
   - Tool state
   - Vector store

3. **Database State**
   - Transaction management
   - Connection pooling
   - Migration state

## 🎯 Development Principles

1. **Code Organization**
   - Functional programming approach
   - Interface-first design
   - Descriptive naming conventions
   - Early error handling

2. **Type Safety**
   - TypeScript for all code
   - Zod for runtime validation
   - Interface definitions
   - Type inference

3. **Testing Strategy**
   - Unit tests
   - Integration tests
   - End-to-end tests
   - Test coverage requirements 