# AliceAGI Documentation

Welcome to the AliceAGI documentation. This documentation provides comprehensive information about the project's setup, architecture, and usage.

## 📚 Table of Contents

1. [Getting Started](./GETTING_STARTED.md)
   - Installation
   - Configuration
   - Running the Application

2. [Architecture](./ARCHITECTURE.md)
   - Project Structure
   - Core Components
   - Data Flow

3. [API Reference](./API.md)
   - Authentication
   - AGI Endpoints
   - File Management
   - Tools
   - Conversation

4. [AI Integration](./AI_INTEGRATION.md)
   - Google Gemini (default) and OpenAI fallback
   - Prompt Management
   - Vector Search

5. [Tools](./TOOLS.md)
   - Available Tools
   - Tool Configuration
   - Custom Tools

6. [Monitoring](./MONITORING.md)
   - Sentry Integration
   - Langfuse Integration
   - Logging

7. [Troubleshooting](./TROUBLESHOOTING.md)
   - Common Issues
   - Debug Mode
   - Health Checks

## 🔧 Quick Start

1. Clone the repository
2. Install dependencies: `bun install`
3. Copy `.env-example` to `.env` and configure
4. Run database migrations: `bun run migrate`
5. Start the application: `bun run dev`

For detailed instructions, see [Getting Started](./GETTING_STARTED.md).

## 🛠️ Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: SQLite with Drizzle ORM
- **AI**: OpenAI (Vercel AI SDK)
- **Validation**: Zod
- **Monitoring**: Sentry, Langfuse
- **Authentication**: JWT
- **Vector Search**: Custom implementation

## 📝 Development Guidelines

- TypeScript for all code
- Functional programming approach
- Interface-first design
- Descriptive naming conventions
- Early error handling
- UUID for unique identifiers
- Runtime validation with Zod 