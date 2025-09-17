'use client'

import { useState } from 'react'
import { PinEntry } from './PinEntry'
import { usePinContext } from '@/lib/pin-context'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface LockScreenProps {
  onUnlock?: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { 
    verifyPin, 
    resetWithWipe, 
    attemptCount, 
    isTemporaryLocked, 
    lockoutEndTime 
  } = usePinContext()
  const { addToast } = useToast()
  const [showResetModal, setShowResetModal] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleVerifyPin = async (pin: string) => {
    const result = await verifyPin(pin)
    if (result.success && onUnlock) {
      onUnlock()
    }
    return result
  }

  const handleShowResetModal = () => {
    setShowResetModal(true)
  }

  const handleConfirmReset = async () => {
    setIsResetting(true)
    
    try {
      const result = await resetWithWipe()
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Data Reset Complete',
          description: 'All data has been cleared. The app will restart.'
        })
        
        // Reload the page to return to initial state
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        addToast({
          type: 'error',
          title: 'Reset Failed',
          description: result.error || 'Failed to reset data. Please try again.'
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Reset Error',
        description: 'An unexpected error occurred during reset.'
      })
    } finally {
      setIsResetting(false)
      setShowResetModal(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background">
        <PinEntry
          onVerify={handleVerifyPin}
          onReset={handleShowResetModal}
          title="Journal Locked"
          description="Enter your 4-digit PIN to access your journal"
          showResetOption={attemptCount >= 5}
          attemptCount={attemptCount}
          maxAttempts={5}
          isTemporaryLocked={isTemporaryLocked}
          lockoutEndTime={lockoutEndTime}
        />
      </div>

      {/* Reset Confirmation Modal */}
      <Modal 
        isOpen={showResetModal} 
        onClose={() => !isResetting && setShowResetModal(false)}
        title="Reset All Data"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                Warning: This action is irreversible
              </p>
              <p className="text-xs text-muted-foreground">
                Resetting will permanently delete:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-2">
                <li>• All journal entries</li>
                <li>• Streak data and progress</li>
                <li>• Settings and preferences</li>
                <li>• PIN and security data</li>
                <li>• All locally stored data</li>
              </ul>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              This will clear all data from your device's storage and return the app to its initial state. 
              You will need to set up the app again from the beginning.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowResetModal(false)}
              disabled={isResetting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={isResetting}
              className="flex-1"
            >
              {isResetting ? (
                'Resetting...'
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All Data
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}