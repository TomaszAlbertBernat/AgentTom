# Getting Started with AgentTom

This guide will help you set up and run AliceAGI on your local machine.

## 📋 Prerequisites

- Bun runtime (latest version)
- Node.js 20.x
- SQLite database
- Various API keys (see Environment Variables section)

## 🔧 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd AgentTom
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env-example .env
```
Edit the `.env` file with your configuration. Make sure to set up all required API keys.

4. Initialize the database:
```bash
bun run generate  # Generate database migrations
bun run migrate   # Apply migrations
bun run seed      # Seed initial data (if needed)
```

## 🚀 Running the Application

Development mode:
```bash
bun run dev
```

The server will start on `http://localhost:3000` by default (configurable via `PORT` or `APP_URL`).

## 🔐 Environment Variables

Required environment variables (see `.env-example` for full list):
- At least one LLM provider key (Gemini is default):
  - `GOOGLE_API_KEY` — default provider
  - `OPENAI_API_KEY` — optional fallback
- `JWT_SECRET` - Secret for JWT token generation (defaults to a dev value if not set)
- `APP_URL` - Base URL for the app (default: `http://localhost:3000`)
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed CORS origins

Service API Keys:
- `ELEVENLABS_API_KEY` - For text-to-speech
- `GOOGLE_MAPS_API_KEY` - For location services
- `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET` - For music integration
- `LINEAR_API_KEY` - For project management
- `ALGOLIA_APP_ID` & `ALGOLIA_API_KEY` - For search functionality
- `SENTRY_DSN` - For error tracking
- `LANGFUSE_API_KEY` - For AI monitoring

LLM configuration (optional overrides):
- `DEFAULT_LLM_PROVIDER=google`
- `DEFAULT_TEXT_MODEL=gemini-2.5-flash` (do not use `gemini-2.0-flash`)
- `FALLBACK_TEXT_MODEL=gpt-4o-mini`

## 🛡️ Security & Auth

- Rate limiting (configurable; disabled automatically if `REDIS_URL` is not set)
- CORS protection with configurable origins
- File size limits (50MB max)
- Authentication middleware with JWT. In development, API-key checks are disabled by default (`DISABLE_API_KEY=true`) so you can authenticate with just a JWT. In production, provide an API key.
- Error handling middleware with Sentry integration
- Input validation using Zod
- Secure password hashing
- API key rotation support

## 🔄 Development Workflow

1. **Local Development**
   - Use `bun run dev` for development with hot reload
   - Monitor logs in real-time
   - Use `.env.local` for local overrides

2. **Database Management**
   - Use `bun run generate` to create new migrations
   - Use `bun run migrate` to apply migrations
   - Use `bun run seed` to populate test data

3. **Testing**
   - Run tests with `bun test`
   - Check coverage with `bun test --coverage`

4. **Deployment**
   - Build with `bun run build`
   - Start production with `bun start`
   - Monitor with Sentry and Langfuse

## 📝 Code Style Guidelines

- Use TypeScript for all code
- Follow functional programming principles
- Prefer interfaces over types
- Use descriptive variable names (e.g., `user_name` instead of `name`)
- Use descriptive function names (e.g., `setInteractionState` instead of `updateInteraction`)
- Implement early returns for error handling
- Use `uuidv4` for generating UUIDs
- Validate all inputs with Zod schemas 