# Architecture

How AgentTom is built and organized.

## 🏗️ System Overview

AgentTom is a TypeScript/Bun application that provides AI conversation capabilities with tool integrations. It follows a layered architecture with clear separation of concerns.

## 📁 Project Structure

```
src/
├── config/         # Environment and feature configuration
├── database/       # SQLite database and migrations
├── middleware/     # Request processing (auth, validation, etc.)
├── routes/         # API endpoints 
├── services/       # Business logic and integrations
├── schema/         # Database models and validation
├── types/          # TypeScript definitions
├── utils/          # Helper functions
├── app.ts          # Application setup
└── index.ts        # Server entry point
```

## 🔄 Request Flow

1. **HTTP Request** → Middleware chain
2. **Middleware** → Authentication, validation, rate limiting
3. **Route Handler** → Endpoint-specific logic
4. **Service Layer** → Business logic and external calls
5. **Database/AI** → Data storage and AI processing
6. **HTTP Response** → JSON response to client

## 🔧 Core Components

### Database Layer
- **SQLite** with Drizzle ORM
- **Migrations** in `src/database/migrations/`
- **Schemas** in `src/schema/`
- **Auto-migration** on server start

### Authentication
- **JWT tokens** for user sessions
- **API keys** for service access
- **Middleware** validates all protected routes

### AI Integration
- **Google Gemini** as primary provider
- **OpenAI** as fallback
- **Vercel AI SDK** for consistent interface
- **Automatic failover** on rate limits

### Tool System
- **Plugin architecture** for external services
- **Schema validation** for tool parameters
- **Execution tracking** and error handling
- **Available tools**: Weather, Calendar, File operations, Web search

## 📊 Data Flow

### Chat Messages
```
User Input → Validation → AI Service → Response → Database → User
```

### Tool Execution
```
Tool Request → Parameter Validation → Tool Service → External API → Result Storage
```

### File Upload
```
File Upload → MIME Validation → Storage → Database Record → File URL
```

## 🔒 Security

### Input Validation
- **Zod schemas** for all API inputs
- **MIME type checking** for file uploads
- **SQL injection protection** via ORM
- **XSS prevention** through sanitization

### Authentication Flow
- **Registration** → Password hash → JWT token
- **Login** → Credential check → JWT token
- **API access** → API key validation
- **Protected routes** → JWT + optional API key

### Rate Limiting
- **Redis-backed** counters (optional)
- **Per-endpoint** limits
- **Graceful degradation** without Redis

## 🌐 External Integrations

### Required Services
- **Google AI Studio** - Primary LLM provider
- **OpenAI** - Fallback LLM provider

### Optional Services
- **Linear** - Project management
- **Spotify** - Music control
- **Google Maps** - Location services
- **Resend** - Email notifications
- **ElevenLabs** - Text-to-speech
- **Firecrawl** - Web scraping

## 📈 Monitoring

### Health Checks
- `/api/web/health` - Basic status
- `/api/web/health/details` - Service availability

### Logging
- **Structured logging** with levels (ERROR → TRACE)
- **Service-specific** loggers
- **Performance tracking** for AI calls

### Error Tracking
- **Langfuse** for AI observability
- **Sentry** integration ready
- **Centralized error handling**

## 🚀 Deployment Architecture

### Development
- **Bun dev server** with hot reload
- **SQLite file** database
- **Local file storage**
- **Permissive CORS**

### Production
- **Bun runtime** or Docker
- **Environment variables** for secrets
- **File storage** (local or cloud)
- **Reverse proxy** recommended

## 🔄 State Management

### Application State
- **In-memory** configuration
- **Database** for persistent data
- **Redis** for caching (optional)

### Conversation State
- **Database storage** for message history
- **Context building** for AI calls
- **Memory management** for long conversations

### Tool State
- **Execution tracking** in database
- **Error logging** for debugging
- **Performance metrics** collection

## 🎯 Design Principles

1. **Simplicity** - Clear, readable code
2. **Type Safety** - TypeScript throughout
3. **Error Handling** - Fail fast with good messages
4. **Modularity** - Independent services
5. **Configuration** - Environment-driven setup

## 🔌 Extension Points

### Adding New Tools
1. Create service in `src/services/tools/`
2. Add schema to `src/config/tool-schemas.ts`
3. Register in `src/config/tools.config.ts`
4. Update API documentation

### Adding New Routes
1. Create route file in `src/routes/`
2. Add middleware as needed
3. Register in `src/app.ts`
4. Add tests and documentation

### Adding New Services
1. Create service in appropriate `src/services/` subfolder
2. Define interface and implementation
3. Add configuration and environment variables
4. Write unit tests

---

**Need more details?** Check [Development Guidelines](DEVELOPMENT.md) for coding standards and [Getting Started](GETTING_STARTED.md) for setup instructions.