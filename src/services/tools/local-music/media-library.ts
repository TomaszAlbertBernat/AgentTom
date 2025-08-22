/**
 * Media Library Management for Local Music Integration
 * Handles music file scanning, indexing, and search functionality
 */

import { z } from 'zod';
import { createLogger } from '../../common/logger.service';
import type {
  LibraryConfig,
  ScanOptions,
  ScanResult,
  LibraryStatus,
  TrackInfo,
  SearchQuery
} from './types';

const logger = createLogger('MediaLibrary');

export class MediaLibrary {
  private config: LibraryConfig;
  private tracks: Map<string, TrackInfo> = new Map();
  private isScanning: boolean = false;
  private scanProgress: number = 0;
  private lastScan?: Date;
  private nextScan?: Date;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Initialize the media library
   */
  async initialize(): Promise<void> {
    logger.info('Initializing media library...');

    // Load existing library if available
    await this.loadLibrary();

    // Set up auto-scan if enabled
    if (this.config.autoScan) {
      this.scheduleAutoScan();
    }

    logger.info(`Media library initialized with ${this.tracks.size} tracks`);
  }

  /**
   * Load library configuration from environment
   */
  private loadConfiguration(): LibraryConfig {
    const envSchema = z.object({
      LOCAL_MUSIC_SCAN_DIRS: z.string().optional().default('/home/user/Music'),
      LOCAL_MUSIC_AUTO_SCAN: z.string().optional().transform(val => val === 'true'),
      LOCAL_MUSIC_SCAN_INTERVAL: z.string().optional().transform(val => parseInt(val || '24')),
    });

    const env = envSchema.parse(process.env);

    return {
      scanDirectories: env.LOCAL_MUSIC_SCAN_DIRS.split(',').map(dir => dir.trim()),
      includeSubdirectories: true,
      supportedExtensions: [
        '.mp3', '.wav', '.flac', '.m4a', '.ogg',
        '.wma', '.aac', '.opus', '.ape', '.mka'
      ],
      extractMetadata: true,
      createPlaylists: true,
      scanInterval: env.LOCAL_MUSIC_SCAN_INTERVAL,
      autoScan: env.LOCAL_MUSIC_AUTO_SCAN || false
    };
  }

  /**
   * Get library status
   */
  async getStatus(): Promise<LibraryStatus> {
    const tracks = Array.from(this.tracks.values());

    const statistics = {
      artists: new Set(tracks.map(t => t.artist)).size,
      albums: new Set(tracks.map(t => `${t.artist}-${t.album}`)).size,
      genres: new Set(tracks.map(t => t.genre).filter(Boolean)).size,
      mostPlayed: tracks
        .filter(t => t.playCount && t.playCount > 0)
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 10),
      recentlyAdded: tracks
        .filter(t => t.dateAdded)
        .sort((a, b) => (b.dateAdded?.getTime() || 0) - (a.dateAdded?.getTime() || 0))
        .slice(0, 10),
      recentlyPlayed: tracks
        .filter(t => t.lastPlayed)
        .sort((a, b) => (b.lastPlayed?.getTime() || 0) - (a.lastPlayed?.getTime() || 0))
        .slice(0, 10)
    };

