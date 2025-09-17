'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Shield, Lock, Settings, AlertTriangle, Check, Trash2 } from 'lucide-react'
import { usePinContext } from '@/lib/pin-context'
import { PinSetup } from '@/components/pin/PinSetup'
import { PinEntry } from '@/components/pin/PinEntry'
import { useToast } from '@/components/ui/toast'

export function SecuritySettings() {
  const { 
    isPinEnabled, 
    setupPin, 
    disablePin, 
    updateLockTimeout, 
    lockTimeoutMinutes,
    resetWithWipe
  } = usePinContext()
  const { addToast } = useToast()
  
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [timeoutInput, setTimeoutInput] = useState(lockTimeoutMinutes.toString())
  const [isUpdatingTimeout, setIsUpdatingTimeout] = useState(false)

  const handleSetupPin = async (pin: string) => {
    const result = await setupPin(pin)
    if (result.success) {
      setShowPinSetup(false)
    }
    return result
  }

  const handleDisablePin = async (pin: string) => {
    setIsDisabling(true)
    const result = await disablePin(pin)
    if (result.success) {
      setShowDisableModal(false)
      addToast({
        type: 'success',
        title: 'PIN Disabled',
        description: 'Session lock has been disabled. Your journal is no longer protected by PIN.'
      })
    }
    setIsDisabling(false)
    return result
  }

  const handleTimeoutChange = async () => {
    const minutes = parseInt(timeoutInput, 10)
    if (isNaN(minutes) || minutes < 1 || minutes > 120) {
      addToast({
        type: 'error',
        title: 'Invalid Timeout',
        description: 'Auto-lock timeout must be between 1 and 120 minutes.'
      })
      setTimeoutInput(lockTimeoutMinutes.toString())
      return
    }

    setIsUpdatingTimeout(true)
    try {
      await updateLockTimeout(minutes)
      addToast({
        type: 'success',
        title: 'Settings Updated',
        description: `Auto-lock timeout set to ${minutes} minute${minutes !== 1 ? 's' : ''}.`
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: 'Failed to update auto-lock timeout.'
      })
      setTimeoutInput(lockTimeoutMinutes.toString())
    } finally {
      setIsUpdatingTimeout(false)
    }
  }

  const handleResetWithWipe = async () => {
    setIsResetting(true)
    
    try {
      const result = await resetWithWipe()
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Reset Complete',
          description: 'All data has been cleared. The app will restart.'
        })
        
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Session Lock
          </CardTitle>
          <CardDescription>
            Protect your journal with a 4-digit PIN that locks automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* PIN Setup/Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">PIN Protection</h4>
                <p className="text-xs text-muted-foreground">
                  {isPinEnabled 
                    ? 'Your journal is protected with a 4-digit PIN'
                    : 'Set up a PIN to secure your journal'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isPinEnabled ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-medium">Enabled</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Disabled</span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {isPinEnabled ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDisableModal(true)}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Disable PIN
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowPinSetup(true)}
                  size="sm"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Set Up PIN
                </Button>
              )}
            </div>
          </div>

          {/* Auto-lock timeout settings */}
          {isPinEnabled && (
            <>
              <div className="border-t pt-6" />
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Auto-lock Timeout</h4>
                <p className="text-xs text-muted-foreground">
                  Automatically lock the app after this period of inactivity
                </p>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={timeoutInput}
                    onChange={(e) => setTimeoutInput(e.target.value)}
                    className="w-20"
                    disabled={isUpdatingTimeout}
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                  
                  {timeoutInput !== lockTimeoutMinutes.toString() && (
                    <Button 
                      size="sm" 
                      onClick={handleTimeoutChange}
                      disabled={isUpdatingTimeout}
                    >
                      {isUpdatingTimeout ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                </div>
                
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    The app will also lock immediately when you switch to another app or tab, 
                    or when your device goes to sleep.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Emergency Reset */}
          <div className="border-t pt-6" />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-red-600 dark:text-red-400">
              Emergency Reset
            </h4>
            <p className="text-xs text-muted-foreground">
              If you forget your PIN, you can reset it by clearing all app data
            </p>
            
            <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-lg border border-red-300 dark:border-red-800">
              <p className="text-xs text-red-900 dark:text-red-200 font-medium">
                <strong>Warning:</strong> This will permanently delete all your journal entries, 
                settings, and data. This action cannot be undone.
              </p>
            </div>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowResetModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PIN Setup Modal */}
      {showPinSetup && (
        <div className="fixed inset-0 z-50 bg-background">
          <PinSetup 
            onSetup={handleSetupPin}
            onCancel={() => setShowPinSetup(false)}
          />
        </div>
      )}

      {/* Disable PIN Modal */}
      <Modal 
        isOpen={showDisableModal} 
        onClose={() => !isDisabling && setShowDisableModal(false)}
        title="Disable PIN Protection"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your current PIN to disable session lock protection.
          </p>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              After disabling PIN protection, your journal will no longer be secured 
              and anyone with access to your device can read your entries.
            </p>
          </div>
          
          <PinEntry
            onVerify={handleDisablePin}
            title="Enter Current PIN"
            description="Confirm your identity to disable PIN protection"
          />
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal 
        isOpen={showResetModal} 
        onClose={() => !isResetting && setShowResetModal(false)}
        title="Emergency Reset"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                This will permanently delete all data
              </p>
              <p className="text-xs text-muted-foreground">
                This emergency reset will clear:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-2">
                <li>• All journal entries and reflections</li>
                <li>• Streak data and progress</li>
                <li>• All settings and preferences</li>
                <li>• PIN and security configuration</li>
                <li>• All locally stored app data</li>
              </ul>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. The app will return to its initial setup state.
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
              onClick={handleResetWithWipe}
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