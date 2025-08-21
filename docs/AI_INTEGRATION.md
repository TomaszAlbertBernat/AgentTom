# AI Integration

How AgentTom connects to AI providers and processes conversations.

## 🤖 AI Providers

### Primary: Google Gemini
AgentTom uses Google Gemini as the default AI provider:

  ```bash
# Required in .env
GOOGLE_API_KEY=your_google_ai_studio_key
DEFAULT_TEXT_MODEL=gemini-2.5-flash
```

**Note:** Never use `gemini-2.0-flash` - always use `gemini-2.5-flash` instead.

### Fallback: OpenAI
Automatic fallback when Google hits rate limits:

```bash
# Required in .env
OPENAI_API_KEY=sk-your_openai_key
FALLBACK_TEXT_MODEL=gpt-4o-mini
```

### How Failover Works
1. Try Google Gemini first
2. On HTTP 429 (rate limit), automatically switch to OpenAI
3. Continue conversation seamlessly
4. Retry Google after cooldown period

## 🚀 Quick Setup

### 1. Get API Keys

**Google AI Studio:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Add to `.env`: `GOOGLE_API_KEY=AI...`

**OpenAI:**
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

### 2. Basic Configuration
```bash
# .env file
GOOGLE_API_KEY=your_google_key
OPENAI_API_KEY=your_openai_key
DEFAULT_LLM_PROVIDER=google
DEFAULT_TEXT_MODEL=gemini-2.5-flash
FALLBACK_TEXT_MODEL=gpt-4o-mini
```

### 3. Test Setup
```bash
# Start server
bun run dev

# Test chat endpoint
curl -X POST http://localhost:3000/api/agi/messages \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, world!", "conversation_id": "uuid"}'
```

## 💬 Conversation Flow

### 1. Message Processing
```
User Input → Validation → Context Building → AI Request → Response → Storage
```

### 2. Context Management
- Previous messages included for context
- System prompts for behavior guidance
- Tool descriptions for capability awareness
- User preferences and history

### 3. Response Generation
- Structured prompts sent to AI
- Tool calls extracted and executed
- Final response assembled and returned
- Conversation history updated

## 🔧 Advanced Features

### Streaming Responses
Real-time message streaming:
```bash
curl -X POST http://localhost:3000/api/agi/chat/stream \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me a story", "stream": true}'
```

### Multimodal Support
Handle images and files:
- Gemini supports image analysis
- File upload integration
- Document processing capabilities

### Embeddings and Search
Vector storage for conversation memory:
- Automatic embedding generation
- Semantic search in conversation history
- Context retrieval for relevant responses

## 📊 Monitoring AI Performance

### Built-in Metrics
AgentTom tracks:
- Response times per model
- Token usage and costs
- Error rates and fallback usage
- Conversation completion rates

### Langfuse Integration
Optional AI observability:
```bash
# Add to .env
LANGFUSE_API_KEY=your_langfuse_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

Features:
- Trace conversation flows
- Monitor model performance
- Track costs and usage
- Debug conversation issues

## 🔄 Error Handling

### Common Issues and Solutions

**Rate Limit Errors (429)**
- Automatic fallback to OpenAI
- Retry logic with backoff
- User sees seamless experience

**API Key Issues**
- Check key validity in provider dashboards
- Verify environment variables are set
- Test with simple API calls

**Model Availability**
- Configure multiple fallback models
- Monitor provider status pages
- Graceful degradation when needed

**Token Limits**
- Automatic context trimming
- Conversation summarization
- Smart context management

## 🎯 Best Practices

### Model Selection
- Use `gemini-2.5-flash` for fast responses
- Use `gpt-4o-mini` for reliable fallback
- Avoid deprecated models

### Cost Management
- Monitor token usage regularly
- Set up usage alerts
- Optimize prompt length

### Performance Optimization
- Use streaming for long responses
- Implement response caching
- Minimize context window size

### Quality Assurance
- Test with various input types
- Monitor response quality
- Implement feedback loops

## 🔧 Configuration Options

### Model Settings
```bash
# Temperature (creativity): 0.0-1.0
AI_TEMPERATURE=0.7

# Max tokens per response
AI_MAX_TOKENS=2000

# Context window size
AI_CONTEXT_LIMIT=8000
```

### Provider-Specific Settings
```bash
# Google settings
GOOGLE_MODEL_TEMPERATURE=0.7
GOOGLE_MAX_TOKENS=2000

# OpenAI settings
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000
```

### Feature Flags
```bash
# Enable/disable features
ENABLE_STREAMING=true
ENABLE_MULTIMODAL=true
ENABLE_EMBEDDINGS=true
```

## 🔠 Troubleshooting

### Debug Mode
Enable detailed logging:
```bash
LOG_LEVEL=DEBUG bun run dev
```

### Test AI Connectivity
```bash
# Check provider status
curl http://localhost:3000/api/web/health/details
```

### Common Error Messages

**"Invalid API key"**
- Check environment variables
- Verify key format and validity
- Ensure key has required permissions

**"Rate limit exceeded"**
- Normal behavior, fallback should activate
- Check if OpenAI key is configured
- Monitor usage in provider dashboards

**"Model not found"**
- Check model names in configuration
- Verify provider supports the model
- Update to supported model versions

## 📈 Scaling Considerations

### High Volume Usage
- Implement request queuing
- Add multiple API keys for rotation
- Monitor and optimize token usage

### Multi-tenancy
- Separate API keys per tenant
- Usage tracking and billing
- Isolation of conversation data

### Global Deployment
- Regional provider endpoints
- Latency optimization
- Compliance with data regulations

---

**Next Steps:** Start with basic Google + OpenAI setup, then add monitoring with Langfuse as usage grows. See [Getting Started](GETTING_STARTED.md) for initial setup. 