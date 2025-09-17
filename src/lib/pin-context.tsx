'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { cryptoUtils, sessionUtils, PinHashData } from '@/lib/crypto'
import { db } from '@/lib/database'
import { useAppStore } from '@/lib/store'

interface PinContextValue {
  // PIN status
  isPinEnabled: boolean
  isLocked: boolean
  isInitialized: boolean
  
  // PIN setup
  setupPin: (pin: string) => Promise<{ success: boolean; error?: string }>
  verifyPin: (pin: string) => Promise<{ success: boolean; error?: string }>
  disablePin: (currentPin: string) => Promise<{ success: boolean; error?: string }>
  
  // Session management
  lock: () => void
  unlock: () => void
  
  // Settings
  lockTimeoutMinutes: number
  updateLockTimeout: (minutes: number) => Promise<void>
  
  // Reset/wipe
  resetWithWipe: () => Promise<{ success: boolean; error?: string }>
  
  // Attempt tracking
  attemptCount: number
  isTemporaryLocked: boolean
  lockoutEndTime: number | null
}

const PinContext = createContext<PinContextValue | null>(null)

export function usePinContext() {
  const context = useContext(PinContext)
  if (!context) {
    throw new Error('usePinContext must be used within a PinProvider')
  }
  return context
}

interface PinProviderProps {
  children: React.ReactNode
}

