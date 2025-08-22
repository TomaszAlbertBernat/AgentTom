# Development Guide - Simplified for Local-First

Essential guidelines for developing AgentTom with simplified local-first approach.

## 🎯 Core Principles

- **Write simple, readable code** - Clear over clever
- **Document as you code** - Not after
- **Use TypeScript everywhere** - Full type safety
- **Fail fast** - Early error detection and handling
- **Test your changes** - Unit tests for core logic

## 🏗️ Code Standards

### Naming Conventions
```typescript
// Variables and functions - descriptive, specific
const userAuthenticationToken = "jwt_token";  // ✅ Good
const token = "jwt_token";                    // ❌ Too vague

// Functions - action-oriented
function validateUserCredentials() {}         // ✅ Good  
function validate() {}                        // ❌ Too generic

// Interfaces - PascalCase, descriptive
interface UserAuthenticationRequest {}        // ✅ Good
interface AuthReq {}                         // ❌ Too short
```

### Error Handling Pattern
```typescript
// ✅ Use early returns
async function processUser(data: UserData) {
  if (!data.email) {
    return { success: false, error: "Email required" };
  }
  
  const user = await findUser(data.email);
  if (!user) {
    return { success: false, error: "User not found" };
  }
  
  return { success: true, user };
}
```

### TypeScript Requirements
- Use TypeScript for all files
- Enable strict mode in `tsconfig.json`
- Validate external inputs with Zod schemas
- Use interfaces for object shapes

## 🚀 Development Workflow

### 1. Set Up Environment
```bash
git clone [repo]
cd AgentTom
bun install

# Edit .env with your API keys, if you don't have a configured one already
bun run migrate
bun run dev
```

### 2. Make Changes
```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make small, focused commits
git commit -m "Add user validation logic"
git commit -m "Update API response format"
```

### 3. Test Your Changes
```bash
# Run unit tests
bun test

# Test specific functionality
bun test tests/unit/auth.test.ts

# Check health endpoints
curl http://localhost:3000/api/web/health
```

### 4. Submit Changes
```bash
# Push branch
git push origin feature/my-new-feature

# Create pull request with:
# - Clear description
# - What changed and why
# - Testing steps
```

## 🧪 Testing

### Running Tests
```bash
bun test                    # All tests
bun test --watch           # Watch mode
bun test --coverage        # With coverage
```

### Writing Tests
```typescript
import { test, expect, describe } from 'bun:test';

describe('Auth Service', () => {
  test('should validate correct credentials', () => {
    const result = validateCredentials({
      email: "test@example.com",
      password: "validPassword"
    });
    
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });
  
  test('should reject invalid credentials', () => {
    const result = validateCredentials({
      email: "test@example.com", 
      password: "wrongPassword"
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid");
  });
});
```

## 🔧 Adding New Features

### 1. Create a Service
```typescript
// src/services/example/example.service.ts
import { z } from 'zod';

const requestSchema = z.object({
  name: z.string().min(1),
  value: z.number()
});

export const exampleService = {
  async process(input: unknown) {
    try {
      const data = requestSchema.parse(input);
      
      // Validate early
      if (data.value < 0) {
        return { success: false, error: "Value must be positive" };
      }
      
      // Process data
      const result = await doSomething(data);
      
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }
};
```

### 2. Add API Route
```typescript
// src/routes/example.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { exampleService } from '../services/example/example.service';

const exampleRoutes = new Hono();

exampleRoutes.post(
  '/',
  zValidator('json', requestSchema),
  async (c) => {
    const data = c.req.valid('json');
    const result = await exampleService.process(data);
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    return c.json({ data: result.data });
  }
);

export { exampleRoutes };
```

### 3. Register Route
```typescript
// src/app.ts
import { exampleRoutes } from './routes/example';

app.route('/api/example', exampleRoutes);
```

