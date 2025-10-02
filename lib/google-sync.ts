/**
 * Google Workspace Sync Manager
 * Handles automatic synchronization of Gmail, Drive, and Calendar data
 */

export interface SyncStatus {
  gmail: {
    enabled: boolean;
    lastSync?: string;
    itemsSynced: number;
    status: 'idle' | 'syncing' | 'error';
    error?: string;
  };
  drive: {
    enabled: boolean;
    lastSync?: string;
    itemsSynced: number;
    status: 'idle' | 'syncing' | 'error';
    error?: string;
  };
  calendar: {
    enabled: boolean;
    lastSync?: string;
    itemsSynced: number;
    status: 'idle' | 'syncing' | 'error';
    error?: string;
  };
}

export interface SyncPreferences {
  gmail: {
    enabled: boolean;
    labels?: string[];
    frequency: number; // in minutes
  };
  drive: {
    enabled: boolean;
    folders?: string[];
    frequency: number;
  };
  calendar: {
    enabled: boolean;
    daysAhead: number;
    frequency: number;
  };
}

export class GoogleSyncManager {
  private userId: string;
  private syncStatus: SyncStatus;
  private syncPreferences: SyncPreferences;
  private syncIntervals: {
    gmail?: NodeJS.Timeout;
    drive?: NodeJS.Timeout;
    calendar?: NodeJS.Timeout;
  };

  constructor(userId: string) {
    this.userId = userId;
    this.syncStatus = {
      gmail: { enabled: false, itemsSynced: 0, status: 'idle' },
      drive: { enabled: false, itemsSynced: 0, status: 'idle' },
      calendar: { enabled: false, itemsSynced: 0, status: 'idle' }
    };
    this.syncPreferences = {
      gmail: { enabled: false, frequency: 15 },
      drive: { enabled: false, frequency: 30 },
      calendar: { enabled: false, daysAhead: 30, frequency: 60 }
    };
    this.syncIntervals = {};
  }

  /**
   * Initialize sync manager with user preferences
   */
  async initialize(preferences?: SyncPreferences): Promise<void> {
    if (preferences) {
      this.syncPreferences = preferences;
    }

    // Start sync intervals based on preferences
    if (this.syncPreferences.gmail.enabled) {
      this.startGmailSync();
    }
    if (this.syncPreferences.drive.enabled) {
      this.startDriveSync();
    }
    if (this.syncPreferences.calendar.enabled) {
      this.startCalendarSync();
    }
  }

  /**
   * Sync Gmail emails to knowledge base
   */
  async syncGmailLabels(labelIds?: string[]): Promise<void> {
    this.syncStatus.gmail.status = 'syncing';

    try {
      const labels = labelIds || this.syncPreferences.gmail.labels || ['INBOX'];
      let totalSynced = 0;

      for (const labelId of labels) {
        const response = await fetch('/api/google/gmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_recent',
            userId: this.userId,
            maxResults: 10,
            labelId
          })
        });

