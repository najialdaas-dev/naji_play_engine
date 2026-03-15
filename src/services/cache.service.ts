import NodeCache from 'node-cache';
import { StreamResponse, CacheEntry } from '../types';

export class CacheService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 7200, // 2 hours in seconds
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false
    });
  }

  private generateKey(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): string {
    if (type === 'movie') {
      return `movie:${tmdbId}`;
    }
    return `tv:${tmdbId}:${season}:${episode}`;
  }

  get(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): StreamResponse | null {
    const key = this.generateKey(tmdbId, type, season, episode);
    const cached = this.cache.get<CacheEntry>(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() > cached.expiresAt) {
      this.cache.del(key);
      return null;
    }

    return cached.data;
  }

  set(
    tmdbId: string, 
    type: 'movie' | 'tv', 
    data: StreamResponse, 
    season?: number, 
    episode?: number
  ): void {
    const key = this.generateKey(tmdbId, type, season, episode);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (7200 * 1000) // 2 hours
    };

    this.cache.set(key, entry);
  }

  clear(): void {
    this.cache.flushAll();
  }

  getStats(): { keys: number; hits: number; misses: number } {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses
    };
  }

  deleteExpired(): void {
    this.cache.keys().forEach(key => {
      const cached = this.cache.get<CacheEntry>(key);
      if (cached && Date.now() > cached.expiresAt) {
        this.cache.del(key);
      }
    });
  }
}
