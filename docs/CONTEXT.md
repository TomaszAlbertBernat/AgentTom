# AgentTom Development Context

Essential context and navigation guide for AI agents working on the AgentTom project.

## 🎯 Project Overview

AgentTom is a TypeScript-based personal AI assistant backend that combines conversational AI with extensive tool integrations. It uses Google Gemini (primary) and OpenAI (fallback) for AI capabilities, with a modular architecture built on Hono, Drizzle ORM, and SQLite.

## 🧭 Quick Navigation

### 🚀 Starting Development
If you're new to the project:
1. **[Getting Started](GETTING_STARTED.md)** - Setup, API keys, database initialization
2. **[Architecture](ARCHITECTURE.md)** - System design and component organization  
3. **[Development Guidelines](DEVELOPMENT.md)** - Code standards, patterns, workflow
4. **[Tech Stack](TECH_STACK.md)** - Technologies, dependencies, deployment options

### 📋 Current Work
Active development priorities:
- **[Project Backlog](../backlog/BACKLOG.md)** - Current tasks and priorities (P0 urgent, P1 next)
- **[Backlog Guide](../backlog/README.md)** - Task management methodology

## 🎯 Development Context by Task Type

### 🔧 Adding New Features

**Core System Extensions:**
- **Architecture Overview**: [ARCHITECTURE.md](ARCHITECTURE.md) - Extension points and patterns
- **Code Standards**: [DEVELOPMENT.md](DEVELOPMENT.md) - Naming, error handling, TypeScript requirements
- **API Design**: [API.md](API.md) - REST endpoint patterns and response formats

**Adding New Tools/Integrations:**
- **Tool Architecture**: [TOOLS.md](TOOLS.md) - Plugin system, configuration patterns
- **Tool Schemas**: `src/config/tool-schemas.ts` - Parameter validation patterns
- **Tool Registration**: `src/config/tools.config.ts` - Service registration