    return {
      totalTracks: this.tracks.size,
      totalDuration: tracks.reduce((sum, track) => sum + track.duration, 0),
      totalSize: tracks.reduce((sum, track) => sum + (track.fileSize || 0), 0),
      lastScan: this.lastScan,
      nextScan: this.nextScan,
      isScanning: this.isScanning,
      scanProgress: this.scanProgress,
      scanDirectories: this.config.scanDirectories,
      statistics
    };
  }

  /**
   * Scan music library for new files
   */
  async scanLibrary(options?: Partial<ScanOptions>): Promise<ScanResult> {
    if (this.isScanning) {
      throw new Error('Library scan already in progress');
    }

    this.isScanning = true;
    this.scanProgress = 0;
    const startTime = new Date();

    logger.info('Starting library scan...');

    try {
      const scanOptions: ScanOptions = {
        directories: this.config.scanDirectories,
        includeSubdirectories: this.config.includeSubdirectories,
        supportedExtensions: this.config.supportedExtensions,
        extractMetadata: this.config.extractMetadata,
        ...options
      };

      const result = await this.performScan(scanOptions);

      this.lastScan = new Date();
      this.scheduleAutoScan();

      logger.info(`Library scan completed: ${result.totalTracks} tracks found`);

      return result;
    } finally {
      this.isScanning = false;
      this.scanProgress = 0;
    }
  }

  /**
   * Perform the actual scanning operation
   */
  private async performScan(options: ScanOptions): Promise<ScanResult> {
    const errors: string[] = [];
    let processedFiles = 0;
    const totalDirectories = options.directories.length;

    for (let i = 0; i < options.directories.length; i++) {
      const directory = options.directories[i];
      this.scanProgress = Math.round((i / totalDirectories) * 100);

      try {
        const files = await this.scanDirectory(directory, options);
        processedFiles += files.length;

        // Add new tracks to library
        for (const track of files) {
          this.tracks.set(track.id, track);
        }
      } catch (error) {
        const message = `Failed to scan directory ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(message);
        logger.warn(message);
      }
    }

    // Save library to persistent storage
    await this.saveLibrary();

    const endTime = new Date();

    return {
      totalTracks: this.tracks.size,
      newTracks: processedFiles,
      updatedTracks: 0, // TODO: Implement track updating logic
      errorTracks: errors.length,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      directories: options.directories,
      errors
    };
  }

  /**
   * Scan a single directory for music files
   */
  private async scanDirectory(directory: string, options: ScanOptions): Promise<TrackInfo[]> {
    const tracks: TrackInfo[] = [];

    // This is a simplified implementation
    // In a real implementation, you would:
    // 1. Recursively scan directories if includeSubdirectories is true
    // 2. Filter files by supportedExtensions
    // 3. Extract metadata using a library like music-metadata
    // 4. Create TrackInfo objects

    logger.debug(`Scanning directory: ${directory}`);

    // Mock implementation - in real code, this would scan actual files
    const mockTracks: TrackInfo[] = [
      {
        id: `mock-track-1-${directory}`,
        title: 'Mock Track 1',
        artist: 'Mock Artist',
        album: 'Mock Album',
        duration: 180,
        filePath: `${directory}/track1.mp3`,
        metadata: {},
        genre: 'Rock',
        year: 2024
      },
      {
        id: `mock-track-2-${directory}`,
        title: 'Mock Track 2',
        artist: 'Mock Artist',
        album: 'Mock Album',
        duration: 240,
        filePath: `${directory}/track2.mp3`,
        metadata: {},
        genre: 'Pop',
        year: 2024
      }
    ];

    tracks.push(...mockTracks);

    return tracks;
  }

  /**
   * Search the music library
   */
  async search(query: SearchQuery | string): Promise<TrackInfo[]> {
    const searchQuery: SearchQuery = typeof query === 'string'
      ? { query, limit: 20 }
      : query;

    const searchTerm = searchQuery.query.toLowerCase();
    const tracks = Array.from(this.tracks.values());

    // Filter tracks based on search criteria
    let filteredTracks = tracks.filter(track => {
      const searchFields = searchQuery.fields || ['title', 'artist', 'album', 'genre'];

      return searchFields.some(field => {
        const value = track[field as keyof TrackInfo]?.toString().toLowerCase();
        return value && value.includes(searchTerm);
      });
    });

    // Apply additional filters
    if (searchQuery.minDuration) {
      filteredTracks = filteredTracks.filter(t => t.duration >= searchQuery.minDuration!);
    }

    if (searchQuery.maxDuration) {
      filteredTracks = filteredTracks.filter(t => t.duration <= searchQuery.maxDuration!);
    }

    if (searchQuery.yearRange) {
      filteredTracks = filteredTracks.filter(t =>
        t.year && t.year >= searchQuery.yearRange!.start && t.year <= searchQuery.yearRange!.end
      );
    }

    // Sort results
    const sortBy = searchQuery.sortBy || 'title';
    const sortDirection = searchQuery.sortDirection || 'asc';

    filteredTracks.sort((a, b) => {
      let aValue = a[sortBy as keyof TrackInfo];
      let bValue = b[sortBy as keyof TrackInfo];

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply limit
    const limit = searchQuery.limit || 20;
    return filteredTracks.slice(0, limit);
  }

  /**
   * Get track by ID
   */
  getTrack(trackId: string): TrackInfo | undefined {
    return this.tracks.get(trackId);
  }

  /**
   * Get all tracks
   */
  getAllTracks(): TrackInfo[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Add or update a track
   */
  addTrack(track: TrackInfo): void {
    this.tracks.set(track.id, track);
  }

  /**
   * Remove a track
   */
  removeTrack(trackId: string): boolean {
    return this.tracks.delete(trackId);
  }

  /**
   * Save library to persistent storage
   */
  private async saveLibrary(): Promise<void> {
    try {
      const libraryData = {
        tracks: Array.from(this.tracks.values()),
        lastUpdated: new Date(),
        version: '1.0'
      };

      // In a real implementation, this would save to a database or file
      // For now, we'll just log the action
      logger.debug(`Library saved: ${this.tracks.size} tracks`);

      // TODO: Implement actual persistence
      // await fs.writeFile('library.json', JSON.stringify(libraryData));
    } catch (error) {
      logger.error('Failed to save library', error);
    }
  }

  /**
   * Load library from persistent storage
   */
  private async loadLibrary(): Promise<void> {
    try {
      // In a real implementation, this would load from database or file
      // For now, we'll start with an empty library
      logger.debug('Library loaded (empty for now)');

      // TODO: Implement actual loading
      // const data = await fs.readFile('library.json', 'utf-8');
      // const libraryData = JSON.parse(data);
      // this.tracks = new Map(libraryData.tracks.map((t: TrackInfo) => [t.id, t]));
    } catch (error) {
      logger.debug('No existing library found, starting fresh');
    }
  }

  /**
   * Schedule automatic library scan
   */
  private scheduleAutoScan(): void {
    if (!this.config.autoScan) return;

    const nextScanTime = new Date(Date.now() + this.config.scanInterval * 60 * 60 * 1000);
    this.nextScan = nextScanTime;

    // In a real implementation, you would use a job scheduler
    // For now, we'll just set the next scan time
    logger.debug(`Next auto-scan scheduled for: ${nextScanTime.toISOString()}`);
  }

  /**
   * Clear the music library
   */
  async clearLibrary(): Promise<void> {
    this.tracks.clear();
    await this.saveLibrary();
    logger.info('Music library cleared');
  }
}
