# AgentTom - Personal AI Assistant

A sophisticated personal AI agent backend that serves as an intelligent assistant with extensive tool integrations and conversational capabilities.

## 🎯 Overview

AgentTom is a TypeScript-based AI assistant that combines:
- **Conversational AI** with Google Gemini (default) and OpenAI fallback
- **Rich Tool Ecosystem** - Spotify, Linear, Maps, Calendar, Email, TTS, and more
- **Modern Architecture** - Hono framework, Drizzle ORM, Zod validation
- **Comprehensive Monitoring** - Langfuse observability, Sentry error tracking

## 🚀 Quick Start

1. **Clone and install**:
   ```bash
   git clone [repository-url]
   cd AgentTom
   bun install
   ```

2. **Configure environment**:
   ```bash
   cp .env-example .env
   # Edit .env with your API keys (see docs/GETTING_STARTED.md)
   ```

3. **Setup database**:
   ```bash
   bun run generate
   bun run migrate  
   bun run seed
   ```

4. **Start development**:
   ```bash
   bun run dev
   # Server starts at http://localhost:3000
   ```

## 🏗️ Architecture

- **Backend**: Hono + TypeScript + Bun runtime
- **Database**: SQLite with Drizzle ORM  
- **AI**: Vercel AI SDK with Google Gemini + OpenAI fallback
- **Auth**: JWT-based authentication with API key support
- **Tools**: Modular service architecture with Zod schemas

For detailed architecture information, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🛠️ Available Tools

- **🎵 Spotify** - Music control and playlist management
- **📋 Linear** - Project management and issue tracking  
- **🗺️ Maps** - Location services and directions
- **📧 Resend** - Email sending capabilities
- **🗣️ ElevenLabs** - Text-to-speech generation
- **🔍 Web** - Content scraping and search
- **📁 Files** - File management and processing
- **🧠 Memory** - Persistent conversation memory

Full tool documentation: [docs/TOOLS.md](docs/TOOLS.md)

## 📖 Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** - Complete setup and installation guide
- **[API Reference](docs/API.md)** - REST API endpoints and usage
- **[Tools Documentation](docs/TOOLS.md)** - Available tools and configurations  
- **[AI Integration](docs/AI_INTEGRATION.md)** - LLM providers and capabilities
- **[Architecture](docs/ARCHITECTURE.md)** - System design and components
- **[Tech Stack](docs/TECH_STACK.md)** - Technologies and dependencies
- **[Development](docs/DEVELOPMENT.md)** - Developer guidelines and workflow
- **[Testing](docs/TESTING.md)** - Testing strategy and coverage
- **[Monitoring](docs/MONITORING.md)** - Observability and error tracking
- **[Documentation Guidelines](docs/guidelines_docs.md)** - How to write and maintain documentation

## 🔧 Development

### Frontend (Next.js)
The frontend application is located in the `/frontend` directory:

```bash
cd frontend
bun install
bun run dev
# Frontend starts at http://localhost:3001
```

### Available Scripts
- `bun run dev` - Start development server with hot reload
- `bun run test` - Run test suite  
- `bun run build` - Build for production
- `bun run generate` - Generate database migrations
- `bun run migrate` - Apply database migrations

### Environment Requirements
- **Node.js** 20.x or later
- **Bun** runtime (latest version)
- **API Keys** - At minimum Google AI Studio or OpenAI

## 🛡️ Security Features

- JWT-based authentication with refresh tokens
- API key rotation support  
- Rate limiting with Redis backend
- Input validation with Zod schemas
- CORS protection with configurable origins
- File upload size limits (50MB max)

## 📊 Monitoring & Observability

- **Langfuse** - AI interaction tracking and prompt monitoring
- **Sentry** - Error tracking and performance monitoring  
- **Structured Logging** - JSON formatted logs with levels
- **Health Endpoints** - Service status and dependency checks

## 🚀 Deployment

For production deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 📋 Project Management

Task management and project backlog are maintained in the `/backlog` directory using a structured TODO system. See [backlog/README.md](backlog/README.md) for details.

## 🤝 Contributing

1. Review [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for guidelines
2. Check [backlog/MASTER_TODO.md](backlog/MASTER_TODO.md) for available tasks  
3. Follow the branching strategy: `task/<TASKID>-short-description`
4. Ensure tests pass: `bun test`
5. Submit PR with clear description

## 📝 License

This project is for personal use and development.

---

**Need help?** Check [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) for detailed setup instructions.
