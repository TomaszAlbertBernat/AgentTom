# Local Music Player Integration Architecture

## 🎵 Overview

The Local Music Player Integration allows AgentTom to control local media players on the user's machine, replacing the Spotify integration for users who prefer local music libraries. This feature supports multiple media players including Windows Media Player, VLC, foobar2000, and other popular players.

## 🏗️ System Architecture

### Core Components

```
Local Music Service
├── Player Manager
│   ├── Player Detection
│   ├── Player Registry
│   └── Player Interface
├── Media Library
│   ├── Library Scanner
│   ├── Metadata Extractor
│   └── Search Index
├── Playback Controller
│   ├── Transport Controls
│   ├── Status Monitoring
│   └── Event System
└── Tool Integration
    ├── Agent Tools
    ├── Status Endpoints
    └── Configuration UI
```

### Player Support Matrix

| Player | Windows | macOS | Linux | Control Method |
|--------|---------|-------|-------|----------------|
| Windows Media Player | ✅ | ❌ | ❌ | COM Automation |
| VLC Media Player | ✅ | ✅ | ✅ | HTTP API |
| foobar2000 | ✅ | ❌ | ❌ | COM Automation |
| iTunes | ❌ | ✅ | ❌ | COM Scripting |
| Music.app | ❌ | ✅ | ❌ | AppleScript |
| Rhythmbox | ❌ | ❌ | ✅ | MPRIS |
| Amarok | ❌ | ❌ | ✅ | MPRIS |

## 🔧 Implementation Strategy

### Phase 1: Core Architecture (Current Focus)

#### 1.1 Abstract Player Interface
```typescript
interface MediaPlayer {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<PlayerStatus>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(position: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getCurrentTrack(): Promise<TrackInfo | null>;
  search(query: string): Promise<TrackInfo[]>;
  getPlaylist(): Promise<TrackInfo[]>;
}

interface PlayerStatus {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  filePath: string;
  metadata: Record<string, any>;
}
```

#### 1.2 Player Manager
```typescript
class PlayerManager {
  private players: Map<string, MediaPlayer> = new Map();
  private activePlayer: MediaPlayer | null = null;

  async registerPlayer(player: MediaPlayer): Promise<void> {
    if (await player.isAvailable()) {
      this.players.set(player.id, player);
      console.log(`Player registered: ${player.name}`);
    }
  }

  async getActivePlayer(): Promise<MediaPlayer | null> {
    if (this.activePlayer && await this.activePlayer.isAvailable()) {
      return this.activePlayer;
    }

    // Auto-select first available player
    for (const player of this.players.values()) {
      if (await player.isAvailable()) {
        this.activePlayer = player;
        return player;
      }
    }

    return null;
  }

  async setActivePlayer(playerId: string): Promise<void> {
    const player = this.players.get(playerId);
    if (player && await player.isAvailable()) {
      this.activePlayer = player;
    } else {
      throw new Error(`Player ${playerId} not available`);
    }
  }
}
```

#### 1.3 Media Library Scanner
```typescript
interface ScanOptions {
  directories: string[];
  includeSubdirectories: boolean;
  supportedExtensions: string[];
  extractMetadata: boolean;
}

class MediaLibraryScanner {
  private supportedExtensions = [
    '.mp3', '.wav', '.flac', '.m4a', '.ogg',
    '.wma', '.aac', '.opus'
  ];

  async scanDirectories(options: ScanOptions): Promise<TrackInfo[]> {
    const tracks: TrackInfo[] = [];

    for (const directory of options.directories) {
      const files = await this.scanDirectory(directory, options);
      tracks.push(...files);
    }

    return tracks;
  }

  private async scanDirectory(
    directory: string,
    options: ScanOptions,
    depth = 0
  ): Promise<TrackInfo[]> {
    // Implementation for directory scanning
    // Extract metadata, create track objects
    return [];
  }
}
```

### Phase 2: Player Implementations

#### 2.1 Windows Media Player (COM Automation)
```typescript
class WindowsMediaPlayer implements MediaPlayer {
  private wmp: any; // Windows Media Player COM object

  async isAvailable(): Promise<boolean> {
    try {
      // Check if WMP is installed and accessible
      return process.platform === 'win32';
    } catch {
      return false;
    }
  }

  async play(): Promise<void> {
    if (this.wmp) {
      this.wmp.controls.play();
    }
  }

  async getStatus(): Promise<PlayerStatus> {
    if (!this.wmp) throw new Error('WMP not initialized');

    return {
      isPlaying: this.wmp.playState === 3, // Playing = 3
      currentTime: this.wmp.controls.currentPosition,
      duration: this.wmp.currentMedia?.duration || 0,
      volume: this.wmp.settings.volume,
      shuffle: this.wmp.settings.shuffle,
      repeat: this.mapRepeatMode(this.wmp.settings.repeat)
    };
  }
}
```

