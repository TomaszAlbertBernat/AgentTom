# Monitoring

How to monitor AgentTom health and performance.

## 🔍 Health Checks

### Basic Health Check
```bash
curl http://localhost:3000/api/web/health
```

**Response:**
```json
{
  "status": "ok"
}
```

### Detailed Service Status
```bash
curl http://localhost:3000/api/web/health/details
```

**Response:**
```json
{
  "status": "operational",
  "services": {
    "database": "connected",
    "openai": "available",
    "google": "available",
    "linear": "configured",
    "spotify": "not_configured"
  }
}
```

## 📊 Built-in Monitoring

### Application Logs
AgentTom includes structured logging with different levels:

```bash
# Enable debug logging
LOG_LEVEL=DEBUG bun run dev

# Available levels: ERROR, WARN, INFO, DEBUG, TRACE
```

**Log format:**
```json
{
  "timestamp": "2024-03-20T10:00:00Z",
  "level": "INFO",
  "component": "ServiceName",
  "message": "Operation completed",
  "metadata": { "duration": 150 }
}
```

### Performance Tracking
The application automatically tracks:
- Response times for API calls
- AI model performance and token usage
- Tool execution times
- Database query performance

## 🎯 Key Metrics to Monitor

### Application Health
- **Server uptime** - Is the service running?
- **Database connectivity** - Can we access SQLite?
- **AI provider status** - Are Google/OpenAI accessible?

### Performance
- **Response times** - API endpoints under 200ms
- **Memory usage** - Watch for memory leaks
- **AI token usage** - Track costs and rate limits

### Errors
- **HTTP error rates** - 4xx/5xx response tracking
- **AI failures** - Model errors and fallback usage
- **Tool execution failures** - External service issues

## 🔧 Setting Up External Monitoring

### Langfuse (AI Observability)
Track AI interactions and performance:

```bash
# Add to .env
LANGFUSE_API_KEY=your_langfuse_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

Features:
- Trace AI conversations
- Monitor token usage and costs
- Track model performance
- Debug conversation flows

### Sentry (Error Tracking)
Monitor application errors:

```bash
# Add to .env  
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
```

Features:
- Automatic error capture
- Performance monitoring
- Release tracking
- Alert notifications

## 📈 Monitoring Best Practices

### 1. Start Simple
- Use built-in health endpoints
- Monitor basic metrics first
- Add external tools as needed

### 2. Set Up Alerts
- Health check failures
- High error rates (>5%)
- Slow response times (>1s)
- AI provider issues

### 3. Track User Experience
- Conversation completion rates
- Tool execution success
- Response quality feedback

### 4. Monitor Costs
- AI token usage per user
- External API call volumes
- Storage usage growth

## 🚨 Common Issues

### High Memory Usage
**Symptoms:** Gradual memory increase, slow responses
**Check:** 
- Long conversation histories
- File upload processing
- Vector storage growth

**Solution:**
- Implement conversation pruning
- Add file size limits
- Monitor vector database size

### AI Provider Errors
**Symptoms:** 429 rate limit errors, API failures
**Check:**
- Provider status pages
- API key validity
- Usage quotas

**Solution:**
- Configure fallback providers
- Implement retry logic
- Monitor rate limit headers

### Database Lock Issues
**Symptoms:** SQLite lock errors, timeout responses
**Check:**
- Concurrent database operations
- Long-running queries
- Migration status

**Solution:**
- Optimize query patterns
- Add connection pooling
- Monitor database file size

## 🔄 Maintenance Tasks

### Daily
- Check health endpoints
- Review error logs
- Monitor resource usage

### Weekly
- Review AI usage costs
- Check database size
- Update dependencies

### Monthly
- Performance trend analysis
- Capacity planning
- Security audit

## 📋 Monitoring Checklist

### Basic Setup
- [ ] Health endpoints responding
- [ ] Logs configured and readable
- [ ] Error tracking enabled
- [ ] Basic alerts configured

### Production Ready
- [ ] External monitoring tools connected
- [ ] Performance baselines established
- [ ] Incident response procedures
- [ ] Cost monitoring enabled

### Advanced
- [ ] Custom dashboards created
- [ ] Predictive alerts configured
- [ ] Automated scaling triggers
- [ ] Business metrics tracking

## 🛠️ Debugging Tools

### Health Endpoint
Quick service status check:
```bash
curl -s http://localhost:3000/api/web/health/details | jq
```

### Log Analysis
Search logs for specific issues:
```bash
# Find errors in the last hour
grep "ERROR" logs/app.log | tail -20

# Monitor real-time logs
tail -f logs/app.log | grep "AI_SERVICE"
```

### Database Inspection
Direct SQLite queries for debugging:
```bash
# Connect to database
sqlite3 agi.db

# Check recent conversations
SELECT id, created_at FROM conversations ORDER BY created_at DESC LIMIT 5;
```

---

**Next Steps:** Set up basic monitoring using health endpoints, then gradually add external tools like Langfuse for AI observability as needed.