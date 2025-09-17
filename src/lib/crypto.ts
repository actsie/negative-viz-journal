// PIN hashing and security utilities using Web Crypto API

export interface PinHashData {
  salt: string; // base64 encoded
  iterations: number;
  hash: string; // base64 encoded
}

export const cryptoUtils = {
  // Generate a cryptographically secure random salt
  generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  },

  // Convert ArrayBuffer to base64 string
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  // Convert base64 string to ArrayBuffer
  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  // Hash a PIN using PBKDF2 with Web Crypto API
  async hashPin(pin: string): Promise<PinHashData> {
    const encoder = new TextEncoder();
    const salt = this.generateSalt();
    const iterations = 100000; // 100k iterations for security

    try {
      // Import the PIN as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(pin),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Derive key using PBKDF2
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt.buffer as ArrayBuffer,
          iterations: iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        256 // 256 bits = 32 bytes
      );

      return {
        salt: this.arrayBufferToBase64(salt.buffer as ArrayBuffer),
        iterations,
        hash: this.arrayBufferToBase64(derivedBits)
      };
    } catch (error) {
      console.error('PIN hashing failed:', error);
      throw new Error('Failed to hash PIN');
    }
  },

  // Verify a PIN against stored hash data
  async verifyPin(pin: string, hashData: PinHashData): Promise<boolean> {
    const encoder = new TextEncoder();
    
    try {
      const saltBuffer = this.base64ToArrayBuffer(hashData.salt);
      
      // Import the PIN as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(pin),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Derive key using same parameters
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: hashData.iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      const newHash = this.arrayBufferToBase64(derivedBits);
      
      // Constant-time comparison to prevent timing attacks
      return this.constantTimeEquals(newHash, hashData.hash);
    } catch (error) {
      console.error('PIN verification failed:', error);
      return false;
    }
  },

  // Constant-time string comparison
  constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  },

  // Validate PIN format (4 digits)
  isValidPin(pin: string): boolean {
    return /^\d{4}$/.test(pin);
  },

  // Generate a secure random ID
  generateId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },
};

// Session lock utilities
export const sessionUtils = {
  // Track last activity time
  updateLastActivity(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nvj_lastActivity', Date.now().toString());
    }
  },

  // Check if session should be locked based on inactivity
  shouldLock(timeoutMinutes: number): boolean {
    if (typeof window === 'undefined') return false;
    
    const lastActivity = localStorage.getItem('nvj_lastActivity');
    if (!lastActivity) return true;

    const now = Date.now();
    const lastActivityTime = parseInt(lastActivity, 10);
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    return (now - lastActivityTime) > timeoutMs;
  },

  // Clear session data on lock
  lockSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nvj_lastActivity');
      localStorage.setItem('nvj_sessionLocked', 'true');
    }
  },

  // Unlock session
  unlockSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nvj_sessionLocked');
      this.updateLastActivity();
    }
  },

  // Check if session is currently locked
  isLocked(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('nvj_sessionLocked') === 'true';
  },

  // Clear all PIN-related data on reset
  clearPinData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nvj_lastActivity');
      localStorage.removeItem('nvj_sessionLocked');
      localStorage.removeItem('nvj_pinAttempts');
      localStorage.removeItem('nvj_pinLockoutEnd');
    }
  },

  // Initialize activity tracking
  initActivityTracking(timeoutMinutes: number, onLock: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    let timeoutId: NodeJS.Timeout | null = null;
    
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      this.updateLastActivity();
      timeoutId = setTimeout(() => {
        this.lockSession();
        onLock();
      }, timeoutMinutes * 60 * 1000);
    };

    const handleActivity = () => {
      resetTimer();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.lockSession();
        onLock();
      } else {
        resetTimer();
      }
    };

    // Set up event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the timer
    resetTimer();

    // Return cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  },
};