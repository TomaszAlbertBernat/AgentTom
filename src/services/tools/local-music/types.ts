/**
 * Type definitions for Local Music Integration
 */

export interface MediaPlayer {
  /** Unique identifier for the player */
  id: string;

  /** Human-readable name of the player */
  name: string;

  /** Check if the player is available and can be controlled */
  isAvailable(): Promise<boolean>;

  /** Get current playback status */
  getStatus(): Promise<PlayerStatus>;

  /** Start or resume playback */
  play(): Promise<void>;

  /** Pause playback */
  pause(): Promise<void>;

  /** Stop playback completely */
  stop(): Promise<void>;

  /** Skip to next track */
  next(): Promise<void>;

  /** Skip to previous track */
  previous(): Promise<void>;

  /** Seek to specific position in current track (seconds) */
  seek(position: number): Promise<void>;

  /** Set volume level (0-100) */
  setVolume(volume: number): Promise<void>;

  /** Get information about currently playing track */
  getCurrentTrack(): Promise<TrackInfo | null>;

  /** Search for tracks in the player's library */
  search(query: string): Promise<TrackInfo[]>;

  /** Get current playlist */
  getPlaylist(): Promise<TrackInfo[]>;
}

export interface PlayerStatus {
  /** Whether media is currently playing */
  isPlaying: boolean;

  /** Current playback position in seconds */
  currentTime: number;

  /** Total duration of current track in seconds */
  duration: number;

  /** Volume level (0-100) */
  volume: number;

  /** Whether shuffle mode is enabled */
  shuffle: boolean;

  /** Repeat mode setting */
  repeat: RepeatMode;
}

export type RepeatMode = 'none' | 'track' | 'all';

export interface TrackInfo {
  /** Unique identifier for the track */
  id: string;

  /** Track title */
  title: string;

  /** Artist name */
  artist: string;

  /** Album name */
  album: string;

  /** Track duration in seconds */
  duration: number;

  /** File path on local filesystem */
  filePath: string;

  /** Additional metadata */
  metadata: Record<string, any>;

  /** Track number in album */
  trackNumber?: number;

  /** Year of release */
  year?: number;

  /** Genre */
  genre?: string;

  /** Bitrate in kbps */
  bitrate?: number;

  /** Sample rate in Hz */
  sampleRate?: number;

  /** File size in bytes */
  fileSize?: number;

  /** Date added to library */
  dateAdded?: Date;

  /** Last played date */
  lastPlayed?: Date;

  /** Play count */
  playCount?: number;
}

export interface LibraryConfig {
  /** Directories to scan for music files */
  scanDirectories: string[];

  /** Whether to scan subdirectories */
  includeSubdirectories: boolean;

  /** Supported file extensions */
  supportedExtensions: string[];

  /** Whether to extract metadata from files */
  extractMetadata: boolean;

  /** Whether to create auto-generated playlists */
  createPlaylists: boolean;

  /** Auto-scan interval in hours */
  scanInterval: number;

  /** Whether auto-scan is enabled */
  autoScan: boolean;
}

export interface ScanOptions {
  /** Directories to scan */
  directories: string[];

  /** Include subdirectories in scan */
  includeSubdirectories: boolean;

  /** Supported file extensions */
  supportedExtensions: string[];

  /** Extract metadata from audio files */
  extractMetadata: boolean;

  /** Force rescan of existing files */
  forceRescan?: boolean;
}

export interface ScanResult {
  /** Total number of tracks found */
  totalTracks: number;

  /** Number of new tracks added */
  newTracks: number;

  /** Number of updated tracks */
  updatedTracks: number;

  /** Number of tracks with errors */
  errorTracks: number;

  /** Scan start time */
  startTime: Date;

  /** Scan completion time */
  endTime: Date;

  /** Total scan duration in milliseconds */
  duration: number;

  /** Directories that were scanned */
  directories: string[];

  /** Any errors that occurred during scanning */
  errors: string[];
}

export interface LibraryStatus {
  /** Total number of tracks in library */
  totalTracks: number;

  /** Total duration of all tracks in seconds */
  totalDuration: number;

  /** Library size in bytes */
  totalSize: number;

  /** Last scan completion time */
  lastScan?: Date;

  /** Next scheduled scan time */
  nextScan?: Date;

  /** Current scanning status */
  isScanning: boolean;

  /** Scan progress (0-100) */
  scanProgress: number;

  /** Configured scan directories */
  scanDirectories: string[];

  /** Library statistics */
  statistics: {
    /** Tracks by artist */
    artists: number;

    /** Tracks by album */
    albums: number;

    /** Tracks by genre */
    genres: number;

    /** Most played tracks */
    mostPlayed: TrackInfo[];

    /** Recently added tracks */
    recentlyAdded: TrackInfo[];

    /** Recently played tracks */
    recentlyPlayed: TrackInfo[];
  };
}

export interface PlayerMetrics {
  /** Player identifier */
  playerId: string;

  /** Session start time */
  sessionStart: Date;

  /** Total play time in seconds */
  totalPlayTime: number;

  /** Number of tracks played */
  tracksPlayed: number;

  /** Number of skip actions */
  skipCount: number;

  /** Number of errors encountered */
  errorCount: number;

  /** Average command response time */
  avgResponseTime: number;

  /** Last activity timestamp */
  lastActivity: Date;
}

export interface SearchQuery {
  /** Search text */
  query: string;

  /** Limit number of results */
  limit?: number;

  /** Search in specific fields */
  fields?: ('title' | 'artist' | 'album' | 'genre')[];

  /** Sort results by field */
  sortBy?: 'title' | 'artist' | 'album' | 'duration' | 'dateAdded' | 'playCount';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Filter by minimum duration */
  minDuration?: number;

  /** Filter by maximum duration */
  maxDuration?: number;

  /** Filter by year range */
  yearRange?: {
    start: number;
    end: number;
  };
}

export interface PlaylistInfo {
  /** Unique identifier */
  id: string;

  /** Playlist name */
  name: string;

  /** Playlist description */
  description?: string;

  /** Tracks in playlist */
  tracks: TrackInfo[];

  /** Total duration in seconds */
  duration: number;

  /** Creation date */
  createdAt: Date;

  /** Last modified date */
  updatedAt: Date;

  /** Whether this is a smart playlist */
  isSmart: boolean;

  /** Smart playlist criteria (if applicable) */
  criteria?: Record<string, any>;
}
