/**
 * MCP Resource Fetcher
 *
 * High-level interface for discovering and accessing resources
 * across all connected MCP servers. Provides intelligent routing,
 * caching, and error handling for resource operations.
 *
 * @module lib/mcp/mcp-resource-fetcher
 * @version 1.0.0
 */

import { getMCPServerManager } from './mcp-server-manager';
import { activityStream } from '../activity-stream';
import type {
  ResourceAccessRequest,
  ResourceAccessResult,
  ResourceDiscoveryResult,
} from './types';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Resource Fetcher Configuration
 */
export interface ResourceFetcherConfig {
  /** Enable caching of resource content (default: true) */
  enableCaching?: boolean;

  /** Cache TTL in milliseconds (default: 10 minutes) */
  cacheTTL?: number;

  /** Maximum cache size in MB (default: 50) */
  maxCacheSize?: number;

  /** Broadcast activity to activity stream (default: true) */
  broadcastActivity?: boolean;
}

/**
 * Cached resource
 */
interface CachedResource {
  result: ResourceAccessResult;
  cachedAt: Date;
  expiresAt: Date;
  sizeBytes: number;
}

/**
 * MCP Resource Fetcher
 * Manages resource discovery and access across all MCP servers
 */
export class MCPResourceFetcher {
  private config: Required<ResourceFetcherConfig>;
  private resourceCache: Map<string, CachedResource> = new Map();
  private totalCacheSizeBytes: number = 0;

