# AgentTom Setup Guide

## Quick Start

1. **Copy environment file**:
   ```bash
   cp .env-example .env
   ```

2. **Configure required variables** in `.env`:
   ```bash
   # REQUIRED - Get from OpenAI
   OPENAI_API_KEY=your-openai-api-key-here
   
   # REQUIRED - Set your app URL
   APP_URL=http://localhost:3000
   
   # REQUIRED - Generate a random API key
   API_KEY=your-secret-api-key-here
   ```

3. **Install dependencies**:
   ```bash
   bun install
   ```

4. **Set up database**:
   ```bash
   bun run generate
   bun run migrate
   bun run seed
   ```

5. **Start the application**:
   ```bash
   bun run dev
   ```

## Environment Variables

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI functionality | `sk-...` |
| `APP_URL` | Your application URL | `http://localhost:3000` |
| `API_KEY` | Secret key for API authentication | `your-secret-key` |

### Optional Services

The application will show you which services are configured when it starts. You can add these as needed:

- **Anthropic**: Alternative AI provider
- **Langfuse**: Observability and monitoring
- **Qdrant**: Vector database for semantic search
- **Algolia**: Search functionality
- **Google Services**: Calendar, Drive, etc.
- **Linear**: Project management
- **Spotify**: Music control
- **Resend**: Email sending
- **ElevenLabs**: Text-to-speech
- **Firecrawl**: Web scraping

## Service Setup Instructions

### OpenAI (Required)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

### Linear (Optional)
1. Go to [Linear Settings > API](https://linear.app/settings/api)
2. Create a personal API key
3. Add to `.env`: `LINEAR_API_KEY=lin_api_...`
4. Run the automatic setup script:
   ```bash
   bun run setup:linear
   ```
   This will automatically:
   - Fetch your teams and users
   - Recommend default team and assignee
   - Update your `.env` file with the required IDs

   **Manual Setup Alternative:**
   - Visit `/api/linear/setup` after starting the app
   - Or use individual endpoints:
     - `/api/linear/teams` - Get team IDs
     - `/api/linear/users` - Get user IDs

### Google Services (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth2 credentials
3. Enable required APIs (Calendar, Drive, etc.)
4. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Add credentials to `.env`

### Spotify (Optional)
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/spotify/callback`
4. Add credentials to `.env`

## Troubleshooting

### Database Issues
```bash
# Reset database
rm agi.db
bun run generate
bun run migrate
bun run seed
```

### Missing Environment Variables
The application will show you exactly which variables are missing when you start it.

### Port Already in Use
Change the `PORT` variable in your `.env` file:
```bash
PORT=3001
```

## Development

### Available Scripts
- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server
- `bun run generate` - Generate database migrations
- `bun run migrate` - Run database migrations
- `bun run seed` - Seed database with initial data

### API Endpoints
- Health check: `GET /health`
- AGI chat: `POST /api/agi/chat`
- User management: `/api/users/*`
- Tool management: `/api/tools/*`

### Authentication
Use the `API_KEY` from your `.env` file as a Bearer token:
```bash
curl -H "Authorization: Bearer your-api-key" http://localhost:3000/api/users
``` 