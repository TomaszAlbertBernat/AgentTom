/**
 * Local Music Player Integration Service
 * Provides control over local media players and music library management
 */

import { z } from 'zod';
import { stateManager } from '../agent/state.service';
import { DocumentMetadata } from '../../types/document';
import type { DocumentType } from '../agent/document.service';
import { documentService } from '../agent/document.service';
import { PlayerManager } from './local-music/player-manager';
import { MediaLibrary } from './local-music/media-library';
import { createLogger } from '../common/logger.service';

const logger = createLogger('LocalMusicService');

// Environment validation for local music service
let isServiceEnabled = false;
try {
  const envSchema = z.object({
    LOCAL_MUSIC_ENABLED: z.string().optional().transform(val => val === 'true'),
    LOCAL_MUSIC_SCAN_DIRS: z.string().optional(),
    LOCAL_MUSIC_DEFAULT_PLAYER: z.string().optional(),
    LOCAL_MUSIC_AUTO_SCAN: z.string().optional().transform(val => val === 'true'),
    LOCAL_MUSIC_SCAN_INTERVAL: z.string().optional().transform(val => parseInt(val || '24')),
  });

  const env = envSchema.parse(process.env);
  isServiceEnabled = env.LOCAL_MUSIC_ENABLED || false;
} catch (error) {
  logger.warn('Local music service configuration incomplete', error);
}

interface ToolResponse {
  text: string;
  metadata: Partial<DocumentMetadata>;
  additional_data?: unknown;
}

// Initialize core components
const playerManager = new PlayerManager();
const mediaLibrary = new MediaLibrary();

