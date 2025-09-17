import Dexie, { Table } from 'dexie';

export interface Settings {
  id: string;
  pinSalt?: string;
  pinIterations?: number;
  pinHash?: string;
  lockTimeoutMinutes: number;
  dailyCueTime?: string; // "HH:MM" format
  dailyCueEnabled: boolean;
  notificationsEnabled: boolean;
  telemetryOptIn: boolean;
  telemetryAnonId?: string;
  telemetryActivationSent?: boolean;
  telemetryConsecutiveDays?: number;
  telemetryLastCompletionDate?: string; // YYYY-MM-DD
  telemetryD7EventSent?: boolean;
  swapUsedDate?: string; // YYYY-MM-DD
  lastPromptDate?: string; // YYYY-MM-DD
  lastPromptId?: string;
  installAt: string; // ISO date
  currentTheme: 'light' | 'dark' | 'system';
}

export interface Prompt {
  id: string;
  text: string;
  gratitude_prompt?: string;
  archived: boolean;
  created_at: string; // ISO date
  source: 'seed' | 'user';
}

export interface Entry {
  id: string;
  dateLocal: string; // YYYY-MM-DD
  prompt_id: string;
  setback: string;
  protective_step: string;
  gratitude: string;
  created_at: string; // ISO date
  edited_at?: string; // ISO date
  duration_seconds?: number;
}

export interface StreakSummary {
  id: string;
  start_date: string; // ISO date
  current_streak: number;
  longest_streak: number;
  last_entry_date?: string; // YYYY-MM-DD
}

export class JournalDB extends Dexie {
  settings!: Table<Settings, string>;
  prompts!: Table<Prompt, string>;
  entries!: Table<Entry, string>;
  streakSummary!: Table<StreakSummary, string>;

  constructor() {
    super('NegativeVizJournalDB');
    
    this.version(1).stores({
      settings: '&id, installAt, lastPromptDate, swapUsedDate',
      prompts: '&id, source, archived, created_at',
      entries: '&id, dateLocal, prompt_id, created_at, edited_at',
      streakSummary: '&id, start_date, last_entry_date',
    });
  }
}

export const db = new JournalDB();

// Database utility functions
// LocalStorage fallback when IndexedDB is not available
const localStorageDB = {
  async get(table: string, key?: string): Promise<any> {
    try {
      const data = localStorage.getItem(`nvj_${table}`)
      const parsed = data ? JSON.parse(data) : {}
      return key ? parsed[key] : Object.values(parsed)
    } catch {
      return key ? null : []
    }
  },

  async put(table: string, item: any): Promise<void> {
    try {
      const data = localStorage.getItem(`nvj_${table}`)
      const parsed = data ? JSON.parse(data) : {}
      parsed[item.id] = item
      localStorage.setItem(`nvj_${table}`, JSON.stringify(parsed))
    } catch (error) {
      throw new Error('Storage quota exceeded or localStorage unavailable')
    }
  },

  async delete(table: string, id: string): Promise<void> {
    try {
      const data = localStorage.getItem(`nvj_${table}`)
      const parsed = data ? JSON.parse(data) : {}
      delete parsed[id]
      localStorage.setItem(`nvj_${table}`, JSON.stringify(parsed))
    } catch (error) {
      throw new Error('localStorage unavailable')
    }
  },

  async count(table: string): Promise<number> {
    try {
      const data = localStorage.getItem(`nvj_${table}`)
      const parsed = data ? JSON.parse(data) : {}
      return Object.keys(parsed).length
    } catch {
      return 0
    }
  },

  async clear(table: string): Promise<void> {
    try {
      localStorage.removeItem(`nvj_${table}`)
    } catch {
      // Silent failure
    }
  }
}

// Check if IndexedDB is available
const isIndexedDBAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && indexedDB !== null
  } catch {
    return false
  }
}

