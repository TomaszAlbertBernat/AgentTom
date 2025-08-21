# Tech Stack

Technologies and tools used in AgentTom.

## 🚀 Core Technologies

### Runtime & Language
- **Bun** - JavaScript runtime and package manager
- **TypeScript** - Primary language with strict type checking
- **Node.js 20+** - Runtime compatibility

### Web Framework
- **Hono** - Fast, lightweight web framework
- **Zod** - Schema validation for all inputs
- **@hono/zod-validator** - Request validation middleware

### Database
- **SQLite** - Lightweight database with file storage
- **Drizzle ORM** - Type-safe database operations
- **@libsql/client** - Database client for runtime

### Authentication & Security
- **JWT** - Token-based user authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin request handling
- **API keys** - Service-to-service authentication

## 🤖 AI & Machine Learning

### AI Providers
- **Google Gemini** - Primary AI provider via AI Studio
- **OpenAI** - Fallback provider for reliability
- **Vercel AI SDK** - Unified interface for both providers

### AI Features
- **Text generation** - Chat and content creation
- **Embeddings** - Vector search and similarity
- **Multimodal** - Image analysis and processing
- **Streaming** - Real-time response delivery

### Observability
- **Langfuse** - AI conversation tracking and analytics
- **Token counting** - Usage monitoring and cost tracking

## 🛠️ External Integrations

### Required Services
- **Google AI Studio** - Primary LLM access
- **OpenAI** - Fallback LLM access

### Optional Services
- **Linear** - Project management integration
- **Spotify** - Music control and playback
- **Google Maps** - Location and mapping services
- **Resend** - Email delivery service
- **ElevenLabs** - Text-to-speech conversion
- **Firecrawl** - Web scraping and content extraction

### Data & Search
- **Qdrant** - Vector database for embeddings
- **Algolia** - Text search capabilities
- **Redis** - Caching and rate limiting (optional)

## 🧪 Development & Testing

### Testing Framework
- **Bun test** - Built-in test runner
- **Unit tests** - Component and service testing
- **Integration tests** - API endpoint testing

### Code Quality
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **TypeScript compiler** - Type checking
- **Spell checking** - Documentation validation

### Development Tools
- **Hot reload** - Development server with auto-restart
- **Migrations** - Database schema management
- **Seeding** - Test data generation

## 📁 File Storage & Processing

### Storage
- **Local filesystem** - File storage with configurable path
- **MIME validation** - File type checking and security

### Processing
- **HTML parsing** - Web content extraction
- **Markdown** - Document processing
- **Audio processing** - ffmpeg for audio handling

## 🌐 Deployment & Infrastructure

### Server
- **Hono server** - Production HTTP server
- **Environment config** - .env file configuration
- **Health checks** - System status monitoring

### Monitoring
- **Structured logging** - JSON/text log formats
- **Error tracking** - Sentry integration ready
- **Performance metrics** - Response time tracking

### Security
- **Input validation** - All requests validated with Zod
- **Rate limiting** - Redis-backed request limiting
- **CORS configuration** - Origin and header control
- **File upload limits** - Size and type restrictions

## 📊 APIs & Standards

### API Design
- **REST** - Standard HTTP methods and status codes
- **OpenAPI** - Automatic API documentation
- **Swagger UI** - Interactive API explorer

### Data Formats
- **JSON** - Primary data exchange format
- **Multipart** - File upload handling
- **Server-Sent Events** - Real-time streaming

## 🔧 Configuration

### Environment Variables
- **Zod validation** - Runtime environment checking
- **Default values** - Sensible development defaults
- **Feature flags** - Optional service toggles

### Service Discovery
- **Health endpoints** - Service status checking
- **Automatic detection** - Available services reporting

## 📦 Dependencies

### Core Dependencies
```json
{
  "hono": "HTTP framework",
  "drizzle-orm": "Database ORM",
  "zod": "Schema validation", 
  "ai": "AI SDK",
  "@ai-sdk/google": "Google AI provider",
  "@ai-sdk/openai": "OpenAI provider"
}
```

### Optional Dependencies
```json
{
  "ioredis": "Redis client (rate limiting)",
  "langfuse": "AI observability",
  "@sentry/node": "Error tracking"
}
```

## 🚀 Deployment Options

### Development
- **Bun dev** - Development server with hot reload
- **SQLite file** - Local database storage
- **Local storage** - File system storage

### Production
- **Bun start** - Production server
- **Docker** - Containerized deployment option
- **Environment variables** - Configuration management
- **Reverse proxy** - Nginx/Apache integration

## 📈 Scalability

### Performance
- **Async/await** - Non-blocking operations
- **Connection pooling** - Database optimization
- **Caching** - Redis for frequently accessed data

### Architecture
- **Modular services** - Independent components
- **Plugin system** - Extensible tool architecture
- **Configuration-driven** - Feature toggles and settings

---

**Note:** This stack prioritizes simplicity, type safety, and developer experience while providing production-ready features and extensibility.