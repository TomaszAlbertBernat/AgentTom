# API Reference

This document provides detailed information about the AliceAGI API endpoints.

## 🔒 Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

Response:
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

## 🤖 AGI Endpoints

### Chat
```http
POST /api/agi/chat
Content-Type: application/json
Authorization: Bearer jwt_token

{
  "message": "What is the weather in New York?",
  "context": {
    "location": "New York",
    "units": "metric"
  }
}
```

Response:
```json
{
  "response": "The weather in New York is sunny with a temperature of 25°C.",
  "metadata": {
    "model": "gpt-4o",
    "tokens": 150,
    "processing_time": 1.2
  }
}
```

### Streaming Chat
```http
POST /api/agi/chat/stream
Content-Type: application/json
Authorization: Bearer jwt_token

{
  "message": "Tell me a story",
  "stream": true
}
```

Response: Server-Sent Events (SSE) stream

### Status
```http
GET /api/agi/status
Authorization: Bearer jwt_token
```

Response:
```json
{
  "status": "operational",
  "services": [
    {
      "name": "openai",
      "status": "operational",
      "latency": 150
    },
    {
      "name": "vector_store",
      "status": "operational",
      "latency": 50
    }
  ]
}
```

## 📁 File Management

### Upload File
```http
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer jwt_token

file: [binary]
metadata: {
  "type": "document",
  "tags": ["important", "work"]
}
```

Response:
```json
{
  "id": "uuid",
  "url": "https://example.com/files/uuid",
  "metadata": {
    "type": "document",
    "tags": ["important", "work"],
    "size": 1024,
    "mime_type": "application/pdf"
  }
}
```

### Get File
```http
GET /api/files/:id
Authorization: Bearer jwt_token
```

Response: File stream

### Delete File
```http
DELETE /api/files/:id
Authorization: Bearer jwt_token
```

Response:
```json
{
  "success": true
}
```

## 🛠️ Tools

### List Tools
```http
GET /api/tools
Authorization: Bearer jwt_token
```

Response:
```json
{
  "tools": [
    {
      "id": "weather",
      "name": "Weather Tool",
      "description": "Get weather information",
      "parameters": {
        "location": "string",
        "units": "string"
      }
    }
  ]
}
```

### Execute Tool
```http
POST /api/tools/execute
Content-Type: application/json
Authorization: Bearer jwt_token

{
  "toolId": "weather",
  "params": {
    "location": "New York",
    "units": "metric"
  }
}
```

Response:
```json
{
  "result": {
    "temperature": 25,
    "condition": "sunny",
    "humidity": 60
  }
}
```

## 💬 Conversation

### List Conversations
```http
GET /api/conversation
Authorization: Bearer jwt_token
```

Query Parameters:
- `limit`: number (default: 20)
- `offset`: number (default: 0)

Response:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Weather Discussion",
      "created_at": "2024-03-20T10:00:00Z",
      "updated_at": "2024-03-20T10:30:00Z"
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

### Create Conversation
```http
POST /api/conversation
Content-Type: application/json
Authorization: Bearer jwt_token

{
  "title": "Weather Discussion",
  "context": {
    "location": "New York"
  }
}
```

Response:
```json
{
  "id": "uuid",
  "conversation": {
    "title": "Weather Discussion",
    "created_at": "2024-03-20T10:00:00Z",
    "context": {
      "location": "New York"
    }
  }
}
```

### Get Conversation
```http
GET /api/conversation/:id
Authorization: Bearer jwt_token
```

Response:
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Weather Discussion",
    "created_at": "2024-03-20T10:00:00Z",
    "updated_at": "2024-03-20T10:30:00Z",
    "context": {
      "location": "New York"
    }
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What's the weather like?",
      "created_at": "2024-03-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "The weather in New York is sunny with a temperature of 25°C.",
      "created_at": "2024-03-20T10:00:05Z"
    }
  ]
}
```

## 🔄 Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid input parameters",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
``` 