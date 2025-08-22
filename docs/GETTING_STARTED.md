# Getting Started

Quick setup guide to get AgentTom running locally.

## 📋 Requirements

- [Bun](https://bun.sh/) runtime (latest version)
- Node.js 20.x or later
- At least one AI provider API key

## 🏠 Local-First Mode (Recommended)

AgentTom runs in **local mode** by default - no authentication required! Just provide your own API keys and start using it immediately.

## 🚀 Quick Setup

### 1. Install
```bash
git clone [repository-url]
cd AgentTom
bun install
```

### 2. Environment Setup (Required)

AgentTom requires a `.env` file with your API keys for local mode. No web-based configuration is supported.

#### Setup .env file
```bash
cp .env-example .env
```

Edit `.env` with your configuration:

```bash
# Required - At least one AI provider API key
GOOGLE_API_KEY=your_google_ai_studio_key
# OR
OPENAI_API_KEY=sk-your_openai_key

# Optional - Basic configuration
APP_URL=http://localhost:3000
PORT=3000
LOG_LEVEL=INFO

# Optional - Additional services (only load when keys are provided)
ELEVENLABS_API_KEY=your_elevenlabs_key
RESEND_API_KEY=your_resend_key
FIRECRAWL_API_KEY=your_firecrawl_key
LINEAR_API_KEY=your_linear_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Multi-user mode (disabled by default)
# AUTH_MODE=multiuser  # Uncomment to enable multi-user authentication
# JWT_SECRET=your-random-secret-here
# API_KEY=your-api-key-here
```

**Important:** Only set environment variables that you actually need. AgentTom automatically detects and uses only the services with configured API keys.

### 3. Start the Server
```bash
bun run dev
```

The server starts at `http://localhost:3000` in **local mode** by default.

**Test it works:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

## 🔑 API Keys Setup

### Local Mode Configuration

AgentTom reads API keys directly from your `.env` file. No web interface is available for configuration.

### Getting API Keys

#### Google AI Studio (Recommended)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to your `.env` file: `GOOGLE_API_KEY=your_key_here`

#### OpenAI (Fallback)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create API key
3. Add to your `.env` file: `OPENAI_API_KEY=sk-your_key_here`

### Testing API Keys

After configuring your API keys in the `.env` file, test them:
```bash
# Test Google API key
curl "http://localhost:3000/api/local-user/api-keys/google/test"

# Test OpenAI API key
curl "http://localhost:3000/api/local-user/api-keys/openai/test"
```

## 🛠️ Optional Services

**All external services are strictly optional** - AgentTom works perfectly without any of them! These services only add extra functionality when their specific API keys are provided:

- **Project Management**: Linear integration for task management
- **Music Control**: Spotify integration for music playback
- **Web Scraping**: Firecrawl for enhanced web content extraction
- **Location Services**: Google Maps for location-based features
- **Email**: Resend for email notifications
- **Text-to-Speech**: ElevenLabs for voice generation
- **Monitoring**: Sentry for error tracking

Add these environment variables to enable additional features:

```bash
# Project Management
LINEAR_API_KEY=lin_api_...

# Music Control
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Web Scraping
FIRECRAWL_API_KEY=your_firecrawl_key

# Location Services
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Email
RESEND_API_KEY=your_resend_key

# Text-to-Speech
ELEVENLABS_API_KEY=your_elevenlabs_key

# Monitoring
SENTRY_DSN=your_sentry_dsn

# Caching (optional)
REDIS_URL=redis://localhost:6379
```

## 🧪 Testing Your Setup

### Happy Path Checklist

Use this checklist to verify AgentTom "just works" in local mode:

- [ ] **Environment**: `.env` file exists with API keys (`GOOGLE_API_KEY` or `OPENAI_API_KEY`)
- [ ] **Server starts**: `bun run dev` runs without errors
- [ ] **Health check**: `curl http://localhost:3000/api/health` returns `{"status":"ok"}`
- [ ] **Local mode**: `curl http://localhost:3000/api/local-user/me` shows `isLocal: true`
- [ ] **Auto-detection**: API keys are automatically detected from `.env` file on startup
- [ ] **Chat works**: Frontend loads at `http://localhost:3000` and chat functionality works
- [ ] **Tools accessible**: `/tools` page shows available tools without auth prompts

### Automated Validation Script

Run the validation script to check all components:

```bash
bun run scripts/validate-happy-path.ts
```

### Manual Testing Steps

#### 1. Check Service Status
```bash
curl http://localhost:3000/api/web/health/details
```

This shows which services are configured and your auth mode.

#### 2. Test Local User
```bash
# Check your local user info
curl http://localhost:3000/api/local-user/me

# Check your configuration
curl http://localhost:3000/api/local-user/me
```

#### 3. Test API Access (No Authentication Required!)
```bash
# Test web scraping
curl -X POST http://localhost:3000/api/web/get-contents \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Test tools list
curl http://localhost:3000/api/tools/list
```

#### 4. Test Chat (Once API Keys Are Configured)
```bash
# Create a conversation
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{}'

# Send a message (replace CONVERSATION_ID)
curl -X POST http://localhost:3000/api/agi/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello! How are you?","conversation_id":"CONVERSATION_ID"}'
```

## 🔧 Development Commands

```bash
bun run dev         # Start dev server with hot reload
bun run start       # Start production server
bun run migrate     # Apply database migrations
bun run seed        # Add sample data
bun test            # Run test suite
bun test --watch    # Run tests in watch mode
bun run build       # TypeScript type checking
```

## 🌐 Frontend (Optional)

The frontend is in the `/frontend` directory:

```bash
cd frontend
bun install
bun run dev  # Starts at http://localhost:3001
```

Add to `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
BACKEND_API_KEY=your-api-key-from-backend-env
```

## 🔒 Security Notes

### Local Mode (Default)
- No authentication required
- Configure API keys via local config file (`.agenttom/local-user.json`)
- Single user experience
- CORS is permissive for local development

### Multi-User Mode
Set `AUTH_MODE=multiuser` to enable authentication:
```bash
AUTH_MODE=multiuser
NODE_ENV=production
JWT_SECRET=strong-random-string
API_KEY=secure-api-key
CORS_ORIGIN=https://yourdomain.com
```

### Database Setup (Only for Multi-User Mode)
```bash
bun run generate  # Generate migrations
bun run migrate   # Create database
bun run seed      # Add sample data (optional)
```

## 🚨 Troubleshooting

### Common Issues

**Local config issues:**
```bash
# Reset local configuration
rm -rf .agenttom/
# Restart the server to recreate defaults
```

**Database issues (multi-user mode only):**
```bash
rm agi.db
bun run generate && bun run migrate
```

**Missing API keys:**
Check the startup logs to see your configuration. API keys are read from your `.env` file.

**Port already in use:**
```bash
echo "PORT=3001" >> .env
```

**Permission errors (Linux/Mac):**
```bash
chmod +x node_modules/.bin/*
```

### Debug Mode
```bash
LOG_LEVEL=DEBUG bun run dev
```

### Service Status
Visit `http://localhost:3000/api/web/health/details` to see configured services.

## 📝 Next Steps

1. **Explore the API** - Check [API Reference](API.md)
2. **Add tools** - See [Tools Documentation](TOOLS.md)  
3. **Development** - Read [Development Guide](DEVELOPMENT.md)
4. **Architecture** - Understand the [Architecture](ARCHITECTURE.md)

## 🤝 Need Help?

1. Check this guide first
2. Review error messages in the terminal
3. Visit the health endpoint for service status
4. Check other documentation in the `docs/` folder

---

## 🎯 Key Features of Local Mode

- **No signup required** - Start using immediately
- **Your API keys, your data** - All configuration stored locally
- **Simple setup** - Just run `bun run dev` and start configuring
- **Privacy-focused** - No external authentication or user tracking
- **Full feature access** - All tools and capabilities available

**Important:** Configure at least one AI provider (Google or OpenAI) API key for chat functionality to work.