export function PinProvider({ children }: PinProviderProps) {
  const { settings, setSettings } = useAppStore()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [isTemporaryLocked, setIsTemporaryLocked] = useState(false)
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null)
  
  const MAX_ATTEMPTS = 5
  const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes

  // Initialize PIN state on mount
  useEffect(() => {
    initializePinState()
  }, [])

  // Set up auto-lock functionality
  useEffect(() => {
    if (!settings?.pinHash || !isInitialized) return

    const timeoutMinutes = settings.lockTimeoutMinutes || 5
    const cleanup = sessionUtils.initActivityTracking(timeoutMinutes, handleAutoLock)
    
    // Check if session should be locked on startup
    if (sessionUtils.shouldLock(timeoutMinutes) || sessionUtils.isLocked()) {
      setIsLocked(true)
    }

    return cleanup
  }, [settings?.pinHash, settings?.lockTimeoutMinutes, isInitialized])

  // Handle lockout timer
  useEffect(() => {
    if (!isTemporaryLocked || !lockoutEndTime) return

    const updateTimer = () => {
      const now = Date.now()
      const remaining = lockoutEndTime - now

      if (remaining <= 0) {
        setIsTemporaryLocked(false)
        setLockoutEndTime(null)
        setAttemptCount(0)
        localStorage.removeItem('nvj_pinLockoutEnd')
        localStorage.removeItem('nvj_pinAttempts')
        return
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isTemporaryLocked, lockoutEndTime])

  const initializePinState = async () => {
    try {
      // Check for existing lockout
      const lockoutEndTime = localStorage.getItem('nvj_pinLockoutEnd')
      if (lockoutEndTime) {
        const endTime = parseInt(lockoutEndTime, 10)
        if (Date.now() < endTime) {
          setIsTemporaryLocked(true)
          setLockoutEndTime(endTime)
          setAttemptCount(MAX_ATTEMPTS)
        } else {
          localStorage.removeItem('nvj_pinLockoutEnd')
          localStorage.removeItem('nvj_pinAttempts')
        }
      }

      // Load attempt count
      const attempts = localStorage.getItem('nvj_pinAttempts')
      if (attempts) {
        setAttemptCount(parseInt(attempts, 10))
      }

      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize PIN state:', error)
      setIsInitialized(true)
    }
  }

  const handleAutoLock = useCallback(() => {
    setIsLocked(true)
  }, [])

  const setupPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!cryptoUtils.isValidPin(pin)) {
        return { success: false, error: 'PIN must be exactly 4 digits' }
      }

      const hashData = await cryptoUtils.hashPin(pin)
      
      const updatedSettings = {
        ...settings,
        pinHash: hashData.hash,
        pinSalt: hashData.salt,
        pinIterations: hashData.iterations,
        lockTimeoutMinutes: settings?.lockTimeoutMinutes || 5
      }

      await db.settings.put(updatedSettings as any)
      setSettings(updatedSettings as any)
      
      // Clear any existing session locks
      sessionUtils.unlockSession()
      setIsLocked(false)
      
      return { success: true }
    } catch (error) {
      console.error('Failed to setup PIN:', error)
      return { success: false, error: 'Failed to setup PIN. Please try again.' }
    }
  }

  const verifyPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isTemporaryLocked) {
        return { success: false, error: 'Access temporarily locked due to too many failed attempts' }
      }

      if (!cryptoUtils.isValidPin(pin)) {
        return { success: false, error: 'PIN must be exactly 4 digits' }
      }

      if (!settings?.pinHash || !settings?.pinSalt || !settings?.pinIterations) {
        return { success: false, error: 'PIN not configured' }
      }

      const hashData: PinHashData = {
        hash: settings.pinHash,
        salt: settings.pinSalt,
        iterations: settings.pinIterations
      }

      const isValid = await cryptoUtils.verifyPin(pin, hashData)

      if (isValid) {
        // Successful verification
        localStorage.removeItem('nvj_pinAttempts')
        localStorage.removeItem('nvj_pinLockoutEnd')
        setAttemptCount(0)
        setIsTemporaryLocked(false)
        setLockoutEndTime(null)
        sessionUtils.unlockSession()
        setIsLocked(false)
        return { success: true }
      } else {
        // Failed attempt
        const newAttemptCount = attemptCount + 1
        setAttemptCount(newAttemptCount)
        localStorage.setItem('nvj_pinAttempts', newAttemptCount.toString())

        if (newAttemptCount >= MAX_ATTEMPTS) {
          // Lock for 5 minutes
          const lockoutEnd = Date.now() + LOCKOUT_DURATION
          setIsTemporaryLocked(true)
          setLockoutEndTime(lockoutEnd)
          localStorage.setItem('nvj_pinLockoutEnd', lockoutEnd.toString())
          return { 
            success: false, 
            error: 'Too many failed attempts. Access locked for 5 minutes.' 
          }
        } else {
          const remaining = MAX_ATTEMPTS - newAttemptCount
          return { 
            success: false, 
            error: `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` 
          }
        }
      }
    } catch (error) {
      console.error('Failed to verify PIN:', error)
      return { success: false, error: 'Failed to verify PIN. Please try again.' }
    }
  }

  const disablePin = async (currentPin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verify current PIN first
      const verifyResult = await verifyPin(currentPin)
      if (!verifyResult.success) {
        return verifyResult
      }

      // Remove PIN data from settings
      const updatedSettings = {
        ...settings,
        pinHash: undefined,
        pinSalt: undefined,
        pinIterations: undefined
      }

      await db.settings.put(updatedSettings as any)
      setSettings(updatedSettings as any)
      
      // Clear all PIN-related data
      sessionUtils.clearPinData()
      setIsLocked(false)
      setAttemptCount(0)
      setIsTemporaryLocked(false)
      setLockoutEndTime(null)
      
      return { success: true }
    } catch (error) {
      console.error('Failed to disable PIN:', error)
      return { success: false, error: 'Failed to disable PIN. Please try again.' }
    }
  }

  const lock = () => {
    sessionUtils.lockSession()
    setIsLocked(true)
  }

  const unlock = () => {
    sessionUtils.unlockSession()
    setIsLocked(false)
  }

  const updateLockTimeout = async (minutes: number) => {
    try {
      const updatedSettings = {
        ...settings,
        lockTimeoutMinutes: minutes
      }

      await db.settings.put(updatedSettings as any)
      setSettings(updatedSettings as any)
    } catch (error) {
      console.error('Failed to update lock timeout:', error)
      throw new Error('Failed to update settings')
    }
  }

  const resetWithWipe = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Clear all data from IndexedDB
      await db.transaction('rw', db.settings, db.prompts, db.entries, db.streakSummary, async () => {
        await db.settings.clear()
        await db.prompts.clear()
        await db.entries.clear()
        await db.streakSummary.clear()
      })

      // Clear localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('nvj_') || key.includes('negviz')) {
            localStorage.removeItem(key)
          }
        })
      }

      // Clear sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keys = Object.keys(sessionStorage)
        keys.forEach(key => {
          if (key.startsWith('nvj_') || key.includes('negviz')) {
            sessionStorage.removeItem(key)
          }
        })
      }

      // Clear any service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames
            .filter(name => name.includes('negviz') || name.includes('journal'))
            .map(name => caches.delete(name))
        )
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to reset data:', error)
      return { success: false, error: 'Failed to reset all data. Please try again.' }
    }
  }

  const value: PinContextValue = {
    isPinEnabled: !!(settings?.pinHash && settings?.pinSalt && settings?.pinIterations),
    isLocked: isLocked && !!(settings?.pinHash),
    isInitialized,
    setupPin,
    verifyPin,
    disablePin,
    lock,
    unlock,
    lockTimeoutMinutes: settings?.lockTimeoutMinutes || 5,
    updateLockTimeout,
    resetWithWipe,
    attemptCount,
    isTemporaryLocked,
    lockoutEndTime
  }

  return (
    <PinContext.Provider value={value}>
      {children}
    </PinContext.Provider>
  )
}