'use client'

import { useState } from 'react'
import { PrivacyExplainer } from './privacy-explainer'
import { PinSetup } from './pin-setup'
import { CueSetup } from './cue-setup'
import { TelemetryConsentModal } from '@/components/TelemetryConsentModal'
import { db, dbUtils } from '@/lib/database'
import { promptUtils } from '@/lib/prompts'
import { useAppStore } from '@/lib/store'
import { cryptoUtils } from '@/lib/crypto'
import { telemetryService } from '@/lib/telemetry'

type OnboardingStep = 'privacy' | 'pin' | 'cue' | 'telemetry' | 'complete'

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('privacy')
  const [pinData, setPinData] = useState<{ salt: string; iterations: number; hash: string } | null>(null)
  
  const { setSettings, setFirstLaunch, setCurrentView } = useAppStore()

  const completeOnboarding = async (cueTime?: string, telemetryOptIn: boolean = false) => {
    try {
      // Initialize database settings
      const settings = await dbUtils.initializeSettings()
      
      // Update settings with onboarding data
      const updatedSettings = {
        ...settings,
        ...(pinData && {
          pinSalt: pinData.salt,
          pinIterations: pinData.iterations,
          pinHash: pinData.hash,
        }),
        ...(cueTime && { dailyCueTime: cueTime }),
        telemetryOptIn,
      }

      await db.settings.put(updatedSettings)

      // Initialize seed prompts and streak
      await promptUtils.initializeSeedPrompts()
      await dbUtils.initializeStreakSummary()

      // Handle telemetry opt-in if selected
      if (telemetryOptIn) {
        try {
          await telemetryService.optIn()
        } catch (error) {
          console.error('Failed to initialize telemetry:', error)
        }
      }

      // Update app state
      setSettings(updatedSettings)
      setFirstLaunch(false)
      setCurrentView('today')
      setCurrentStep('complete')
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      // Could show error state here
    }
  }

  const [cueTime, setCueTime] = useState<string | undefined>(undefined)

  const handleTelemetryOptIn = async () => {
    await completeOnboarding(cueTime, true)
  }

  const handleTelemetrySkip = () => {
    completeOnboarding(cueTime, false)
  }

  switch (currentStep) {
    case 'privacy':
      return <PrivacyExplainer onNext={() => setCurrentStep('pin')} />
    
    case 'pin':
      return (
        <PinSetup
          onNext={(pinData) => {
            setPinData(pinData || null)
            setCurrentStep('cue')
          }}
          onBack={() => setCurrentStep('privacy')}
        />
      )
    
    case 'cue':
      return (
        <CueSetup
          onComplete={(cueTimeValue) => {
            setCueTime(cueTimeValue)
            setCurrentStep('telemetry')
          }}
          onBack={() => setCurrentStep('pin')}
        />
      )
    
    case 'telemetry':
      return (
        <TelemetryConsentModal
          isOpen={true}
          onOptIn={handleTelemetryOptIn}
          onSkip={handleTelemetrySkip}
        />
      )
    
    default:
      return null
  }
}