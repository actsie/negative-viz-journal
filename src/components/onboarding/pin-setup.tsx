'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Lock, Shield } from 'lucide-react'
import { cryptoUtils } from '@/lib/crypto'

interface PinSetupProps {
  onNext: (pinData?: { salt: string; iterations: number; hash: string }) => void
  onBack: () => void
}

export function PinSetup({ onNext, onBack }: PinSetupProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [skipPin, setSkipPin] = useState(false)

  const handleSubmit = async () => {
    if (skipPin) {
      onNext()
      return
    }

    if (!cryptoUtils.isValidPin(pin)) {
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
      const pinData = await cryptoUtils.hashPin(pin)
      onNext(pinData)
    } catch (err) {
      setError('Failed to set up PIN. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinChange = (value: string, isConfirm = false) => {
    // Only allow digits, max 4 characters
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 4)
    
    if (isConfirm) {
      setConfirmPin(sanitized)
    } else {
      setPin(sanitized)
    }
    
    if (error) setError('')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            {skipPin ? <Shield className="w-6 h-6 text-primary" /> : <Lock className="w-6 h-6 text-primary" />}
          </div>
          <CardTitle>{skipPin ? 'Skip PIN Setup' : 'Set Up PIN Lock'}</CardTitle>
          <CardDescription>
            {skipPin 
              ? 'You can always add a PIN later in settings'
              : 'Protect your journal with a 4-digit PIN'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!skipPin && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Enter PIN</label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    className="text-center text-2xl font-mono tracking-widest"
                    placeholder="••••"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Confirm PIN</label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => handlePinChange(e.target.value, true)}
                    className="text-center text-2xl font-mono tracking-widest"
                    placeholder="••••"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  <strong>Warning:</strong> If you forget your PIN and reset it, all your journal data will be deleted for security.
                </p>
              </div>
            </>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Setting up...' : (skipPin ? 'Continue without PIN' : 'Set PIN')}
            </Button>

            {!skipPin && (
              <Button 
                variant="ghost" 
                onClick={() => setSkipPin(true)} 
                className="w-full"
              >
                Skip PIN Setup
              </Button>
            )}

            <Button 
              variant="outline" 
              onClick={onBack} 
              className="w-full"
              disabled={isLoading}
            >
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}