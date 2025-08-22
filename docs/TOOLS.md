# Tools

Available integrations and how to use them.

## 🛠️ Available Tools

### Core Tools
These tools are built into AgentTom:

**Web Search & Scraping**
- Get web page content
- Search and extract information
- Requires: `FIRECRAWL_API_KEY`

**File Operations**
- Upload and store files
- Process text and documents
- Built-in, no extra setup needed

**Text Processing**
- Split text into chunks
- Extract and analyze content
- Built-in functionality

### Optional Integrations
Add these by setting environment variables:

**Linear Project Management**
- Create and manage tasks
- Track project progress
- Requires: `LINEAR_API_KEY`

**Spotify Music Control**
- Search and play music
- Control playback
- Requires: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`

**Google Services**
- Maps and location data
- Calendar management
- Requires: Google API credentials

**Communication**
- Email via Resend
- Text-to-speech via ElevenLabs
- Requires respective API keys

## 🚀 Quick Setup

### 1. Check Available Tools
```bash
curl -H "Authorization: Bearer your_api_key" \
  http://localhost:3000/api/tools
```

Response shows which tools are configured and available.

### 2. Execute a Tool
```bash
curl -X POST \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "web",
    "action": "getContents", 
    "parameters": {
      "url": "https://example.com"
    }
  }' \
  http://localhost:3000/api/tools/execute
```

## 🔧 Tool Configuration

### Web Tool (Firecrawl)
1. Get API key from [Firecrawl](https://firecrawl.dev)
2. Add to `.env`: `FIRECRAWL_API_KEY=your_key`
3. Restart server

**Available actions:**
- `getContents` - Extract text from webpage
- `search` - Search web content

### Linear Integration
1. Get API key from [Linear Settings](https://linear.app/settings/api)
2. Add to `.env`: `LINEAR_API_KEY=lin_api_...`
3. Run setup: `bun run setup:linear`

**Available actions:**
- `createIssue` - Create new task
- `getProjects` - List projects
- `getStates` - List workflow states

### Spotify Integration
1. Create app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add redirect URI: `http://localhost:3000/api/auth/spotify/callback`
3. Add to `.env`:
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```

**Available actions:**
- `search` - Find tracks/artists
- `play` - Control playback
- `currentTrack` - Get now playing

### Google Maps
1. Get API key from [Google Cloud Console](https://console.cloud.google.com)
2. Enable Maps JavaScript API
3. Add to `.env`: `GOOGLE_MAPS_API_KEY=your_key`

**Available actions:**
- `search` - Find places
- `directions` - Get route information
- `nearby` - Find nearby locations

## 📋 Tool Usage Patterns

### Via Chat Interface
Ask the AI to use tools naturally:
- "Get the content from https://example.com"
- "Create a Linear task called 'Fix login bug'"
- "Play some jazz music on Spotify"

### Via API Directly
Execute tools programmatically using the `/api/tools/execute` endpoint.

### Error Handling
Tools return structured responses:
```json
{
  "success": true,
  "result": { "data": "..." },
  "execution_id": "uuid"
}
```

Or on error:
```json
{
  "success": false,
  "error": "Tool not configured",
  "execution_id": "uuid"
}
```

## 🔍 Tool Monitoring

### Check Tool Status
Visit `/api/web/health/details` to see which tools are properly configured.

### View Execution History
```bash
curl -H "Authorization: Bearer your_api_key" \
  http://localhost:3000/api/tools/executions
```

Shows recent tool executions with success/failure status.

### Debug Tool Issues
1. Check environment variables are set
2. Verify API keys are valid
3. Review execution logs
4. Test tools individually

## 🔐 Security Notes

### API Key Protection
- Tools require API key authentication
- Keys are validated on each request
- Generate keys via admin interface

### External Service Access
- Tools only access configured services
- No arbitrary code execution
- Input validation on all parameters

### Rate Limiting
- Tools respect external service limits
- Built-in retry logic for temporary failures
- Graceful degradation when services unavailable

## 🛠️ Adding New Tools

### 1. Create Service
Create new file in `src/services/tools/`:
```typescript
interface MyToolService {
  execute: (action: string, params: any) => Promise<any>;
}

export const myToolService: MyToolService = {
  async execute(action, params) {
    // Tool implementation
  }
};
```

### 2. Add Configuration
Update `src/config/tools.config.ts`:
```typescript
import { myToolService } from '../services/tools/my-tool.service';

export const toolsMap = {
  'my-tool': myToolService,
  // ... other tools
};
```

### 3. Add Schema
Define parameters in `src/config/tool-schemas.ts`:
```typescript
export const toolSchemas = {
  'my-tool': {
    myAction: z.object({
      required_param: z.string(),
      optional_param: z.string().optional()
    })
  }
};
```

### 4. Test and Document
- Add unit tests
- Update this documentation
- Test via API endpoints

---

**Need help?** Check [Getting Started](GETTING_STARTED.md) for environment setup or [API Reference](API.md) for endpoint details.