export const dbUtils = {
  // Initialize default settings on first app launch
  async initializeSettings(): Promise<Settings> {
    const existingSettings = await db.settings.get('main');
    if (existingSettings) return existingSettings;

    const newSettings: Settings = {
      id: 'main',
      lockTimeoutMinutes: 5,
      dailyCueEnabled: false,
      notificationsEnabled: false,
      telemetryOptIn: false,
      installAt: new Date().toISOString(),
      currentTheme: 'system',
    };

    await db.settings.put(newSettings);
    return newSettings;
  },

  // Initialize default streak summary
  async initializeStreakSummary(): Promise<StreakSummary> {
    const existing = await db.streakSummary.get('main');
    if (existing) return existing;

    const newStreak: StreakSummary = {
      id: 'main',
      start_date: new Date().toISOString(),
      current_streak: 0,
      longest_streak: 0,
    };

    await db.streakSummary.put(newStreak);
    return newStreak;
  },

  // Get today's local date string
  getTodayLocal(): string {
    try {
      const now = new Date();
      // Handle timezone changes by using local time consistently
      const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      return localDate.getFullYear() + '-' + 
             String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
             String(localDate.getDate()).padStart(2, '0');
    } catch (error) {
      console.error('Error getting today\'s local date:', error);
      // Fallback to basic date string
      const now = new Date();
      return now.getFullYear() + '-' + 
             String(now.getMonth() + 1).padStart(2, '0') + '-' + 
             String(now.getDate()).padStart(2, '0');
    }
  },

  // Validate and recover streak data
  async validateAndRecoverStreakData(): Promise<{ isValid: boolean, recovered: boolean, streak: StreakSummary }> {
    try {
      const streak = await db.streakSummary.get('main');
      
      if (!streak) {
        // No streak data, create new
        const newStreak = await this.initializeStreakSummary();
        return { isValid: false, recovered: true, streak: newStreak };
      }

      // Validate streak data structure
      if (typeof streak.current_streak !== 'number' || 
          typeof streak.longest_streak !== 'number' ||
          streak.current_streak < 0 || 
          streak.longest_streak < 0 ||
          streak.current_streak > streak.longest_streak) {
        
        // Corrupted data, attempt recovery
        console.warn('Corrupted streak data detected, attempting recovery');
        
        const recoveredStreak: StreakSummary = {
          id: 'main',
          start_date: streak.start_date || new Date().toISOString(),
          current_streak: Math.max(0, Math.min(streak.current_streak || 0, streak.longest_streak || 0)),
          longest_streak: Math.max(0, streak.longest_streak || 0, streak.current_streak || 0),
          last_entry_date: streak.last_entry_date
        };

        await db.streakSummary.put(recoveredStreak);
        return { isValid: false, recovered: true, streak: recoveredStreak };
      }

      return { isValid: true, recovered: false, streak };
    } catch (error) {
      console.error('Error validating streak data:', error);
      // Complete failure, reinitialize
      const newStreak = await this.initializeStreakSummary();
      return { isValid: false, recovered: true, streak: newStreak };
    }
  },

  // Safely handle storage quota exceeded
  async handleStorageQuotaExceeded(): Promise<{ success: boolean, message: string }> {
    try {
      // Try to free up space by removing old entries beyond a reasonable limit
      const totalEntries = await db.entries.count();
      
      if (totalEntries > 1000) { // Keep last 1000 entries
        const oldEntries = await db.entries
          .orderBy('created_at')
          .limit(totalEntries - 1000)
          .toArray();
        
        if (oldEntries.length > 0) {
          await db.entries.bulkDelete(oldEntries.map(e => e.id));
          return { 
            success: true, 
            message: `Cleaned up ${oldEntries.length} old entries to free storage space.` 
          };
        }
      }

      return { 
        success: false, 
        message: 'Storage quota exceeded. Please free up space on your device.' 
      };
    } catch (error) {
      console.error('Error handling storage quota:', error);
      return { 
        success: false, 
        message: 'Unable to free up storage space automatically.' 
      };
    }
  },

  // Check if entry was created within last 24 hours for edit permission
  canEditEntry(entry: Entry): boolean {
    const now = new Date();
    const createdAt = new Date(entry.created_at);
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  },

  // Get entries for last N days
  async getRecentEntries(days: number = 7): Promise<Entry[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);
    
    const startDateLocal = startDate.getFullYear() + '-' + 
                          String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(startDate.getDate()).padStart(2, '0');

    return await db.entries
      .where('dateLocal')
      .between(startDateLocal, this.getTodayLocal(), true, true)
      .reverse()
      .sortBy('created_at');
  },

  // Update streak after new entry
  async updateStreak(entryDate: string): Promise<{ updated: boolean, isFirstToday: boolean, streakData: StreakSummary }> {
    const streak = await this.initializeStreakSummary();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayLocal = yesterday.getFullYear() + '-' + 
                          String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(yesterday.getDate()).padStart(2, '0');

    // Check if this is the first entry for this date
    const existingEntryToday = await db.entries
      .where('dateLocal')
      .equals(entryDate)
      .count();

    const isFirstToday = existingEntryToday === 1;

    if (!isFirstToday) {
      // Not the first entry today, don't update streak
      return { updated: false, isFirstToday: false, streakData: streak };
    }

    if (!streak.last_entry_date) {
      // First entry ever
      streak.current_streak = 1;
      streak.longest_streak = 1;
      streak.start_date = new Date().toISOString();
    } else if (streak.last_entry_date === yesterdayLocal) {
      // Consecutive day
      streak.current_streak += 1;
      streak.longest_streak = Math.max(streak.longest_streak, streak.current_streak);
    } else if (streak.last_entry_date !== entryDate) {
      // Gap in streak, reset
      streak.current_streak = 1;
      streak.start_date = new Date().toISOString();
    }
    // If last_entry_date === entryDate, it means we already counted today

    streak.last_entry_date = entryDate;
    await db.streakSummary.put(streak);
    
    return { updated: true, isFirstToday: true, streakData: streak };
  },

  // Get formatted streak start date
  getStreakStartDate(startDate: string): string {
    try {
      const date = new Date(startDate);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown';
    }
  },

  // Check if user has entry for today
  async hasEntryToday(): Promise<boolean> {
    const todayLocal = this.getTodayLocal();
    const count = await db.entries.where('dateLocal').equals(todayLocal).count();
    return count > 0;
  },

  // Safe reset of streak data with backup
  async resetStreakData(): Promise<boolean> {
    try {
      const currentStreak = await db.streakSummary.get('main');
      
      // Create backup in settings for recovery
      if (currentStreak) {
        const settings = await db.settings.get('main');
        if (settings) {
          await db.settings.put({
            ...settings,
            // Store backup in a way that doesn't interfere with schema
            lastPromptId: `backup_streak_${Date.now()}_${JSON.stringify(currentStreak)}`
          });
        }
      }

      // Reset streak
      const resetStreak: StreakSummary = {
        id: 'main',
        start_date: new Date().toISOString(),
        current_streak: 0,
        longest_streak: 0,
      };

      await db.streakSummary.put(resetStreak);
      return true;
    } catch (error) {
      console.error('Failed to reset streak data:', error);
      return false;
    }
  },

  // Completely wipe all data (for PIN reset or delete all)
  async wipeAllData(): Promise<void> {
    await db.transaction('rw', db.settings, db.prompts, db.entries, db.streakSummary, async () => {
      await db.settings.clear();
      await db.prompts.clear();
      await db.entries.clear();
      await db.streakSummary.clear();
    });
  },

  // Enhanced export with progress tracking
  async exportDataWithProgress(onProgress?: (progress: number, status: string) => void): Promise<{
    json: string;
    metadata: {
      appName: string;
      appVersion: string;
      exportedAt: string;
      entryCount: number;
    };
  }> {
    onProgress?.(0, 'Starting export...');
    
    const [settings, prompts, entries, streakSummary] = await Promise.all([
      db.settings.get('main'),
      db.prompts.toArray(),
      db.entries.orderBy('created_at').toArray(),
      db.streakSummary.get('main')
    ]);
    
    onProgress?.(30, 'Processing data...');

    // Sanitize settings - remove pin data for security
    const sanitizedSettings = settings ? {
      ...settings,
      pinSalt: undefined,
      pinIterations: undefined, 
      pinHash: undefined,
    } : null;

    onProgress?.(60, 'Formatting export...');

    // Create export data structure with proper metadata
    const metadata = {
      appName: 'Negative Visualization Journal',
      appVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      entryCount: entries.length
    };

    const exportData = {
      meta: metadata,
      entries: entries.map(entry => ({
        id: entry.id,
        createdAt: entry.created_at,
        content: {
          setback: entry.setback,
          protective_step: entry.protective_step,
          gratitude: entry.gratitude
        },
        metadata: {
          dateLocal: entry.dateLocal,
          prompt_id: entry.prompt_id,
          edited_at: entry.edited_at,
          duration_seconds: entry.duration_seconds
        }
      })),
      settings: sanitizedSettings,
      prompts: prompts.map(p => ({
        id: p.id,
        text: p.text,
        gratitude_prompt: p.gratitude_prompt,
        archived: p.archived,
        source: p.source,
        created_at: p.created_at
      })),
      streakSummary,
    };

    onProgress?.(90, 'Finalizing export...');
    
    const json = JSON.stringify(exportData, null, 2);
    
    onProgress?.(100, 'Export complete');
    
    return { json, metadata };
  },

  // Legacy export for backward compatibility
  async exportData(): Promise<string> {
    const result = await this.exportDataWithProgress();
    return result.json;
  },

  // Check if there are other tabs with the app open
  async checkForOtherTabs(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!('BroadcastChannel' in window)) {
        resolve(false);
        return;
      }

      const channel = new BroadcastChannel('nvj-tab-check');
      let responseReceived = false;
      
      const timeout = setTimeout(() => {
        channel.close();
        resolve(false);
      }, 1000);

      channel.onmessage = () => {
        if (!responseReceived) {
          responseReceived = true;
          clearTimeout(timeout);
          channel.close();
          resolve(true);
        }
      };

      // Send ping to other tabs
      channel.postMessage('ping');
    });
  },

  // Comprehensive data deletion with error handling
  async deleteAllData(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check for other tabs first
      const hasOtherTabs = await this.checkForOtherTabs();
      if (hasOtherTabs) {
        return {
          success: false,
          error: 'Please close all other tabs with this app open before deleting data.'
        };
      }

      // Clear IndexedDB
      await db.transaction('rw', db.settings, db.prompts, db.entries, db.streakSummary, async () => {
        await db.settings.clear();
        await db.prompts.clear();
        await db.entries.clear();
        await db.streakSummary.clear();
      });

      // Clear localStorage with nvj prefix
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('nvj_') || key.includes('negviz')) {
            localStorage.removeItem(key);
          }
        });
      }

      // Clear sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('nvj_') || key.includes('negviz')) {
            sessionStorage.removeItem(key);
          }
        });
      }

      // Clear any service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name.includes('negviz') || name.includes('journal'))
            .map(name => caches.delete(name))
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error during data deletion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during deletion'
      };
    }
  },

  // Generate filename for export
  generateExportFilename(): string {
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    return `negative-journal-export-${isoDate}.json`;
  },
};