        const data = await response.json();
        if (data.success) {
          totalSynced += data.messagesFound || 0;
        }
      }

      this.syncStatus.gmail = {
        enabled: true,
        lastSync: new Date().toISOString(),
        itemsSynced: totalSynced,
        status: 'idle'
      };
    } catch (error: any) {
      this.syncStatus.gmail = {
        enabled: true,
        itemsSynced: 0,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Sync Drive folders to knowledge base
   */
  async syncDriveFolders(folderIds?: string[]): Promise<void> {
    this.syncStatus.drive.status = 'syncing';

    try {
      const folders = folderIds || this.syncPreferences.drive.folders || [];
      let totalSynced = 0;

      if (folders.length === 0) {
        // Sync recent files from root
        const response = await fetch('/api/google/drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'search',
            query: '',
            userId: this.userId
          })
        });

        const data = await response.json();
        if (data.success) {
          totalSynced = data.filesProcessed || 0;
        }
      } else {
        // Sync specific folders
        for (const folderId of folders) {
          const response = await fetch('/api/google/drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'search',
              query: '',
              userId: this.userId,
              projectId: folderId
            })
          });

          const data = await response.json();
          if (data.success) {
            totalSynced += data.filesProcessed || 0;
          }
        }
      }

      this.syncStatus.drive = {
        enabled: true,
        lastSync: new Date().toISOString(),
        itemsSynced: totalSynced,
        status: 'idle'
      };
    } catch (error: any) {
      this.syncStatus.drive = {
        enabled: true,
        itemsSynced: 0,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Sync calendar events to knowledge base
   */
  async syncCalendarEvents(calendarId: string = 'primary'): Promise<void> {
    this.syncStatus.calendar.status = 'syncing';

    try {
      const daysAhead = this.syncPreferences.calendar.daysAhead || 30;
      const start = new Date();
      const end = new Date(start.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const response = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_to_knowledge',
          userId: this.userId,
          timeRange: {
            start: start.toISOString(),
            end: end.toISOString()
          }
        })
      });

      const data = await response.json();

      this.syncStatus.calendar = {
        enabled: true,
        lastSync: new Date().toISOString(),
        itemsSynced: data.syncedEvents || 0,
        status: 'idle'
      };
    } catch (error: any) {
      this.syncStatus.calendar = {
        enabled: true,
        itemsSynced: 0,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Start automatic Gmail sync
   */
  private startGmailSync(): void {
    const frequency = this.syncPreferences.gmail.frequency * 60 * 1000;

    // Initial sync
    this.syncGmailLabels();

    // Set up interval
    this.syncIntervals.gmail = setInterval(() => {
      this.syncGmailLabels();
    }, frequency);
  }

  /**
   * Start automatic Drive sync
   */
  private startDriveSync(): void {
    const frequency = this.syncPreferences.drive.frequency * 60 * 1000;

    // Initial sync
    this.syncDriveFolders();

    // Set up interval
    this.syncIntervals.drive = setInterval(() => {
      this.syncDriveFolders();
    }, frequency);
  }

  /**
   * Start automatic Calendar sync
   */
  private startCalendarSync(): void {
    const frequency = this.syncPreferences.calendar.frequency * 60 * 1000;

    // Initial sync
    this.syncCalendarEvents();

    // Set up interval
    this.syncIntervals.calendar = setInterval(() => {
      this.syncCalendarEvents();
    }, frequency);
  }

  /**
   * Stop all syncing
   */
  stopAllSync(): void {
    if (this.syncIntervals.gmail) {
      clearInterval(this.syncIntervals.gmail);
      this.syncIntervals.gmail = undefined;
    }
    if (this.syncIntervals.drive) {
      clearInterval(this.syncIntervals.drive);
      this.syncIntervals.drive = undefined;
    }
    if (this.syncIntervals.calendar) {
      clearInterval(this.syncIntervals.calendar);
      this.syncIntervals.calendar = undefined;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Update sync preferences
   */
  updatePreferences(preferences: Partial<SyncPreferences>): void {
    this.syncPreferences = {
      ...this.syncPreferences,
      ...preferences
    };

    // Restart sync intervals with new preferences
    this.stopAllSync();
    this.initialize(this.syncPreferences);
  }

  /**
   * Manually trigger sync for all services
   */
  async syncAll(): Promise<void> {
    const promises = [];

    if (this.syncPreferences.gmail.enabled) {
      promises.push(this.syncGmailLabels());
    }
    if (this.syncPreferences.drive.enabled) {
      promises.push(this.syncDriveFolders());
    }
    if (this.syncPreferences.calendar.enabled) {
      promises.push(this.syncCalendarEvents());
    }

    await Promise.all(promises);
  }
}

/**
 * Create a new sync manager instance
 */
export function createSyncManager(userId: string): GoogleSyncManager {
  return new GoogleSyncManager(userId);
}

/**
 * Load sync preferences from storage
 */
export async function loadSyncPreferences(userId: string): Promise<SyncPreferences | null> {
  try {
    const stored = localStorage.getItem(`sync_preferences_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load sync preferences:', error);
  }
  return null;
}

/**
 * Save sync preferences to storage
 */
export function saveSyncPreferences(userId: string, preferences: SyncPreferences): void {
  try {
    localStorage.setItem(`sync_preferences_${userId}`, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save sync preferences:', error);
  }
}
