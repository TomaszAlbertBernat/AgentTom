# Getting Started

Quick setup guide to get AgentTom running locally.

## 📋 Requirements

- [Bun](https://bun.sh/) runtime (latest version)
- Node.js 20.x or later
- At least one AI provider API key

## 🚀 Quick Setup

### 1. Install
```bash
git clone [repository-url]
cd AgentTom
bun install
```

### 2. Environment Setup
```bash
cp .env-example .env
```

Edit `.env` with your configuration:

```bash
# Required - At least one AI provider
GOOGLE_API_KEY=your_google_ai_studio_key
# OR
OPENAI_API_KEY=sk-your_openai_key

# Required - Basic config
APP_URL=http://localhost:3000
PORT=3000
JWT_SECRET=your-random-secret-here
API_KEY=your-api-key-here
```

### 3. Database Setup
```bash
bun run generate  # Generate migrations
bun run migrate   # Create database
bun run seed      # Add sample data (optional)
```

### 4. Start Development Server
```bash
bun run dev
```

The server starts at `http://localhost:3000`.

**Test it works:**
```bash
curl http://localhost:3000/api/web/health
# Should return: {"status":"ok"}
```

## 🔑 API Keys Setup

### Google AI Studio (Recommended)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `.env`: `GOOGLE_API_KEY=AI...`

### OpenAI (Fallback)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

## 🛠️ Optional Services

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
LANGFUSE_API_KEY=your_langfuse_key
SENTRY_DSN=your_sentry_dsn

# Caching (optional)
REDIS_URL=redis://localhost:6379
```

## 🧪 Testing Your Setup

### 1. Check Health
```bash
curl http://localhost:3000/api/web/health/details
```

This shows which services are configured.

### 2. Create User Account
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

Save the returned JWT token.

### 3. Test Chat
```bash
curl -X POST http://localhost:3000/api/agi/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Get the conversation ID, then:

```bash
curl -X POST http://localhost:3000/api/agi/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello!","conversation_id":"CONVERSATION_ID"}'
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

### Development Mode
- API key checks disabled by default (`DISABLE_API_KEY=true`)
- CORS is permissive
- Use JWT tokens for authentication

### Production Mode
Set these for production:
```bash
NODE_ENV=production
DISABLE_API_KEY=false
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=strong-random-string
API_KEY=secure-api-key
```

## 🚨 Troubleshooting

### Common Issues

**Database issues:**
```bash
rm agi.db
bun run generate && bun run migrate
```

**Missing environment variables:**
Check the startup logs - they'll tell you what's missing.

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

**Important:** Make sure at least one AI provider (Google or OpenAI) is configured before expecting chat functionality to work.