#### 2.2 VLC Media Player (HTTP API)
```typescript
class VLCMediaPlayer implements MediaPlayer {
  private baseUrl = 'http://localhost:8080';
  private password = 'vlc'; // Default VLC web password

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/status.json`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async play(): Promise<void> {
    await this.sendCommand('pl_play');
  }

  async getStatus(): Promise<PlayerStatus> {
    const status = await this.getVLCStatus();
    return {
      isPlaying: status.state === 'playing',
      currentTime: status.time || 0,
      duration: status.length || 0,
      volume: (status.volume || 0) / 2.56, // VLC uses 0-256 scale
      shuffle: status.random || false,
      repeat: status.loop ? 'all' : 'none'
    };
  }

  private async sendCommand(command: string, params?: Record<string, string>): Promise<any> {
    const url = new URL(`${this.baseUrl}/requests/status.json`);
    url.searchParams.set('command', command);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': 'Basic ' + btoa(`:${this.password}`)
      }
    });

    if (!response.ok) {
      throw new Error(`VLC command failed: ${command}`);
    }

    return response.json();
  }
}
```

### Phase 3: Integration with AgentTom

#### 3.1 Tool Service Interface
```typescript
const localMusicService = {
  ensureConfigured: (): void => {
    // Check if at least one player is available
    if (!playerManager.getActivePlayer()) {
      throw new Error('No local media players detected. Please install and configure a supported player.');
    }
  },

  execute: async (action: string, payload: unknown): Promise<DocumentType> => {
    const player = await playerManager.getActivePlayer();
    if (!player) {
      throw new Error('No media player available');
    }

    switch (action) {
      case 'play':
        await player.play();
        return this.createToolResponse('Playback started');

      case 'pause':
        await player.pause();
        return this.createToolResponse('Playback paused');

      case 'next':
        await player.next();
        return this.createToolResponse('Skipped to next track');

      case 'previous':
        await player.previous();
        return this.createToolResponse('Skipped to previous track');

      case 'search':
        const tracks = await player.search(payload as string);
        return this.createSearchResponse(tracks);

      case 'status':
        const status = await player.getStatus();
        return this.createStatusResponse(status);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
};
```

#### 3.2 Configuration UI
```typescript
// API endpoints for configuration
GET /api/local-music/players          // List available players
POST /api/local-music/player/active   // Set active player
GET /api/local-music/library/scan     // Scan music directories
GET /api/local-music/library/status   // Get scan status
POST /api/local-music/library/dirs    // Configure scan directories
```

### Phase 4: Advanced Features

#### 4.1 Smart Player Detection
```typescript
class PlayerDetector {
  private static readonly PLAYER_PROCESSES = {
    'wmplayer.exe': 'Windows Media Player',
    'vlc.exe': 'VLC Media Player',
    'foobar2000.exe': 'foobar2000',
    'itunes.exe': 'iTunes'
  };

  static async detectRunningPlayers(): Promise<string[]> {
    // Platform-specific process detection
    if (process.platform === 'win32') {
      return this.detectWindowsPlayers();
    } else if (process.platform === 'darwin') {
      return this.detectMacPlayers();
    } else {
      return this.detectLinuxPlayers();
    }
  }
}
```

#### 4.2 Media Library Management
```typescript
interface LibraryConfig {
  scanDirectories: string[];
  autoScan: boolean;
  scanInterval: number; // hours
  extractMetadata: boolean;
  createPlaylists: boolean;
}

class MediaLibraryManager {
  private config: LibraryConfig;
  private scanner: MediaLibraryScanner;
  private searchIndex: TrackSearchIndex;

  async scanLibrary(): Promise<ScanResult> {
    const tracks = await this.scanner.scanDirectories({
      directories: this.config.scanDirectories,
      includeSubdirectories: true,
      extractMetadata: this.config.extractMetadata
    });

    // Update search index
    await this.searchIndex.indexTracks(tracks);

    // Generate auto-playlists if enabled
    if (this.config.createPlaylists) {
      await this.generateAutoPlaylists(tracks);
    }

    return {
      totalTracks: tracks.length,
      scanTime: Date.now(),
      directories: this.config.scanDirectories
    };
  }
}
```

## 🔒 Security Considerations

### 1. Local Access Only
- All player control happens locally
- No network exposure of local media files
- API keys not required for local players

### 2. Permission Management
- Request minimal necessary permissions
- Platform-specific permission handling
- Clear user consent for media access

### 3. File System Access
- Only scan user-specified directories
- No access to system files
- Respect file system permissions

## 📊 Monitoring & Analytics

### Player Usage Metrics
```typescript
interface PlayerMetrics {
  playerId: string;
  sessionStart: Date;
  totalPlayTime: number;
  tracksPlayed: number;
  skipCount: number;
  errorCount: number;
}

class PlayerAnalytics {
  async trackUsage(action: string, playerId: string): Promise<void> {
    // Store usage metrics for analysis
  }

  async getPlayerStats(playerId: string): Promise<PlayerMetrics> {
    // Retrieve player usage statistics
  }
}
```

### Performance Monitoring
- Track response times for player commands
- Monitor library scan performance
- Log player availability and errors

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('Local Music Service', () => {
  it('should detect available players', async () => {
    const players = await PlayerManager.detectPlayers();
    expect(players.length).toBeGreaterThan(0);
  });

  it('should handle player unavailability', async () => {
    const player = new MockPlayer();
    await player.disconnect();
    await expect(player.play()).rejects.toThrow('Player unavailable');
  });
});
```

### Integration Tests
```typescript
describe('Player Integration', () => {
  it('should control VLC player', async () => {
    const vlc = new VLCMediaPlayer();
    await vlc.play();
    const status = await vlc.getStatus();
    expect(status.isPlaying).toBe(true);
  });
});
```

## 🚀 Deployment & Configuration

### Environment Setup
```bash
# Enable local music service
LOCAL_MUSIC_ENABLED=true

# Configure scan directories (comma-separated)
LOCAL_MUSIC_SCAN_DIRS=/home/user/Music,/home/user/Downloads

# Auto-scan settings
LOCAL_MUSIC_AUTO_SCAN=true
LOCAL_MUSIC_SCAN_INTERVAL=24  # hours

# Player preferences
LOCAL_MUSIC_DEFAULT_PLAYER=vlc
LOCAL_MUSIC_ENABLE_MULTIPLE=true
```

### Docker Configuration
```dockerfile
# Install player dependencies
RUN apt-get update && apt-get install -y vlc-nox

# Set environment variables
ENV LOCAL_MUSIC_ENABLED=true
ENV LOCAL_MUSIC_SCAN_DIRS=/music
```

## 📈 Success Metrics

### Functional Metrics
- ✅ **Player Detection**: Successfully detect ≥80% of installed players
- ✅ **Command Success**: ≥95% of playback commands execute successfully
- ✅ **Library Coverage**: Scan and index ≥90% of supported media files
- ✅ **Search Accuracy**: ≥85% of search queries return relevant results

### Performance Metrics
- ✅ **Command Response**: <500ms for all player commands
- ✅ **Library Scan**: <30 minutes for 10,000 files
- ✅ **Search Response**: <100ms for indexed library search
- ✅ **Memory Usage**: <50MB additional memory usage

### User Experience Metrics
- ✅ **Setup Time**: <5 minutes average setup time
- ✅ **Success Rate**: ≥90% of users successfully configure local music
- ✅ **Daily Usage**: Average 30 minutes daily usage
- ✅ **Feature Adoption**: ≥70% of users enable local music integration

## 🔄 Migration Path

### From Spotify Integration
1. **Detect Spotify Usage**: Identify users currently using Spotify
2. **Data Migration**: Export Spotify playlists and preferences
3. **Player Setup**: Guide users through local player installation
4. **Library Import**: Import Spotify data to local library
5. **Seamless Transition**: Maintain similar API for existing tools

### Backward Compatibility
- Keep Spotify integration as fallback option
- Allow users to switch between services
- Maintain existing tool interfaces
- Provide migration utilities

## 🎯 Next Steps

### Immediate Actions
1. **Architecture Review**: Finalize player interface design
2. **Core Implementation**: Implement PlayerManager and MediaLibrary classes
3. **VLC Integration**: Build VLC HTTP API integration
4. **Testing Framework**: Set up comprehensive test suite

### Medium-term Goals
1. **Windows Media Player**: Implement COM automation integration
2. **Library Management UI**: Create web interface for library management
3. **Advanced Features**: Add playlist creation, smart playlists
4. **Cross-platform Support**: Add macOS and Linux player support

### Long-term Vision
1. **AI-Powered Features**: Music recommendations based on usage patterns
2. **Multi-room Audio**: Synchronize playback across multiple devices
3. **Voice Control**: Integration with voice assistants
4. **Cloud Backup**: Sync local library with cloud storage

This architecture provides a solid foundation for local music player integration while maintaining the flexibility to support multiple players and platforms. The modular design allows for incremental implementation and easy testing of individual components.
