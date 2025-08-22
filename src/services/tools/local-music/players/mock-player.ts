/**
 * Mock Media Player for Testing and Development
 * Implements the MediaPlayer interface with simulated behavior
 */

import type { MediaPlayer, PlayerStatus, TrackInfo } from '../types';
import { createLogger } from '../../../common/logger.service';

const logger = createLogger('MockMediaPlayer');

export class MockMediaPlayer implements MediaPlayer {
  id = 'mock-player';
  name = 'Mock Media Player';

  private isPlayingState: boolean = false;
  private currentTimeState: number = 0;
  private volumeState: number = 75;
  private shuffleState: boolean = false;
  private repeatState: 'none' | 'track' | 'all' = 'none';
  private currentTrack: TrackInfo | null = null;
  private playlist: TrackInfo[] = [];
  private timer?: NodeJS.Timeout;

  /**
   * Check if the mock player is available (always true)
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Get current playback status
   */
  async getStatus(): Promise<PlayerStatus> {
    return {
      isPlaying: this.isPlayingState,
      currentTime: this.currentTimeState,
      duration: this.currentTrack?.duration || 0,
      volume: this.volumeState,
      shuffle: this.shuffleState,
      repeat: this.repeatState
    };
  }

  /**
   * Start or resume playback
   */
  async play(): Promise<void> {
    logger.debug('Mock player: play()');
    this.isPlayingState = true;

    // Simulate playback timer
    this.startPlaybackTimer();

    // Set a default track if none is selected
    if (!this.currentTrack) {
      await this.setDefaultTrack();
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    logger.debug('Mock player: pause()');
    this.isPlayingState = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Stop playback completely
   */
  async stop(): Promise<void> {
    logger.debug('Mock player: stop()');
    this.isPlayingState = false;
    this.currentTimeState = 0;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Skip to next track
   */
  async next(): Promise<void> {
    logger.debug('Mock player: next()');

    if (this.playlist.length > 0) {
      const currentIndex = this.currentTrack
        ? this.playlist.findIndex(t => t.id === this.currentTrack?.id)
        : -1;

      const nextIndex = (currentIndex + 1) % this.playlist.length;
      this.currentTrack = this.playlist[nextIndex];
      this.currentTimeState = 0;
    }
  }

  /**
   * Skip to previous track
   */
  async previous(): Promise<void> {
    logger.debug('Mock player: previous()');

    if (this.playlist.length > 0) {
      const currentIndex = this.currentTrack
        ? this.playlist.findIndex(t => t.id === this.currentTrack?.id)
        : -1;

      const prevIndex = currentIndex <= 0
        ? this.playlist.length - 1
        : currentIndex - 1;

      this.currentTrack = this.playlist[prevIndex];
      this.currentTimeState = 0;
    }
  }

  /**
   * Seek to specific position
   */
  async seek(position: number): Promise<void> {
    logger.debug(`Mock player: seek(${position})`);
    this.currentTimeState = Math.max(0, Math.min(position, this.currentTrack?.duration || 0));
  }

  /**
   * Set volume level
   */
  async setVolume(volume: number): Promise<void> {
    logger.debug(`Mock player: setVolume(${volume})`);
    this.volumeState = Math.max(0, Math.min(100, volume));
  }

  /**
   * Get information about currently playing track
   */
  async getCurrentTrack(): Promise<TrackInfo | null> {
    return this.currentTrack;
  }

  /**
   * Search for tracks in the mock library
   */
  async search(query: string): Promise<TrackInfo[]> {
    logger.debug(`Mock player: search("${query}")`);

    // Generate mock search results
    const mockResults: TrackInfo[] = [
      {
        id: `search-result-1-${query}`,
        title: `${query} Track 1`,
        artist: 'Mock Artist 1',
        album: 'Search Results',
        duration: 180,
        filePath: `/mock/path/${query}-1.mp3`,
        metadata: { searchQuery: query },
        genre: 'Pop'
      },
      {
        id: `search-result-2-${query}`,
        title: `${query} Track 2`,
        artist: 'Mock Artist 2',
        album: 'Search Results',
        duration: 240,
        filePath: `/mock/path/${query}-2.mp3`,
        metadata: { searchQuery: query },
        genre: 'Rock'
      }
    ];

    // Filter results based on query similarity
    return mockResults.filter(track =>
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase()) ||
      track.album.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Get current playlist
   */
  async getPlaylist(): Promise<TrackInfo[]> {
    return this.playlist;
  }

  /**
   * Start playback timer to simulate time progression
   */
  private startPlaybackTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      if (this.isPlayingState && this.currentTrack) {
        this.currentTimeState += 1; // Advance by 1 second

        // Check if track ended
        if (this.currentTimeState >= this.currentTrack.duration) {
          if (this.repeatState === 'track') {
            this.currentTimeState = 0;
          } else if (this.repeatState === 'all' || this.playlist.length > 1) {
            this.next();
          } else {
            this.pause();
          }
        }
      }
    }, 1000);
  }

  /**
   * Set a default track for testing
   */
  private async setDefaultTrack(): Promise<void> {
    this.currentTrack = {
      id: 'mock-default-track',
      title: 'Default Mock Track',
      artist: 'Mock Player',
      album: 'Mock Album',
      duration: 180,
      filePath: '/mock/path/default-track.mp3',
      metadata: { isDefault: true },
      genre: 'Electronic'
    };

    // Add some tracks to playlist
    this.playlist = [
      this.currentTrack,
      {
        id: 'mock-track-1',
        title: 'Mock Track 1',
        artist: 'Mock Artist',
        album: 'Mock Album',
        duration: 240,
        filePath: '/mock/path/track1.mp3',
        metadata: {},
        genre: 'Pop'
      },
      {
        id: 'mock-track-2',
        title: 'Mock Track 2',
        artist: 'Mock Artist',
        album: 'Mock Album',
        duration: 200,
        filePath: '/mock/path/track2.mp3',
        metadata: {},
        genre: 'Rock'
      }
    ];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
