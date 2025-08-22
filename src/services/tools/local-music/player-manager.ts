/**
 * Player Manager for Local Music Integration
 * Manages multiple media players and provides unified interface
 */

import { createLogger } from '../../common/logger.service';
import type { MediaPlayer, PlayerStatus, TrackInfo } from './types';

const logger = createLogger('PlayerManager');

export class PlayerManager {
  private players: Map<string, MediaPlayer> = new Map();
  private activePlayer: MediaPlayer | null = null;
  private playerRegistry: Map<string, () => MediaPlayer> = new Map();

  constructor() {
    this.registerPlayerTypes();
  }

  /**
   * Initialize the player manager
   */
  async initialize(): Promise<void> {
    logger.info('Initializing player manager...');

    // Register available players
    for (const [playerId, playerFactory] of this.playerRegistry) {
      try {
        const player = playerFactory();
        if (await player.isAvailable()) {
          await this.registerPlayer(player);
        } else {
          logger.debug(`Player ${playerId} not available`);
        }
      } catch (error) {
        logger.warn(`Failed to initialize player ${playerId}`, error);
      }
    }

    // Auto-select default player
    await this.selectDefaultPlayer();

    logger.info(`Player manager initialized with ${this.players.size} players`);
  }

  /**
   * Register a player instance
   */
  private async registerPlayer(player: MediaPlayer): Promise<void> {
    this.players.set(player.id, player);
    logger.info(`Player registered: ${player.name} (${player.id})`);

    // Auto-select if no active player
    if (!this.activePlayer) {
      this.activePlayer = player;
    }
  }

  /**
   * Register available player types
   */
  private registerPlayerTypes(): void {
    // Import and register player implementations dynamically
    this.registerPlayerType('vlc', async () => {
      const { VLCMediaPlayer } = await import('./players/vlc-player');
      return new VLCMediaPlayer();
    });

    // Windows Media Player (Windows only)
    if (process.platform === 'win32') {
      this.registerPlayerType('wmp', async () => {
        const { WindowsMediaPlayer } = await import('./players/wmp-player');
        return new WindowsMediaPlayer();
      });
    }

    // Mock player for testing
    if (process.env.NODE_ENV === 'test') {
      this.registerPlayerType('mock', async () => {
        const { MockMediaPlayer } = await import('./players/mock-player');
        return new MockMediaPlayer();
      });
    }
  }

  /**
   * Register a player type factory
   */
  private registerPlayerType(playerId: string, factory: () => MediaPlayer): void {
    this.playerRegistry.set(playerId, factory);
  }

  /**
   * Get all available players
   */
  async getAvailablePlayers(): Promise<MediaPlayer[]> {
    const availablePlayers: MediaPlayer[] = [];

    for (const player of this.players.values()) {
      if (await player.isAvailable()) {
        availablePlayers.push(player);
      }
    }

    return availablePlayers;
  }

  /**
   * Get the active player
   */
  async getActivePlayer(): Promise<MediaPlayer | null> {
    if (this.activePlayer && await this.activePlayer.isAvailable()) {
      return this.activePlayer;
    }

    // Try to find another available player
    const availablePlayers = await this.getAvailablePlayers();
    if (availablePlayers.length > 0) {
      this.activePlayer = availablePlayers[0];
      logger.info(`Auto-selected player: ${this.activePlayer.name}`);
      return this.activePlayer;
    }

    return null;
  }

  /**
   * Set the active player
   */
  async setActivePlayer(playerId: string): Promise<void> {
    const player = this.players.get(playerId);

    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    if (!(await player.isAvailable())) {
      throw new Error(`Player ${playerId} is not available`);
    }

    this.activePlayer = player;
    logger.info(`Active player changed to: ${player.name}`);
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): MediaPlayer | undefined {
    return this.players.get(playerId);
  }

  /**
   * Select default player based on configuration or availability
   */
  private async selectDefaultPlayer(): Promise<void> {
    const defaultPlayerId = process.env.LOCAL_MUSIC_DEFAULT_PLAYER;

    if (defaultPlayerId && defaultPlayerId !== 'auto') {
      try {
        await this.setActivePlayer(defaultPlayerId);
        return;
      } catch (error) {
        logger.warn(`Failed to set default player ${defaultPlayerId}`, error);
      }
    }

    // Auto-select first available player
    const availablePlayers = await this.getAvailablePlayers();
    if (availablePlayers.length > 0) {
      this.activePlayer = availablePlayers[0];
      logger.info(`Auto-selected default player: ${this.activePlayer.name}`);
    }
  }

  /**
   * Get comprehensive status of all players
   */
  async getPlayersStatus(): Promise<any[]> {
    const status: any[] = [];

    for (const player of this.players.values()) {
      try {
        const isAvailable = await player.isAvailable();
        const playerStatus = isAvailable ? await player.getStatus() : null;

        status.push({
          id: player.id,
          name: player.name,
          isAvailable,
          isActive: this.activePlayer?.id === player.id,
          status: playerStatus
        });
      } catch (error) {
        status.push({
          id: player.id,
          name: player.name,
          isAvailable: false,
          isActive: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return status;
  }

  /**
   * Refresh player availability
   */
  async refreshPlayers(): Promise<void> {
    logger.info('Refreshing player availability...');

    // Check existing players
    for (const player of this.players.values()) {
      try {
        const isAvailable = await player.isAvailable();
        logger.debug(`Player ${player.name} availability: ${isAvailable}`);
      } catch (error) {
        logger.warn(`Failed to check availability for ${player.name}`, error);
      }
    }

    // Try to register new players
    for (const [playerId, playerFactory] of this.playerRegistry) {
      if (!this.players.has(playerId)) {
        try {
          const player = playerFactory();
          if (await player.isAvailable()) {
            await this.registerPlayer(player);
          }
        } catch (error) {
          logger.debug(`Player ${playerId} not available`, error);
        }
      }
    }
  }
}
