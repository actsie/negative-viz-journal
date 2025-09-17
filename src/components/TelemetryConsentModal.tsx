'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Shield, Activity, Calendar, Target } from 'lucide-react'

interface TelemetryConsentModalProps {
  isOpen: boolean
  onOptIn: () => void
  onSkip: () => void
}

export function TelemetryConsentModal({ isOpen, onOptIn, onSkip }: TelemetryConsentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleOptIn = async () => {
    setIsProcessing(true)
    try {
      await onOptIn()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {}} // Prevent closing by clicking outside or escape
      title=""
      className="max-w-lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold">Help Improve the App</h2>
          <p className="text-sm text-muted-foreground">
            Consider sharing minimal, anonymous usage data to help us make the app better.
          </p>
        </div>

        {/* What we collect */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">What We Collect (If You Opt In)</h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Activity className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">App Activation</p>
                <p className="text-muted-foreground text-xs">One-time event when you first opt in</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Daily Completions</p>
                <p className="text-muted-foreground text-xs">Anonymous count when you finish your daily reflection</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">7-Day Streaks</p>
                <p className="text-muted-foreground text-xs">Milestone event after seven consecutive days</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Technical details:</strong> Anonymous ID, timestamp, app version, platform, timezone, day count</p>
          </div>
        </div>

        {/* What we don't collect */}
        <div className="bg-green-100 dark:bg-green-950/40 p-3 rounded-lg border border-green-300 dark:border-green-800">
          <h4 className="font-semibold text-sm text-green-900 dark:text-green-300 mb-2">What We Never Collect</h4>
          <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
            <li>• Your journal entries or personal reflections</li>
            <li>• Your name, email, or any identifying information</li>
            <li>• Your location or browsing history</li>
            <li>• Any sensitive personal data</li>
          </ul>
        </div>

        {/* Privacy info */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Your Privacy</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Data is completely anonymous with no way to trace back to you</li>
            <li>• You can opt out anytime in Settings → Privacy</li>
            <li>• Opting out deletes all queued data immediately</li>
            <li>• All data stays local until you opt in</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            className="flex-1"
            disabled={isProcessing}
          >
            Skip
          </Button>
          <Button 
            onClick={handleOptIn}
            className="flex-1"
            disabled={isProcessing}
          >
            {isProcessing ? 'Setting up...' : 'Opt In'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You can change this choice anytime in Settings
        </p>
      </div>
    </Modal>
  )
}