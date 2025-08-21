# API Reference

Quick reference for AgentTom API endpoints.

## 🔒 Authentication

All endpoints require authentication. Use JWT for user sessions and API keys for service access.

### Register
**POST** `/api/auth/register` - Create new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com", 
    "name": "User Name"
  }
}
```

### Login
**POST** `/api/auth/login` - Get access token

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### Current User
**GET** `/api/auth/me` - Get current user info

**Headers:** `Authorization: Bearer jwt_token`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name"
}
```

## 🤖 Chat

### Send Message
**POST** `/api/agi/messages` - Send message to AI

**Headers:** `Authorization: Bearer jwt_token`

**Request:**
```json
{
  "content": "What is the weather today?",
  "conversation_id": "uuid"
}
```

**Response:**
```json
{
  "conversation_id": "uuid",
  "response": "I'll help you check the weather...",
  "metadata": {
    "model": "gemini-2.5-flash",
    "tokens": 150
  }
}
```

### Create Conversation
**POST** `/api/agi/conversations` - Start new conversation

**Headers:** `Authorization: Bearer jwt_token`

**Response:**
```json
{
  "conversation_id": "uuid"
}
```

### Get Messages
**GET** `/api/agi/conversations/:id/messages` - Get conversation history

**Headers:** `Authorization: Bearer jwt_token`

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Hello",
      "created_at": "2024-03-20T10:00:00Z"
    },
    {
      "id": "uuid", 
      "role": "assistant",
      "content": "Hi! How can I help you?",
      "created_at": "2024-03-20T10:00:05Z"
    }
  ]
}
```

## 🛠️ Tools

### List Available Tools
**GET** `/api/tools` - Get all tools

**Headers:** `Authorization: Bearer api_key`

**Response:**
```json
{
  "tools": [
    {
      "id": "weather",
      "name": "Weather Tool",
      "description": "Get weather information",
      "available": true
    },
    {
      "id": "calendar", 
      "name": "Calendar Tool",
      "description": "Manage calendar events",
      "available": false
    }
  ]
}
```

### Execute Tool
**POST** `/api/tools/execute` - Run a tool

**Headers:** `Authorization: Bearer api_key`

**Request:**
```json
{
  "tool_name": "weather",
  "action": "current",
  "parameters": {
    "location": "New York"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "temperature": 25,
    "condition": "sunny"
  },
  "execution_id": "uuid"
}
```

## 📁 Files

### Upload File
**POST** `/api/files/upload` - Upload a file

**Headers:** `Authorization: Bearer jwt_token`

**Request:** Multipart form data with file

**Response:**
```json
{
  "id": "uuid",
  "url": "/api/files/uuid",
  "size": 1024,
  "mime_type": "text/plain"
}
```

### Get File
**GET** `/api/files/:id` - Download file

**Headers:** `Authorization: Bearer jwt_token`

**Response:** File content with appropriate headers

## ⚠️ Error Responses

All endpoints return consistent error format:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized", 
  "message": "Invalid or missing token"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 429 Rate Limited
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retry_after": 60
}
```

### 500 Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

## 🔍 Health Check

### Basic Health
**GET** `/api/web/health` - Simple health check

**Response:**
```json
{
  "status": "ok"
}
```

### Detailed Status
**GET** `/api/web/health/details` - Service status

**Response:**
```json
{
  "status": "operational",
  "services": {
    "database": "connected",
    "openai": "available", 
    "google": "available"
  }
}
```

---

**Need help?** Check the [Getting Started Guide](GETTING_STARTED.md) for setup instructions.