### 4. Add Tests
```typescript
// tests/unit/services/example.service.test.ts
describe('Example Service', () => {
  test('should process valid input', async () => {
    const result = await exampleService.process({
      name: "test",
      value: 42
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## 📊 Database Changes

### Adding a New Table
1. Update schema in `src/schema/`
2. Generate migration: `bun run generate`
3. Review generated SQL in `src/database/migrations/`
4. Apply migration: `bun run migrate`

### Example Schema
```typescript
// src/schema/example.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const examples = sqliteTable('examples', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  value: integer('value').notNull(),
  createdAt: text('created_at').notNull()
});
```

## 🔍 Debugging

### Enable Debug Logging
```bash
LOG_LEVEL=DEBUG bun run dev
```

### Check Service Status
```bash
curl http://localhost:3000/api/web/health/details
```

### Common Issues

**Database locked**
```bash
# Reset database
rm agi.db
bun run migrate
```

**Environment variables missing**
```bash
# Check required variables
grep "required" .env-example
```

**Port already in use**
```bash
# Change port
echo "PORT=3001" >> .env
```

## 📚 Documentation

### Update Documentation
When adding features:
1. Update relevant `.md` files in `docs/`
2. Add API examples to `API.md`
3. Update environment variables in `GETTING_STARTED.md`
4. Add usage examples

### Code Documentation
```typescript
/**
 * Validates user authentication credentials
 * @param credentials User email and password
 * @returns Authentication result with user data or error
 */
async function validateUser(credentials: LoginRequest): Promise<AuthResult> {
  // Implementation
}
```

## 🚀 Deployment

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
DISABLE_API_KEY=false
JWT_SECRET=secure-random-string
CORS_ORIGIN=https://yourdomain.com
```

### Build and Deploy
```bash
# Type check
bun run build

# Run migrations
bun run migrate

# Start production server
bun run start
```

## 🔒 Security Checklist

### Before Production
- [ ] Strong `JWT_SECRET` and `API_KEY` values
- [ ] Specific `CORS_ORIGIN` (not `*`)
- [ ] `DISABLE_API_KEY=false`
- [ ] HTTPS enabled
- [ ] API keys secured
- [ ] File upload limits configured
- [ ] Rate limiting enabled

## 📋 Common Tasks

### Reset Everything
```bash
rm agi.db
bun install
bun run migrate
bun run seed
bun run dev
```

### Update Dependencies
```bash
bun update
bun audit
bun test  # Ensure nothing broke
```

### Check Code Quality
```bash
bun test --coverage
bun run build
```

## 🚀 Simplified Development Workflow

### Quick Start (Simplified)
```bash
# 1. Clone and install
git clone [repo]
cd AgentTom
bun install

# 2. Configure (minimal setup)
echo "GOOGLE_API_KEY=your_gemini_key" > .env
echo "DATABASE_PATH=./data/agentom.db" >> .env

# 3. Run migrations and start
bun run migrate
bun run dev
```

### Simplified Configuration
```bash
# Essential environment variables only
GOOGLE_API_KEY=your_gemini_key          # Required - Gemini AI
OPENAI_API_KEY=your_openai_key          # Optional - Fallback AI
DATABASE_PATH=./data/agentom.db         # Local SQLite path

# Optional services (can be added later)
# LINEAR_API_KEY=...
# SPOTIFY_CLIENT_ID=...
```

### Development Commands (Simplified)
```bash
# Core development
bun run dev          # Start dev server
bun run build        # Type check only
bun test             # Run unit tests

# Database
bun run migrate      # Run migrations
bun run seed         # Seed development data

# Code quality
bun test --coverage  # Test with coverage
```

### Simplified Testing Strategy
- **Focus on unit tests** for core business logic
- **Basic E2E tests** for critical user flows
- **Integration tests** only for essential API endpoints
- **Remove complex test suites** for unused features

### Simplified Onboarding
1. **Clone repository** - Single git clone command
2. **Install dependencies** - `bun install` only
3. **Add API key** - One environment variable
4. **Run migrations** - `bun run migrate`
5. **Start development** - `bun run dev`

### Tooling Simplification
- **Build tool**: Replace Next.js with Vite
- **Testing**: Focus on Bun test + essential Playwright
- **Linting**: Keep TypeScript compiler + basic ESLint
- **Dependencies**: Remove unused packages

### Local Development Benefits
- **Faster startup** - Reduced initialization time
- **Simpler debugging** - Fewer services to troubleshoot
- **Lower resource usage** - Less memory and CPU overhead
- **Easier configuration** - Minimal environment setup
- **Better performance** - Optimized for local single-user scenario

## 🤝 Getting Help

1. **Setup issues** - Check [Getting Started](GETTING_STARTED.md)
2. **API questions** - See [API Reference](API.md)
3. **Architecture** - Read [Architecture](ARCHITECTURE.md)
4. **Tools** - Check [Tools Documentation](TOOLS.md)

---

**Remember:** Keep it simple, document your changes, and test thoroughly. When in doubt, prefer readable code over clever code.