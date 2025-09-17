'use client'

import { useEffect, useState } from 'react'
import { usePinContext } from '@/lib/pin-context'
import { LockScreen } from '@/components/pin/LockScreen'
import { useAppStore } from '@/lib/store'
import { db } from '@/lib/database'

interface AppGuardProps {
  children: React.ReactNode
}

export function AppGuard({ children }: AppGuardProps) {
  const { isLocked, isPinEnabled, isInitialized } = usePinContext()
  const { isFirstLaunch, setSettings, setFirstLaunch } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if we have existing settings
        const existingSettings = await db.settings.get('main')
        
        if (existingSettings) {
          setSettings(existingSettings)
          setFirstLaunch(false)
        } else {
          // First launch - will show onboarding
          setFirstLaunch(true)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
        // On error, assume first launch
        setFirstLaunch(true)
      } finally {
        setIsLoading(false)
      }
    }

    if (isInitialized) {
      initializeApp()
    }
  }, [isInitialized, setSettings, setFirstLaunch])

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show lock screen if PIN is enabled and app is locked
  if (isPinEnabled && isLocked) {
    return <LockScreen />
  }

  return <>{children}</>
}