const localMusicService = {
  /**
   * Check if local music service is properly configured
   */
  ensureConfigured: (): void => {
    if (!isServiceEnabled) {
      throw new Error('Local music service not enabled. Set LOCAL_MUSIC_ENABLED=true to enable.');
    }
  },

  /**
   * Initialize the local music service
   */
  initialize: async (): Promise<void> => {
    try {
      await playerManager.initialize();
      await mediaLibrary.initialize();

      // Auto-scan if enabled
      const autoScan = process.env.LOCAL_MUSIC_AUTO_SCAN === 'true';
      if (autoScan) {
        await mediaLibrary.scanLibrary();
      }

      logger.info('Local music service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize local music service', error);
      throw error;
    }
  },

  /**
   * Get service status and available players
   */
  getStatus: async (): Promise<any> => {
    const players = await playerManager.getAvailablePlayers();
    const activePlayer = await playerManager.getActivePlayer();
    const libraryStatus = await mediaLibrary.getStatus();

    return {
      enabled: isServiceEnabled,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        isAvailable: true,
        isActive: activePlayer?.id === p.id
      })),
      library: libraryStatus,
      configuration: {
        scanDirectories: process.env.LOCAL_MUSIC_SCAN_DIRS?.split(',') || [],
        autoScan: process.env.LOCAL_MUSIC_AUTO_SCAN === 'true',
        defaultPlayer: process.env.LOCAL_MUSIC_DEFAULT_PLAYER || 'auto'
      }
    };
  },

  /**
   * Execute music control commands
   */
  execute: async (action: string, payload: unknown): Promise<DocumentType> => {
    this.ensureConfigured();

    const player = await playerManager.getActivePlayer();
    if (!player) {
      throw new Error('No media player available. Please install and configure a supported media player.');
    }

    try {
      switch (action) {
        case 'play':
          await player.play();
          return this.createToolResponse('Playback started successfully');

        case 'pause':
          await player.pause();
          return this.createToolResponse('Playback paused');

        case 'stop':
          await player.stop();
          return this.createToolResponse('Playback stopped');

        case 'next':
          await player.next();
          return this.createToolResponse('Skipped to next track');

        case 'previous':
          await player.previous();
          return this.createToolResponse('Skipped to previous track');

        case 'seek':
          const position = payload as number;
          await player.seek(position);
          return this.createToolResponse(`Seeked to position: ${position}s`);

        case 'volume':
          const volume = payload as number;
          await player.setVolume(volume);
          return this.createToolResponse(`Volume set to: ${volume}%`);

        case 'status':
          const status = await player.getStatus();
          return this.createStatusResponse(status);

        case 'current':
          const currentTrack = await player.getCurrentTrack();
          return this.createTrackResponse(currentTrack);

        case 'search':
          const query = payload as string;
          const searchResults = await this.searchMusic(query);
          return this.createSearchResponse(searchResults);

        case 'playlist':
          const playlist = await player.getPlaylist();
          return this.createPlaylistResponse(playlist);

        case 'library.scan':
          await mediaLibrary.scanLibrary();
          return this.createToolResponse('Music library scan completed');

        case 'library.status':
          const libStatus = await mediaLibrary.getStatus();
          return this.createLibraryStatusResponse(libStatus);

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`Local music service error: ${action}`, error);
      throw new Error(`Music control failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Search music across player and library
   */
  searchMusic: async (query: string): Promise<any[]> => {
    const player = await playerManager.getActivePlayer();
    if (!player) return [];

    try {
      // Search in active player
      const playerResults = await player.search(query);

      // Search in media library
      const libraryResults = await mediaLibrary.search(query);

      // Combine and deduplicate results
      const allResults = [...playerResults, ...libraryResults];
      const uniqueResults = allResults.filter((track, index, self) =>
        index === self.findIndex(t => t.id === track.id)
      );

      return uniqueResults.slice(0, 20); // Limit results
    } catch (error) {
      logger.warn('Music search failed, returning empty results', error);
      return [];
    }
  },

  /**
   * Create standardized tool response
   */
  createToolResponse: (message: string): DocumentType => {
    return documentService.createDocument({
      text: message,
      source: 'local-music-service',
      content_type: 'tool_result',
      metadata: {
        service: 'local-music',
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Create status response
   */
  createStatusResponse: (status: any): DocumentType => {
    const statusText = `
🎵 Music Player Status
━━━━━━━━━━━━━━━━━━━━━
Playing: ${status.isPlaying ? 'Yes' : 'No'}
Current Time: ${Math.floor(status.currentTime / 60)}:${(status.currentTime % 60).toString().padStart(2, '0')}
Duration: ${Math.floor(status.duration / 60)}:${(status.duration % 60).toString().padStart(2, '0')}
Volume: ${status.volume}%
Shuffle: ${status.shuffle ? 'On' : 'Off'}
Repeat: ${status.repeat}
━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    return documentService.createDocument({
      text: statusText,
      source: 'local-music-service',
      content_type: 'tool_result',
      metadata: {
        service: 'local-music',
        type: 'status',
        status,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Create track response
   */
  createTrackResponse: (track: any): DocumentType => {
    if (!track) {
      return this.createToolResponse('No track currently playing');
    }

    const trackText = `
🎵 Now Playing
━━━━━━━━━━━━━━━━━━━━━
Title: ${track.title}
Artist: ${track.artist}
Album: ${track.album}
Duration: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}
━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    return documentService.createDocument({
      text: trackText,
      source: 'local-music-service',
      content_type: 'tool_result',
      metadata: {
        service: 'local-music',
        type: 'current_track',
        track,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Create search response
   */
  createSearchResponse: (tracks: any[]): DocumentType => {
    if (tracks.length === 0) {
      return this.createToolResponse('No tracks found matching your search');
    }

    const searchText = `
🎵 Search Results (${tracks.length} tracks found)
━━━━━━━━━━━━━━━━━━━━━
${tracks.slice(0, 10).map((track, index) =>
  `${index + 1}. ${track.title} - ${track.artist} (${track.album})`
).join('\n')}
${tracks.length > 10 ? `\n... and ${tracks.length - 10} more tracks` : ''}
━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    return documentService.createDocument({
      text: searchText,
      source: 'local-music-service',
      content_type: 'tool_result',
      metadata: {
        service: 'local-music',
        type: 'search_results',
        tracks,
        count: tracks.length,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Create playlist response
   */
  createPlaylistResponse: (tracks: any[]): DocumentType => {
    if (tracks.length === 0) {
      return this.createToolResponse('Playlist is empty');
    }

    const playlistText = `
🎵 Current Playlist (${tracks.length} tracks)
━━━━━━━━━━━━━━━━━━━━━
${tracks.map((track, index) =>
  `${(index + 1).toString().padStart(2, ' ')}. ${track.title} - ${track.artist}`
).join('\n')}
━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    return documentService.createDocument({
      text: playlistText,
      source: 'local-music-service',
      content_type: 'tool_result',
      metadata: {
        service: 'local-music',
        type: 'playlist',
        tracks,
        count: tracks.length,
        timestamp: new Date().toISOString()
      }
    });
  },

  /**
   * Create library status response
   */
  createLibraryStatusResponse: (status: any): DocumentType => {
    const statusText = `
📚 Music Library Status
━━━━━━━━━━━━━━━━━━━━━
Total Tracks: ${status.totalTracks || 0}
Last Scan: ${status.lastScan ? new Date(status.lastScan).toLocaleString() : 'Never'}
Scan Directories: ${status.scanDirectories?.length || 0}
Auto Scan: ${status.autoScan ? 'Enabled' : 'Disabled'}
━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    return documentService.createDocument({
      text: statusText,
      source: 'local-music-service',
      content_type: 'tool_result',
      metadata: {
        service: 'local-music',
        type: 'library_status',
        status,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Export the service
export { localMusicService };