  constructor(config: ResourceFetcherConfig = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      cacheTTL: config.cacheTTL ?? 10 * 60 * 1000, // 10 minutes
      maxCacheSize: config.maxCacheSize ?? 50, // 50 MB
      broadcastActivity: config.broadcastActivity ?? true,
    };
  }

  /**
   * Discover all available resources across all connected servers
   */
  async discoverResources(): Promise<ResourceDiscoveryResult[]> {
    const manager = getMCPServerManager();
    const connectedServers = manager.getConnectedServers();

    const results: ResourceDiscoveryResult[] = [];

    for (const server of connectedServers) {
      if (server.availableResources && server.availableResources.length > 0) {
        results.push({
          serverId: server.id,
          serverName: server.config.name,
          resources: server.availableResources,
        });
      }
    }

    // Broadcast discovery activity
    if (this.config.broadcastActivity) {
      const totalResources = results.reduce(
        (sum, result) => sum + result.resources.length,
        0
      );

      activityStream.broadcast({
        agent: 'MCP Resource Fetcher',
        category: 'system',
        level: 'info',
        message: `Discovered ${totalResources} resources across ${results.length} MCP servers`,
        metadata: {
          serversWithResources: results.length,
          totalResources,
        },
      });
    }

    return results;
  }

  /**
   * Get all available resources as a flat array
   */
  async getAllResources(): Promise<Resource[]> {
    const discoveryResults = await this.discoverResources();
    return discoveryResults.flatMap((result) => result.resources);
  }

  /**
   * Find a resource by URI across all servers
   * Returns the server ID where the resource is available
   */
  async findResource(uri: string): Promise<{
    serverId: string;
    serverName: string;
    resource: Resource;
  } | null> {
    const manager = getMCPServerManager();
    const connectedServers = manager.getConnectedServers();

    for (const server of connectedServers) {
      if (server.availableResources) {
        const resource = server.availableResources.find((r) => r.uri === uri);
        if (resource) {
          return {
            serverId: server.id,
            serverName: server.config.name,
            resource,
          };
        }
      }
    }

    return null;
  }

  /**
   * Find all servers that provide a specific resource
   */
  async findAllServersWithResource(uri: string): Promise<
    Array<{
      serverId: string;
      serverName: string;
      resource: Resource;
    }>
  > {
    const manager = getMCPServerManager();
    const connectedServers = manager.getConnectedServers();

    const results: Array<{
      serverId: string;
      serverName: string;
      resource: Resource;
    }> = [];

    for (const server of connectedServers) {
      if (server.availableResources) {
        const resource = server.availableResources.find((r) => r.uri === uri);
        if (resource) {
          results.push({
            serverId: server.id,
            serverName: server.config.name,
            resource,
          });
        }
      }
    }

    return results;
  }

  /**
   * Access a resource with automatic server discovery
   * If serverId is not specified, will find the first server that provides the resource
   */
  async accessResource(
    request: Omit<ResourceAccessRequest, 'serverId'> & { serverId?: string }
  ): Promise<ResourceAccessResult> {
    let serverId = request.serverId;

    // Find server if not specified
    if (!serverId) {
      const resourceLocation = await this.findResource(request.uri);
      if (!resourceLocation) {
        const error: ResourceAccessResult = {
          success: false,
          serverId: 'unknown',
          uri: request.uri,
          error: `Resource '${request.uri}' not found on any connected server`,
          errorCode: 'RESOURCE_NOT_FOUND',
          timestamp: new Date(),
        };

        // Broadcast error
        if (this.config.broadcastActivity) {
          activityStream.broadcast({
            agent: 'MCP Resource Fetcher',
            category: 'system',
            level: 'error',
            message: `Resource not found: ${request.uri}`,
            metadata: {
              uri: request.uri,
            },
          });
        }

        return error;
      }

      serverId = resourceLocation.serverId;
    }

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.getCachedResource(serverId, request.uri);
      if (cached) {
        return cached;
      }
    }

    // Broadcast access start
    if (this.config.broadcastActivity) {
      activityStream.broadcast({
        agent: 'MCP Resource Fetcher',
        category: 'task_processing',
        level: 'info',
        message: `Accessing MCP resource: ${request.uri}`,
        metadata: {
          uri: request.uri,
          serverId,
        },
      });
    }

    // Access resource
    const manager = getMCPServerManager();
    const result = await manager.accessResource({
      ...request,
      serverId,
    } as ResourceAccessRequest);

    // Cache successful results
    if (this.config.enableCaching && result.success) {
      this.cacheResource(serverId, request.uri, result);
    }

    // Broadcast result
    if (this.config.broadcastActivity) {
      activityStream.broadcast({
        agent: 'MCP Resource Fetcher',
        category: 'task_processing',
        level: result.success ? 'info' : 'error',
        message: result.success
          ? `Resource access completed: ${request.uri}`
          : `Resource access failed: ${request.uri}`,
        metadata: {
          uri: request.uri,
          serverId,
          success: result.success,
          error: result.error,
        },
      });
    }

    return result;
  }

  /**
   * Access multiple resources in parallel
   */
  async accessResourcesBatch(
    requests: Array<Omit<ResourceAccessRequest, 'serverId'> & { serverId?: string }>
  ): Promise<ResourceAccessResult[]> {
    const promises = requests.map((request) => this.accessResource(request));
    return Promise.all(promises);
  }

  /**
   * Get resources by MIME type
   */
  async getResourcesByMimeType(mimeType: string): Promise<Resource[]> {
    const allResources = await this.getAllResources();

    return allResources.filter((resource) =>
      resource.mimeType?.toLowerCase().includes(mimeType.toLowerCase())
    );
  }

  /**
   * Get resources from a specific server
   */
  async getResourcesFromServer(serverId: string): Promise<Resource[]> {
    const manager = getMCPServerManager();
    const server = manager.getServer(serverId);

    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return server.availableResources || [];
  }

  /**
   * Search resources by keyword in name or description
   */
  async searchResources(keyword: string): Promise<Resource[]> {
    const allResources = await this.getAllResources();
    const lowerKeyword = keyword.toLowerCase();

    return allResources.filter(
      (resource) =>
        resource.name?.toLowerCase().includes(lowerKeyword) ||
        resource.description?.toLowerCase().includes(lowerKeyword) ||
        resource.uri.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Get resources by URI pattern (supports wildcards)
   */
  async getResourcesByPattern(pattern: string): Promise<Resource[]> {
    const allResources = await this.getAllResources();
    const regex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
      'i'
    );

    return allResources.filter((resource) => regex.test(resource.uri));
  }

  /**
   * Get cache key for a resource
   * @private
   */
  private getCacheKey(serverId: string, uri: string): string {
    return `${serverId}:${uri}`;
  }

  /**
   * Get cached resource if available and not expired
   * @private
   */
  private getCachedResource(
    serverId: string,
    uri: string
  ): ResourceAccessResult | null {
    const key = this.getCacheKey(serverId, uri);
    const cached = this.resourceCache.get(key);

    if (!cached) return null;

    // Check if expired
    if (cached.expiresAt < new Date()) {
      this.evictCacheEntry(key);
      return null;
    }

    console.log(`📦 Cache hit for resource: ${uri}`);
    return cached.result;
  }

  /**
   * Cache a resource result
   * @private
   */
  private cacheResource(
    serverId: string,
    uri: string,
    result: ResourceAccessResult
  ): void {
    const key = this.getCacheKey(serverId, uri);
    const now = new Date();

    // Estimate content size
    const contentSize = this.estimateContentSize(result.content);

    // Check if adding this would exceed cache size limit
    const maxCacheSizeBytes = this.config.maxCacheSize * 1024 * 1024; // Convert MB to bytes
    if (this.totalCacheSizeBytes + contentSize > maxCacheSizeBytes) {
      // Evict oldest entries until there's space
      this.evictOldestEntries(contentSize);
    }

    this.resourceCache.set(key, {
      result,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + this.config.cacheTTL),
      sizeBytes: contentSize,
    });

    this.totalCacheSizeBytes += contentSize;
  }

  /**
   * Estimate content size in bytes
   * @private
   */
  private estimateContentSize(content: any): number {
    if (!content) return 0;

    if (typeof content === 'string') {
      return content.length * 2; // UTF-16 encoding
    }

    if (typeof content === 'object') {
      return JSON.stringify(content).length * 2;
    }

    return 1024; // Default 1KB for unknown types
  }

  /**
   * Evict a cache entry
   * @private
   */
  private evictCacheEntry(key: string): void {
    const cached = this.resourceCache.get(key);
    if (cached) {
      this.totalCacheSizeBytes -= cached.sizeBytes;
      this.resourceCache.delete(key);
    }
  }

  /**
   * Evict oldest cache entries to free up space
   * @private
   */
  private evictOldestEntries(requiredSpace: number): void {
    const entries = Array.from(this.resourceCache.entries()).sort(
      ([, a], [, b]) => a.cachedAt.getTime() - b.cachedAt.getTime()
    );

    let freedSpace = 0;
    for (const [key, cached] of entries) {
      this.evictCacheEntry(key);
      freedSpace += cached.sizeBytes;

      if (freedSpace >= requiredSpace) {
        break;
      }
    }

    console.log(`🧹 Evicted cache entries to free ${freedSpace} bytes`);
  }

  /**
   * Clear cache for a specific resource or all resources
   */
  clearCache(uri?: string): void {
    if (uri) {
      // Clear cache for specific resource
      for (const [key] of this.resourceCache) {
        if (key.endsWith(`:${uri}`)) {
          this.evictCacheEntry(key);
        }
      }
    } else {
      // Clear all cache
      this.resourceCache.clear();
      this.totalCacheSizeBytes = 0;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    totalSizeMB: number;
    maxSizeMB: number;
    utilizationPercent: number;
  } {
    const now = new Date();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const cached of this.resourceCache.values()) {
      if (cached.expiresAt >= now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    const totalSizeMB = this.totalCacheSizeBytes / (1024 * 1024);
    const maxSizeMB = this.config.maxCacheSize;

    return {
      totalEntries: this.resourceCache.size,
      validEntries,
      expiredEntries,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      maxSizeMB,
      utilizationPercent:
        Math.round((totalSizeMB / maxSizeMB) * 100 * 100) / 100,
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanExpiredCache(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.resourceCache) {
      if (cached.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.evictCacheEntry(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Prefetch resources by URI patterns
   * Useful for preloading frequently accessed resources
   */
  async prefetchResources(patterns: string[]): Promise<void> {
    const resources: Resource[] = [];

    for (const pattern of patterns) {
      const matchedResources = await this.getResourcesByPattern(pattern);
      resources.push(...matchedResources);
    }

    console.log(`🔄 Prefetching ${resources.length} resources...`);

    const promises = resources.map((resource) =>
      this.accessResource({ uri: resource.uri }).catch((error) => {
        console.error(`Failed to prefetch ${resource.uri}:`, error);
      })
    );

    await Promise.all(promises);

    console.log(`✅ Prefetch completed`);
  }

  /**
   * Get resource access statistics
   */
  async getAccessStats(): Promise<{
    totalAccesses: number;
    successfulAccesses: number;
    failedAccesses: number;
    cacheHitRate: number;
  }> {
    // This would need to be tracked over time
    // For now, return cache stats as a proxy
    const stats = this.getCacheStats();

    return {
      totalAccesses: stats.totalEntries,
      successfulAccesses: stats.validEntries,
      failedAccesses: stats.expiredEntries,
      cacheHitRate:
        stats.totalEntries > 0
          ? (stats.validEntries / stats.totalEntries) * 100
          : 0,
    };
  }
}

/**
 * Create a new resource fetcher instance
 */
export function createResourceFetcher(
  config?: ResourceFetcherConfig
): MCPResourceFetcher {
  return new MCPResourceFetcher(config);
}

/**
 * Global resource fetcher instance (singleton pattern)
 */
let globalFetcher: MCPResourceFetcher | null = null;

/**
 * Get the global resource fetcher instance
 */
export function getResourceFetcher(): MCPResourceFetcher {
  if (!globalFetcher) {
    globalFetcher = new MCPResourceFetcher();
  }
  return globalFetcher;
}

/**
 * Helper function to quickly access a resource
 */
export async function accessResource(
  uri: string,
  options?: {
    serverId?: string;
    parameters?: Record<string, any>;
    userId?: string;
  }
): Promise<ResourceAccessResult> {
  const fetcher = getResourceFetcher();
  return fetcher.accessResource({
    uri,
    serverId: options?.serverId,
    parameters: options?.parameters,
    userId: options?.userId,
  });
}

/**
 * Helper function to discover all available resources
 */
export async function discoverResources(): Promise<ResourceDiscoveryResult[]> {
  const fetcher = getResourceFetcher();
  return fetcher.discoverResources();
}

/**
 * Helper function to search resources by keyword
 */
export async function searchResources(keyword: string): Promise<Resource[]> {
  const fetcher = getResourceFetcher();
  return fetcher.searchResources(keyword);
}
