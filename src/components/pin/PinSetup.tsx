'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Shield, Eye, EyeOff, AlertCircle, Check } from 'lucide-react'
import { cryptoUtils } from '@/lib/crypto'
import { useToast } from '@/components/ui/toast'

interface PinSetupProps {
  onSetup: (pin: string) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
}

export function PinSetup({ onSetup, onCancel }: PinSetupProps) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()

  const handlePinChange = (value: string, isConfirm = false) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 4)
    
    if (isConfirm) {
      setConfirmPin(sanitized)
    } else {
      setPin(sanitized)
    }
    
    if (error) setError('')
  }

  const handleFirstStep = () => {
    if (!cryptoUtils.isValidPin(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }
    
    setStep('confirm')
    setError('')
  }

  const handleConfirm = async () => {
    if (!cryptoUtils.isValidPin(confirmPin)) {
      setError('PIN must be exactly 4 digits')
      return
    }

    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await onSetup(pin)
      if (result.success) {
        addToast({
          type: 'success',
          title: 'PIN Setup Complete',
          description: 'Your 4-digit PIN has been set successfully. Your journal is now protected.'
        })
      } else {
        setError(result.error || 'Failed to setup PIN')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep('enter')
    setConfirmPin('')
    setError('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'enter' && pin.length === 4) {
        handleFirstStep()
      } else if (step === 'confirm' && confirmPin.length === 4 && !isLoading) {
        handleConfirm()
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>
            {step === 'enter' ? 'Set PIN' : 'Confirm PIN'}
          </CardTitle>
          <CardDescription>
            {step === 'enter' 
              ? 'Choose a 4-digit PIN to secure your journal'
              : 'Re-enter your PIN to confirm'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="pin-input" className="text-sm font-medium mb-2 block sr-only">
              {step === 'enter' ? 'Enter PIN' : 'Confirm PIN'}
            </label>
            <div className="relative">
              <Input
                id="pin-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={step === 'enter' ? pin : confirmPin}
                onChange={(e) => handlePinChange(e.target.value, step === 'confirm')}
                onKeyDown={handleKeyPress}
                className="text-center text-2xl font-mono tracking-widest pr-12"
                placeholder="••••"
                disabled={isLoading}
                autoFocus
                aria-label={step === 'enter' ? 'Enter your 4-digit PIN' : 'Confirm your 4-digit PIN'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
                onClick={() => setShowPin(!showPin)}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 p-3 rounded-lg">
              <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {step === 'confirm' && !error && confirmPin.length === 4 && pin === confirmPin && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                PINs match
              </p>
            </div>
          )}

          <div className="space-y-3">
            {step === 'enter' ? (
              <Button 
                onClick={handleFirstStep}
                className="w-full" 
                size="lg"
                disabled={pin.length !== 4}
              >
                Continue
              </Button>
            ) : (
              <Button 
                onClick={handleConfirm}
                className="w-full" 
                size="lg"
                disabled={isLoading || confirmPin.length !== 4 || pin !== confirmPin}
              >
                {isLoading ? 'Setting up PIN...' : 'Complete Setup'}
              </Button>
            )}

            {step === 'confirm' ? (
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="w-full"
                disabled={isLoading}
              >
                Back
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </div>

          {step === 'enter' && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                Your PIN will be encrypted and stored securely on your device using PBKDF2. 
                We cannot recover your PIN if you forget it.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}