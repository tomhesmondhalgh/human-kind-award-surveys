
/**
 * Storage utilities for detecting and handling browser storage access issues
 * Provides fallback mechanisms when localStorage is blocked by tracking prevention
 */

export interface StorageCapabilities {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  cookies: boolean;
}

/**
 * Test if localStorage is accessible and writable
 */
export function testLocalStorage(): boolean {
  try {
    const testKey = '__supabase_test_' + Date.now();
    localStorage.setItem(testKey, 'test');
    const result = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return result === 'test';
  } catch (error) {
    console.warn('🚫 localStorage not accessible:', error);
    return false;
  }
}

/**
 * Test if sessionStorage is accessible and writable
 */
export function testSessionStorage(): boolean {
  try {
    const testKey = '__supabase_test_' + Date.now();
    sessionStorage.setItem(testKey, 'test');
    const result = sessionStorage.getItem(testKey);
    sessionStorage.removeItem(testKey);
    return result === 'test';
  } catch (error) {
    console.warn('🚫 sessionStorage not accessible:', error);
    return false;
  }
}

/**
 * Test if IndexedDB is accessible
 */
export function testIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch (error) {
    console.warn('🚫 IndexedDB not accessible:', error);
    return false;
  }
}

/**
 * Test if cookies are accessible
 */
export function testCookies(): boolean {
  try {
    document.cookie = '__test_cookie=test; path=/; SameSite=Lax';
    const result = document.cookie.includes('__test_cookie=test');
    // Clean up test cookie
    document.cookie = '__test_cookie=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
    return result;
  } catch (error) {
    console.warn('🚫 Cookies not accessible:', error);
    return false;
  }
}

/**
 * Comprehensive storage capability detection
 */
export function detectStorageCapabilities(): StorageCapabilities {
  console.log('🔍 Detecting storage capabilities...');
  
  const capabilities = {
    localStorage: testLocalStorage(),
    sessionStorage: testSessionStorage(),
    indexedDB: testIndexedDB(),
    cookies: testCookies()
  };

  console.log('📊 Storage capabilities:', capabilities);
  
  return capabilities;
}

/**
 * Get the best available storage mechanism
 */
export function getBestStorage(): 'localStorage' | 'sessionStorage' | 'none' {
  const capabilities = detectStorageCapabilities();
  
  if (capabilities.localStorage) {
    console.log('✅ Using localStorage for auth storage');
    return 'localStorage';
  }
  
  if (capabilities.sessionStorage) {
    console.log('⚠️ Falling back to sessionStorage for auth storage');
    return 'sessionStorage';
  }
  
  console.warn('❌ No storage available - auth persistence disabled');
  return 'none';
}

/**
 * Storage-aware get item function
 */
export function getStorageItem(key: string): string | null {
  const storageType = getBestStorage();
  
  try {
    switch (storageType) {
      case 'localStorage':
        return localStorage.getItem(key);
      case 'sessionStorage':
        return sessionStorage.getItem(key);
      case 'none':
        return null;
      default:
        return null;
    }
  } catch (error) {
    console.warn(`🚫 Failed to get storage item ${key}:`, error);
    return null;
  }
}

/**
 * Storage-aware set item function
 */
export function setStorageItem(key: string, value: string): boolean {
  const storageType = getBestStorage();
  
  try {
    switch (storageType) {
      case 'localStorage':
        localStorage.setItem(key, value);
        return true;
      case 'sessionStorage':
        sessionStorage.setItem(key, value);
        return true;
      case 'none':
        return false;
      default:
        return false;
    }
  } catch (error) {
    console.warn(`🚫 Failed to set storage item ${key}:`, error);
    return false;
  }
}

/**
 * Storage-aware remove item function
 */
export function removeStorageItem(key: string): boolean {
  const storageType = getBestStorage();
  
  try {
    switch (storageType) {
      case 'localStorage':
        localStorage.removeItem(key);
        return true;
      case 'sessionStorage':
        sessionStorage.removeItem(key);
        return true;
      case 'none':
        return false;
      default:
        return false;
    }
  } catch (error) {
    console.warn(`🚫 Failed to remove storage item ${key}:`, error);
    return false;
  }
}

/**
 * Clean up auth storage items across all available storage mechanisms
 */
export function cleanupAllAuthStorage(): void {
  console.log('🧹 Cleaning up auth storage across all mechanisms...');
  
  const authKeys = [
    'supabase.auth.token',
    'sb-bagaaqkmewkuwtudwnqw-auth-token'
  ];

  // Try localStorage
  try {
    authKeys.forEach(key => localStorage.removeItem(key));
    // Remove all Supabase auth keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('⚠️ Could not clean localStorage:', error);
  }

  // Try sessionStorage
  try {
    authKeys.forEach(key => sessionStorage.removeItem(key));
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('⚠️ Could not clean sessionStorage:', error);
  }

  console.log('✅ Auth storage cleanup completed');
}
