import { db } from './database'

// Telemetry data models
export interface TelemetryEvent {
  id: string
  eventType: 'activation' | 'daily_completion' | 'd7_completion'
  timestamp: string // ISO string
  anonId: string
  appVersion: string
  platform: string
  timezone: string
  dayNumber?: number // Days since installation (for daily_completion)
  retryCount?: number
  queuedAt: string // ISO string when event was queued
}

export interface TelemetrySettings {
  isOptedIn: boolean
  anonId?: string
  activationSent: boolean
  consecutiveDays: number
  lastCompletionDate?: string // YYYY-MM-DD
  d7EventSent: boolean
  installDate: string // ISO string
}

// Extend the database schema for telemetry
declare module './database' {
  interface Settings {
    telemetryOptIn: boolean
    telemetryAnonId?: string
    telemetryActivationSent?: boolean
    telemetryConsecutiveDays?: number
    telemetryLastCompletionDate?: string
    telemetryD7EventSent?: boolean
  }
}

class TelemetryService {
  private readonly TELEMETRY_ENDPOINT = 'https://api.negative-viz-journal.com/telemetry'
  private readonly MAX_RETRY_ATTEMPTS = 5
  private readonly RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000] // exponential backoff in ms
  private eventQueue: TelemetryEvent[] = []
  private processingQueue = false

  constructor() {
    this.loadQueueFromStorage()
    this.startQueueProcessor()
  }

  // Load persisted events from localStorage
  private loadQueueFromStorage(): void {
    if (typeof window === 'undefined') {
      this.eventQueue = []
      return
    }
    
    try {
      const stored = localStorage.getItem('nvj_telemetry_queue')
      if (stored) {
        this.eventQueue = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load telemetry queue from storage:', error)
      this.eventQueue = []
    }
  }

  // Persist event queue to localStorage
  private saveQueueToStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('nvj_telemetry_queue', JSON.stringify(this.eventQueue))
    } catch (error) {
      console.warn('Failed to save telemetry queue to storage:', error)
    }
  }

  // Generate anonymous ID
  private generateAnonId(): string {
    return 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // Get platform information
  private getPlatform(): string {
    if (typeof window === 'undefined') return 'server'
    
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('mac')) return 'macOS'
    if (userAgent.includes('win')) return 'Windows'
    if (userAgent.includes('linux')) return 'Linux'
    if (userAgent.includes('android')) return 'Android'
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS'
    return 'Unknown'
  }

  // Get timezone
  private getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'Unknown'
    }
  }

  // Calculate days since installation
  private async getDaysSinceInstall(): Promise<number> {
    try {
      const settings = await db.settings.get('main')
      if (!settings?.installAt) return 0
      
      const installDate = new Date(settings.installAt)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - installDate.getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } catch {
      return 0
    }
  }

  // Get current telemetry settings
  private async getTelemetrySettings(): Promise<TelemetrySettings | null> {
    try {
      const settings = await db.settings.get('main')
      if (!settings) return null

      return {
        isOptedIn: settings.telemetryOptIn || false,
        anonId: settings.telemetryAnonId,
        activationSent: settings.telemetryActivationSent || false,
        consecutiveDays: settings.telemetryConsecutiveDays || 0,
        lastCompletionDate: settings.telemetryLastCompletionDate,
        d7EventSent: settings.telemetryD7EventSent || false,
        installDate: settings.installAt
      }
    } catch (error) {
      console.warn('Failed to get telemetry settings:', error)
      return null
    }
  }

  // Update telemetry settings
  private async updateTelemetrySettings(updates: Partial<TelemetrySettings>): Promise<void> {
    try {
      const settings = await db.settings.get('main')
      if (!settings) return

      const updatedSettings = {
        ...settings,
        telemetryOptIn: updates.isOptedIn ?? settings.telemetryOptIn,
        telemetryAnonId: updates.anonId ?? settings.telemetryAnonId,
        telemetryActivationSent: updates.activationSent ?? settings.telemetryActivationSent,
        telemetryConsecutiveDays: updates.consecutiveDays ?? settings.telemetryConsecutiveDays,
        telemetryLastCompletionDate: updates.lastCompletionDate ?? settings.telemetryLastCompletionDate,
        telemetryD7EventSent: updates.d7EventSent ?? settings.telemetryD7EventSent
      }

      await db.settings.put(updatedSettings)
    } catch (error) {
      console.warn('Failed to update telemetry settings:', error)
    }
  }

  // Create telemetry event
  private async createEvent(eventType: TelemetryEvent['eventType'], dayNumber?: number): Promise<TelemetryEvent> {
    const telemetrySettings = await this.getTelemetrySettings()
    const anonId = telemetrySettings?.anonId || this.generateAnonId()
    
    // Ensure anonId is saved
    if (!telemetrySettings?.anonId) {
      await this.updateTelemetrySettings({ anonId })
    }

    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      timestamp: new Date().toISOString(),
      anonId,
      appVersion: '0.1.0', // From package.json
      platform: this.getPlatform(),
      timezone: this.getTimezone(),
      dayNumber,
      retryCount: 0,
      queuedAt: new Date().toISOString()
    }
  }

  // Send event to server with retry logic
  private async sendEventToServer(event: TelemetryEvent): Promise<boolean> {
    try {
      const response = await fetch(this.TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: event.eventType,
          timestamp: event.timestamp,
          anonId: event.anonId,
          appVersion: event.appVersion,
          platform: event.platform,
          timezone: event.timezone,
          dayNumber: event.dayNumber
        })
      })

      return response.ok && response.status >= 200 && response.status < 300
    } catch (error) {
      console.warn('Failed to send telemetry event:', error)
      return false
    }
  }

  // Process event queue with exponential backoff
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) return

    this.processingQueue = true

    try {
      const telemetrySettings = await this.getTelemetrySettings()
      if (!telemetrySettings?.isOptedIn) {
        // User opted out, clear queue
        this.eventQueue = []
        this.saveQueueToStorage()
        return
      }

      const eventsToProcess = [...this.eventQueue]
      
      for (let i = 0; i < eventsToProcess.length; i++) {
        const event = eventsToProcess[i]
        
        if ((event.retryCount || 0) >= this.MAX_RETRY_ATTEMPTS) {
          // Max retries reached, remove from queue
          this.eventQueue = this.eventQueue.filter(e => e.id !== event.id)
          continue
        }

        const success = await this.sendEventToServer(event)
        
        if (success) {
          // Event sent successfully, remove from queue
          this.eventQueue = this.eventQueue.filter(e => e.id !== event.id)
        } else {
          // Failed to send, increment retry count and schedule retry
          const eventIndex = this.eventQueue.findIndex(e => e.id === event.id)
          if (eventIndex !== -1) {
            this.eventQueue[eventIndex].retryCount = (this.eventQueue[eventIndex].retryCount || 0) + 1
            
            // Schedule retry with exponential backoff
            const retryDelay = this.RETRY_DELAYS[Math.min((this.eventQueue[eventIndex].retryCount || 1) - 1, this.RETRY_DELAYS.length - 1)]
            setTimeout(() => {
              this.processQueue()
            }, retryDelay)
          }
          break // Stop processing queue on failure
        }
      }

      this.saveQueueToStorage()
    } catch (error) {
      console.warn('Error processing telemetry queue:', error)
    } finally {
      this.processingQueue = false
    }
  }

  // Start queue processor (runs periodically)
  private startQueueProcessor(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      this.processQueue()
    }, 30000)

    // Also process immediately when events are added
    this.processQueue()
  }

  // Public API: Check if user is opted in
  async isOptedIn(): Promise<boolean> {
    const settings = await this.getTelemetrySettings()
    return settings?.isOptedIn || false
  }

  // Public API: Opt in to telemetry
  async optIn(): Promise<void> {
    const telemetrySettings = await this.getTelemetrySettings()
    
    if (!telemetrySettings) return

    // Generate anonId if not exists
    const anonId = telemetrySettings.anonId || this.generateAnonId()
    
    await this.updateTelemetrySettings({
      isOptedIn: true,
      anonId
    })

    // Send activation event if not already sent
    if (!telemetrySettings.activationSent) {
      await this.sendActivationEvent()
    }

    // Start processing any queued events
    this.processQueue()
  }

  // Public API: Opt out of telemetry
  async optOut(): Promise<void> {
    await this.updateTelemetrySettings({
      isOptedIn: false,
      anonId: undefined,
      activationSent: false,
      consecutiveDays: 0,
      lastCompletionDate: undefined,
      d7EventSent: false
    })

    // Clear event queue and storage
    this.eventQueue = []
    this.saveQueueToStorage()
    
    // Clear anonId from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nvj_telemetry_anonId')
      } catch {
        // Ignore errors
      }
    }
  }

  // Public API: Send activation event
  async sendActivationEvent(): Promise<void> {
    const telemetrySettings = await this.getTelemetrySettings()
    
    if (!telemetrySettings?.isOptedIn || telemetrySettings.activationSent) {
      return
    }

    const event = await this.createEvent('activation')
    this.eventQueue.push(event)
    this.saveQueueToStorage()

    await this.updateTelemetrySettings({ activationSent: true })
    this.processQueue()
  }

  // Public API: Send daily completion event
  async sendDailyCompletionEvent(): Promise<void> {
    const telemetrySettings = await this.getTelemetrySettings()
    
    if (!telemetrySettings?.isOptedIn) return

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const dayNumber = await this.getDaysSinceInstall()

    // Check if we already sent an event for today
    if (telemetrySettings.lastCompletionDate === today) {
      return
    }

    const event = await this.createEvent('daily_completion', dayNumber)
    this.eventQueue.push(event)
    this.saveQueueToStorage()

    // Update consecutive days tracking
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    let newConsecutiveDays = 1
    if (telemetrySettings.lastCompletionDate === yesterdayStr) {
      newConsecutiveDays = telemetrySettings.consecutiveDays + 1
    }

    await this.updateTelemetrySettings({
      lastCompletionDate: today,
      consecutiveDays: newConsecutiveDays,
      d7EventSent: newConsecutiveDays >= 7 ? false : telemetrySettings.d7EventSent
    })

    // Send D7 event if we hit 7 consecutive days
    if (newConsecutiveDays === 7 && !telemetrySettings.d7EventSent) {
      await this.sendD7CompletionEvent()
    }

    this.processQueue()
  }

  // Public API: Send D7 completion event
  async sendD7CompletionEvent(): Promise<void> {
    const telemetrySettings = await this.getTelemetrySettings()
    
    if (!telemetrySettings?.isOptedIn || telemetrySettings.d7EventSent || telemetrySettings.consecutiveDays < 7) {
      return
    }

    const event = await this.createEvent('d7_completion')
    this.eventQueue.push(event)
    this.saveQueueToStorage()

    await this.updateTelemetrySettings({ d7EventSent: true })
    this.processQueue()
  }

  // Public API: Get queue status for debugging/settings UI
  getQueueStatus(): { queueLength: number; isProcessing: boolean; events: Array<{ id: string; eventType: string; retryCount: number; queuedAt: string }> } {
    return {
      queueLength: this.eventQueue.length,
      isProcessing: this.processingQueue,
      events: this.eventQueue.map(event => ({
        id: event.id,
        eventType: event.eventType,
        retryCount: event.retryCount || 0,
        queuedAt: event.queuedAt
      }))
    }
  }

  // Public API: Force queue processing (for testing)
  async forceProcessQueue(): Promise<void> {
    await this.processQueue()
  }
}

// Export singleton instance
export const telemetryService = new TelemetryService()