**Database Changes:**
- **Schema Location**: `src/schema/` - Drizzle ORM models
- **Migration Process**: [DEVELOPMENT.md](DEVELOPMENT.md#database-changes) - Generate and apply migrations

### 🤖 AI Integration Work

**LLM Configuration:**
- **AI Integration Guide**: [AI_INTEGRATION.md](AI_INTEGRATION.md) - Provider setup, model selection
- **⚠️ Critical**: Always use `gemini-2.5-flash`, never `gemini-2.0-flash`
- **LLM Config**: `src/config/llm.config.ts` - Model settings and fallback logic

**Conversation Management:**
- **Message Flow**: [AI_INTEGRATION.md](AI_INTEGRATION.md#conversation-flow) - Processing pipeline
- **Context Building**: `src/services/agent/conversation.service.ts` - History management
- **Tool Integration**: `src/services/agent/tool.service.ts` - AI tool execution

### 🔐 Authentication & Security

**Current Authentication Status:**
- **⚠️ P0 Priority**: `/api/login` endpoint needs implementation (see [BACKLOG.md](../backlog/BACKLOG.md))
- **Auth Patterns**: [API.md](API.md#authentication) - JWT + API key patterns
- **Middleware**: `src/middleware/auth.ts` - Authentication logic

**Planned Authentication Changes:**
- **Local-First Architecture**: [BACKLOG.md](../backlog/BACKLOG.md) Epic - Authentication-optional mode
- **API Key Management**: User-provided keys for services

### 🧪 Testing & Quality

**Testing Strategy:**
- **Test Plan**: [TESTPLAN.md](TESTPLAN.md) - Comprehensive testing procedures
- **Unit Tests**: `tests/unit/` - Service and component tests
- **Smoke Tests**: [TESTPLAN.md](TESTPLAN.md#quick-smoke-test) - Basic functionality verification

**Quality Assurance:**
- **Code Standards**: [DEVELOPMENT.md](DEVELOPMENT.md#code-standards) - TypeScript patterns
- **Error Handling**: [DEVELOPMENT.md](DEVELOPMENT.md#error-handling-pattern) - Consistent error patterns

### 📊 Monitoring & Debugging

**Observability:**
- **Monitoring Setup**: [MONITORING.md](MONITORING.md) - Health checks, logging, external tools
- **Debug Procedures**: [MONITORING.md](MONITORING.md#debugging-tools) - Log analysis, health endpoints
- **AI Observability**: Langfuse integration for conversation tracking

## 🔑 Critical Configuration Rules

### AI Provider Rules
- ✅ **Use**: `gemini-2.5-flash` (primary), `gpt-4o-mini` (fallback)
- ❌ **Never use**: `gemini-2.0-flash` (forbidden by user preference)
- **Config Location**: `src/config/llm.config.ts`

### Development Preferences
- ✅ **Use**: JavaScript/TypeScript for all scripting in Node projects
- ❌ **Avoid**: Python scripting in this project
- **Script Location**: `scripts/` directory

### Documentation Structure
- **Main README**: Single project overview
- **Detailed Docs**: `docs/` folder for comprehensive guides
- **Task Management**: `backlog/` folder for priorities and planning

## 🏗️ Project Structure Reference

```
AgentTom/
├── src/                    # Main application code
│   ├── config/            # Configuration and schemas
│   ├── services/          # Business logic (agent/, common/, tools/)
│   ├── routes/            # API endpoints
│   ├── middleware/        # Request processing
│   ├── schema/            # Database models
│   └── types/             # TypeScript definitions
├── docs/                  # Comprehensive documentation
├── backlog/               # Task management and priorities
├── frontend/              # Next.js frontend application
├── tests/                 # Test suites
└── scripts/               # Development and maintenance scripts
```

This CONTEXT.md file provides:

1. **Quick Navigation** - Immediate direction based on what the AI agent needs to do
2. **Task-Specific Guidance** - Different paths for different types of work
3. **Critical Rules** - Key constraints and preferences (like never using gemini-2.0-flash)
4. **Current Priorities** - Links to the active backlog and urgent tasks
5. **Essential File References** - The most important files organized by purpose
6. **Development Tips** - Practical advice for getting oriented and making changes

The file follows the project's documentation guidelines with clear structure, emojis for visual organization, and actionable information that helps AI agents quickly understand what they need to know and where to find it.

## 🚨 Current Priority Areas

Based on [BACKLOG.md](../backlog/BACKLOG.md):

### P0 (Urgent)
- **Authentication**: Implement `/api/login` endpoint with JWT tokens
- **Documentation**: Finalize `GETTING_STARTED.md` with current environment setup

### P1 (Next)
- **Frontend**: React Query integration, error handling, Playwright testing
- **Tools**: Schema-driven form generation, streaming chat endpoints

### Major Epics
- **Local Music Player**: Replace Spotify with local PC music player integration
- **Local-First Auth**: Make authentication optional for single-user setups

## 📚 Essential Files by Category

### 📖 Documentation (Must Read)
- `docs/ARCHITECTURE.md` - System design and patterns
- `docs/DEVELOPMENT.md` - Code standards and workflow
- `docs/AI_INTEGRATION.md` - LLM provider configuration
- `backlog/BACKLOG.md` - Current priorities and tasks

### 🔧 Configuration Files
- `src/config/llm.config.ts` - AI model settings
- `src/config/tools.config.ts` - Tool registration
- `src/config/env.config.ts` - Environment validation
- `.env` - Runtime configuration

### 🛠️ Key Service Files
- `src/services/agent/ai.service.ts` - AI provider integration
- `src/services/agent/tool.service.ts` - Tool execution
- `src/middleware/auth.ts` - Authentication logic
- `src/app.ts` - Application setup and routing

## 💡 Development Tips

### Getting Oriented
1. Start with [ARCHITECTURE.md](ARCHITECTURE.md) for system understanding
2. Review [BACKLOG.md](../backlog/BACKLOG.md) for current priorities  
3. Check [DEVELOPMENT.md](DEVELOPMENT.md) for coding patterns
4. Use [TESTPLAN.md](TESTPLAN.md) for verification

### Making Changes
1. Follow TypeScript strict mode requirements
2. Use Zod schemas for input validation
3. Implement early return error patterns
4. Add tests for new functionality
5. Update relevant documentation

### Testing Changes
1. Run `bun test` for unit tests
2. Use `curl http://localhost:3000/api/web/health` for basic health check
3. Follow [TESTPLAN.md](TESTPLAN.md) procedures for comprehensive testing

---

**Quick Start**: New to the project? Read [GETTING_STARTED.md](GETTING_STARTED.md), then [ARCHITECTURE.md](ARCHITECTURE.md), then check [BACKLOG.md](../backlog/BACKLOG.md) for what to work on.
