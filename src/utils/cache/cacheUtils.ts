
/**
 * Utility functions for caching data in memory and local storage
 * with automatic expiration and type safety
 */

type CachedItem<T> = {
  value: T;
  timestamp: number;
  expiresAt: number;
};

// In-memory cache for application state
export const memoryCache: Record<string, CachedItem<any>> = {};

/**
 * Set an item in the memory cache with expiration
 */
export function setCacheItem<T>(key: string, value: T, ttlSeconds = 300): void {
  const now = Date.now();
  memoryCache[key] = {
    value,
    timestamp: now,
    expiresAt: now + (ttlSeconds * 1000)
  };
  console.log(`Cache: Item set with key ${key}, expires in ${ttlSeconds}s`);
}

/**
 * Get an item from the memory cache
 * Returns null if item doesn't exist or has expired
 */
export function getCacheItem<T>(key: string): T | null {
  const item = memoryCache[key];
  
  if (!item) {
    console.log(`Cache: Miss for key ${key} - not in cache`);
    return null;
  }
  
  const now = Date.now();
  if (now > item.expiresAt) {
    console.log(`Cache: Miss for key ${key} - expired`);
    delete memoryCache[key]; // Clean up expired items
    return null;
  }
  
  console.log(`Cache: Hit for key ${key}, age: ${Math.round((now - item.timestamp)/1000)}s`);
  return item.value as T;
}

/**
 * Clear a specific item from the memory cache
 */
export function clearCacheItem(key: string): void {
  if (memoryCache[key]) {
    delete memoryCache[key];
    console.log(`Cache: Cleared item with key ${key}`);
  }
}

/**
 * Clear all items from the memory cache or items with a specific prefix
 */
export function clearCache(prefix?: string): void {
  if (prefix) {
    Object.keys(memoryCache).forEach(key => {
      if (key.startsWith(prefix)) {
        delete memoryCache[key];
      }
    });
    console.log(`Cache: Cleared all items with prefix ${prefix}`);
  } else {
    Object.keys(memoryCache).forEach(key => {
      delete memoryCache[key];
    });
    console.log('Cache: Cleared all items');
  }
}

/**
 * Store cache in localStorage with automatic expiration
 */
export function setLocalStorageCache<T>(key: string, value: T, ttlSeconds = 3600): void {
  try {
    const now = Date.now();
    const item: CachedItem<T> = {
      value,
      timestamp: now,
      expiresAt: now + (ttlSeconds * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
    console.log(`LocalStorage: Item set with key ${key}, expires in ${ttlSeconds}s`);
  } catch (error) {
    console.error('Error setting localStorage cache:', error);
  }
}

/**
 * Get an item from localStorage cache
 * Returns null if item doesn't exist, has expired, or there's an error
 */
export function getLocalStorageCache<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      console.log(`LocalStorage: Miss for key ${key} - not in cache`);
      return null;
    }
    
    const item: CachedItem<T> = JSON.parse(itemStr);
    const now = Date.now();
    
    if (now > item.expiresAt) {
      console.log(`LocalStorage: Miss for key ${key} - expired`);
      localStorage.removeItem(key);
      return null;
    }
    
    console.log(`LocalStorage: Hit for key ${key}, age: ${Math.round((now - item.timestamp)/1000)}s`);
    return item.value;
  } catch (error) {
    console.error('Error getting localStorage cache:', error);
    return null;
  }
}

/**
 * Clear a specific item from localStorage cache
 */
export function clearLocalStorageItem(key: string): void {
  localStorage.removeItem(key);
  console.log(`LocalStorage: Cleared item with key ${key}`);
}

/**
 * Clear all items from localStorage cache or items with a specific prefix
 */
export function clearLocalStorageCache(prefix?: string): void {
  if (prefix) {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`LocalStorage: Cleared ${keysToRemove.length} items with prefix ${prefix}`);
  } else {
    localStorage.clear();
    console.log('LocalStorage: Cleared all items');
  }
}
