// Feature: multimodal-content-viewer
// Performance optimization utilities with caching and lazy loading

import { MultimodalContent, QueryResponse } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  enableCompression?: boolean;
}

class PerformanceOptimizer {
  private responseCache = new Map<string, CacheEntry<QueryResponse>>();
  private imageCache = new Map<string, CacheEntry<string>>();
  private defaultCacheOptions: Required<CacheOptions> = {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    enableCompression: false
  };

  // Response caching
  cacheResponse(
    key: string, 
    response: QueryResponse, 
    options: CacheOptions = {}
  ): void {
    const opts = { ...this.defaultCacheOptions, ...options };
    const now = Date.now();
    
    const entry: CacheEntry<QueryResponse> = {
      data: response,
      timestamp: now,
      expiresAt: now + opts.ttl,
      accessCount: 0,
      lastAccessed: now
    };

    this.responseCache.set(key, entry);
    this.cleanupCache(this.responseCache, opts.maxSize);
  }

  getCachedResponse(key: string): QueryResponse | null {
    const entry = this.responseCache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > entry.expiresAt) {
      this.responseCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data;
  }

  // Generate cache key for queries
  generateQueryCacheKey(query: string, sessionId: string): string {
    // Create a hash-like key from query and session
    const normalizedQuery = query.toLowerCase().trim();
    const keyString = `${normalizedQuery}:${sessionId}`;
    
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `query_${Math.abs(hash).toString(36)}`;
  }

  // Image caching and lazy loading
  async loadImageWithCache(url: string): Promise<string> {
    // Check cache first
    const cached = this.getCachedImage(url);
    if (cached) {
      return cached;
    }

    try {
      // Load image and convert to data URL for caching
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }

      const blob = await response.blob();
      const dataUrl = await this.blobToDataUrl(blob);
      
      // Cache the data URL
      this.cacheImage(url, dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.warn('Failed to cache image:', url, error);
      return url; // Return original URL as fallback
    }
  }

  private getCachedImage(url: string): string | null {
    const entry = this.imageCache.get(url);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > entry.expiresAt) {
      this.imageCache.delete(url);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data;
  }

  private cacheImage(url: string, dataUrl: string): void {
    const now = Date.now();
    const ttl = 10 * 60 * 1000; // 10 minutes for images
    
    const entry: CacheEntry<string> = {
      data: dataUrl,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessed: now
    };

    this.imageCache.set(url, entry);
    this.cleanupCache(this.imageCache, 50); // Smaller cache for images
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Lazy loading utilities
  createIntersectionObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    const defaultOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };

    return new IntersectionObserver(callback, defaultOptions);
  }

  // Debounce utility for performance
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle utility for performance
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Memory management
  private cleanupCache<T>(cache: Map<string, CacheEntry<T>>, maxSize: number): void {
    if (cache.size <= maxSize) {
      return;
    }

    // Convert to array and sort by last accessed time (LRU)
    const entries = Array.from(cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    // Remove oldest entries
    const toRemove = entries.slice(0, cache.size - maxSize);
    toRemove.forEach(([key]) => cache.delete(key));
  }

  // Clear all caches
  clearAllCaches(): void {
    this.responseCache.clear();
    this.imageCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    const responseStats = this.getCacheStatsForMap(this.responseCache);
    const imageStats = this.getCacheStatsForMap(this.imageCache);

    return {
      responses: responseStats,
      images: imageStats,
      total: {
        entries: responseStats.entries + imageStats.entries,
        memoryUsage: responseStats.memoryUsage + imageStats.memoryUsage,
        hitRate: (responseStats.totalHits + imageStats.totalHits) / 
                 (responseStats.totalAccesses + imageStats.totalAccesses) || 0
      }
    };
  }

  private getCacheStatsForMap<T>(cache: Map<string, CacheEntry<T>>) {
    let totalHits = 0;
    let totalAccesses = 0;
    let memoryUsage = 0;

    cache.forEach((entry) => {
      totalHits += entry.accessCount;
      totalAccesses += entry.accessCount;
      
      // Rough memory usage estimation
      const dataSize = JSON.stringify(entry.data).length * 2; // UTF-16
      memoryUsage += dataSize;
    });

    return {
      entries: cache.size,
      totalHits,
      totalAccesses,
      hitRate: totalAccesses > 0 ? totalHits / totalAccesses : 0,
      memoryUsage
    };
  }

  // Preload critical resources
  async preloadCriticalResources(content: MultimodalContent): Promise<void> {
    const preloadPromises: Promise<any>[] = [];

    // Preload first few images
    if (content.images && content.images.length > 0) {
      const criticalImages = content.images.slice(0, 3); // First 3 images
      criticalImages.forEach(image => {
        const imageUrl = typeof image === 'string' ? image : image.url;
        preloadPromises.push(
          this.loadImageWithCache(imageUrl).catch(error => {
            console.warn('Failed to preload image:', imageUrl, error);
          })
        );
      });
    }

    // Wait for critical resources to load
    await Promise.allSettled(preloadPromises);
  }

  // Performance monitoring
  measurePerformance<T>(
    name: string,
    operation: () => T | Promise<T>
  ): T | Promise<T> {
    const startTime = performance.now();
    
    const result = operation();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const endTime = performance.now();
        console.log(`Performance [${name}]: ${(endTime - startTime).toFixed(2)}ms`);
      });
    } else {
      const endTime = performance.now();
      console.log(`Performance [${name}]: ${(endTime - startTime).toFixed(2)}ms`);
      return result;
    }
  }
}

// Create singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Export convenience functions
export const cacheResponse = (key: string, response: QueryResponse, options?: CacheOptions) =>
  performanceOptimizer.cacheResponse(key, response, options);

export const getCachedResponse = (key: string) =>
  performanceOptimizer.getCachedResponse(key);

export const generateQueryCacheKey = (query: string, sessionId: string) =>
  performanceOptimizer.generateQueryCacheKey(query, sessionId);

export const loadImageWithCache = (url: string) =>
  performanceOptimizer.loadImageWithCache(url);

export const createIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => performanceOptimizer.createIntersectionObserver(callback, options);

export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) =>
  performanceOptimizer.debounce(func, wait);

export const throttle = <T extends (...args: any[]) => any>(func: T, limit: number) =>
  performanceOptimizer.throttle(func, limit);

export const measurePerformance = <T>(name: string, operation: () => T | Promise<T>) =>
  performanceOptimizer.measurePerformance(name, operation);

export const preloadCriticalResources = (content: MultimodalContent) =>
  performanceOptimizer.preloadCriticalResources(content);

export const getCacheStats = () => performanceOptimizer.getCacheStats();

export const clearAllCaches = () => performanceOptimizer.clearAllCaches();