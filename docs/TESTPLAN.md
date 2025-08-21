# Test Plan

How to verify AgentTom works correctly.

## 🎯 Testing Goals

- Verify server starts and health endpoints work
- Test authentication and API access
- Validate AI conversation functionality
- Check tool integrations work when configured
- Ensure error handling is robust

## 📋 Prerequisites

### Environment Setup
```bash
# Copy test environment
cp .env-example .env.test

# Set minimal required variables
GOOGLE_API_KEY=your_google_key  # OR OPENAI_API_KEY
APP_URL=http://localhost:3000
API_KEY=test-api-key-here
JWT_SECRET=test-jwt-secret
```

### Database Setup
```bash
bun run generate
bun run migrate
bun run seed  # Optional test data
```

## 🚀 Quick Smoke Test

### 1. Start Server
```bash
bun run dev
```

### 2. Basic Health Check
```bash
curl http://localhost:3000/api/web/health
# Expected: {"status":"ok"}
```

### 3. Detailed Service Status
```bash
curl http://localhost:3000/api/web/health/details
# Expected: JSON showing configured services
```

### 4. API Documentation
```bash
curl http://localhost:3000/docs/openapi.json
# Expected: Valid OpenAPI JSON
```

## 🔐 Authentication Testing

### 1. Register New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```
**Expected:** `{"token":"jwt_token_here","user":{...}}`

Save the JWT token as `$JWT` for next steps.

### 2. Login Existing User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```
**Expected:** `{"token":"jwt_token","user":{...}}`

### 3. Get Current User Info
```bash
curl -H "Authorization: Bearer $JWT" \
  http://localhost:3000/api/auth/me
```
**Expected:** User profile data

### 4. Test Invalid Credentials
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
```
**Expected:** 401 error

## 🤖 AI Conversation Testing

**Note:** For testing, you may need to temporarily disable API key middleware for AGI routes or use both JWT + API key authentication.

### 1. Create Conversation
```bash
curl -X POST http://localhost:3000/api/agi/conversations \
  -H "Authorization: Bearer $JWT"
```
**Expected:** `{"conversation_id":"uuid"}`

Save conversation ID as `$CONV_ID`.

### 2. Send Message
```bash
curl -X POST http://localhost:3000/api/agi/messages \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, can you help me?","conversation_id":"'$CONV_ID'"}'
```
**Expected:** `{"conversation_id":"uuid","response":"AI response here"}`

### 3. Get Message History
```bash
curl -H "Authorization: Bearer $JWT" \
  http://localhost:3000/api/agi/conversations/$CONV_ID/messages
```
**Expected:** Array of messages in chronological order

### 4. Test Error Handling
```bash
# Missing content
curl -X POST http://localhost:3000/api/agi/messages \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"'$CONV_ID'"}'
```
**Expected:** 400 error with validation message

## 🛠️ Tools Testing

Tools require API key authentication. Generate an API key first:

### 1. List Available Tools
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/tools
```
**Expected:** Array of tools with availability status

### 2. Execute Web Tool (if Firecrawl configured)
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "web",
    "action": "getContents", 
    "parameters": {"url": "https://example.com"}
  }'
```
**Expected:** Success response with page content or structured error

### 3. View Execution History
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/tools/executions
```
**Expected:** Array of recent tool executions

### 4. Test Invalid Tool
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "nonexistent", "action": "test"}'
```
**Expected:** 404 error

## 🧪 Unit Tests

### Run Test Suite
```bash
bun test
```
**Expected:** All tests pass

### Run with Coverage
```bash
bun test --coverage
```
**Expected:** Coverage report showing test coverage

### Watch Mode (for development)
```bash
bun test --watch
```

## 🔧 Integration Testing

### Linear Integration (if configured)
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/linear/teams
```
**Expected:** Linear teams data or configuration error

### File Upload
```bash
echo "test content" > test.txt
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer $JWT" \
  -F "file=@test.txt"
```
**Expected:** File upload success with file ID

### Rate Limiting (if Redis configured)
Rapidly call any API endpoint to trigger rate limiting:
```bash
for i in {1..20}; do curl -H "Authorization: Bearer $API_KEY" http://localhost:3000/api/tools; done
```
**Expected:** Eventually get 429 rate limit error

## 🚨 Error Testing

### 1. Missing Authentication
```bash
curl http://localhost:3000/api/auth/me
```
**Expected:** 401 Unauthorized

### 2. Invalid API Key
```bash
curl -H "Authorization: Bearer invalid_key" \
  http://localhost:3000/api/tools
```
**Expected:** 401 Unauthorized

### 3. Malformed JSON
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"invalid json"}'
```
**Expected:** 400 Bad Request

## 📊 Performance Testing

### Response Time Check
```bash
time curl http://localhost:3000/api/web/health
```
**Expected:** Response under 100ms

### Concurrent Requests
```bash
# Run 10 concurrent health checks
for i in {1..10}; do curl http://localhost:3000/api/web/health & done; wait
```
**Expected:** All requests succeed

## 🏁 Acceptance Criteria

### ✅ Basic Functionality
- [ ] Server starts without errors
- [ ] Health endpoints return 200
- [ ] API documentation is accessible
- [ ] Database migrations run successfully

### ✅ Authentication
- [ ] User registration works
- [ ] User login works  
- [ ] JWT authentication protects routes
- [ ] Invalid credentials are rejected

### ✅ AI Features
- [ ] Conversations can be created
- [ ] Messages can be sent and receive AI responses
- [ ] Message history is retrievable
- [ ] AI provider failover works (if both keys configured)

### ✅ Tools
- [ ] Tools list shows available tools
- [ ] Tool execution works for configured tools
- [ ] Tool execution errors are handled gracefully
- [ ] Execution history is tracked

### ✅ Error Handling
- [ ] Invalid inputs return 400 errors
- [ ] Missing auth returns 401 errors
- [ ] Missing resources return 404 errors
- [ ] Server errors return 500 errors with details

## 🔄 Continuous Integration

### GitHub Actions Test Script
```yaml
- name: Setup and Test
  run: |
    bun install
    cp .env-example .env.test
    bun run generate
    bun run migrate
    bun test
    bun run dev &
    sleep 5
    curl -f http://localhost:3000/api/web/health
```

## 🛠️ Manual Testing Checklist

For thorough testing before releases:

### Setup
- [ ] Fresh installation works
- [ ] Environment variables are validated
- [ ] Database migrations run cleanly
- [ ] Health endpoints show correct service status

### Core Features
- [ ] User registration and login
- [ ] AI conversations with all configured providers
- [ ] Tool execution for available tools
- [ ] File upload and retrieval
- [ ] Error scenarios handled gracefully

### Performance
- [ ] Response times under 200ms for most endpoints
- [ ] Concurrent requests handled properly
- [ ] Memory usage stable over time

---

**Quick Test:** Run `bun test && curl http://localhost:3000/api/web/health` - if both succeed, basic functionality is working.