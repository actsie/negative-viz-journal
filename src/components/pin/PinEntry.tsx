'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Lock, AlertCircle, Shield, RotateCcw } from 'lucide-react'
import { cryptoUtils } from '@/lib/crypto'

interface PinEntryProps {
  onVerify: (pin: string) => Promise<{ success: boolean; error?: string }>
  onReset?: () => void
  title?: string
  description?: string
  showResetOption?: boolean
  attemptCount?: number
  maxAttempts?: number
  isTemporaryLocked?: boolean
  lockoutEndTime?: number | null
}

export function PinEntry({ 
  onVerify, 
  onReset,
  title = 'Enter PIN',
  description = 'Enter your 4-digit PIN to continue',
  showResetOption = false,
  attemptCount = 0,
  maxAttempts = 5,
  isTemporaryLocked = false,
  lockoutEndTime = null
}: PinEntryProps) {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState('')

  // Update countdown timer for temporary lockout
  useEffect(() => {
    if (!isTemporaryLocked || !lockoutEndTime) return

    const updateTimer = () => {
      const now = Date.now()
      const remaining = lockoutEndTime - now

      if (remaining <= 0) {
        setTimeRemaining('')
        return
      }

      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isTemporaryLocked, lockoutEndTime])

  const handleSubmit = async () => {
    if (isTemporaryLocked) return
    if (!cryptoUtils.isValidPin(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await onVerify(pin)
      if (!result.success) {
        setError(result.error || 'Invalid PIN')
        setPin('')
      }
    } catch (err) {
      setError('Failed to verify PIN. Please try again.')
      setPin('')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinChange = (value: string) => {
    if (isTemporaryLocked) return
    
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 4)
    setPin(sanitized)
    
    if (error && !error.includes('Too many')) setError('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 4 && !isLoading && !isTemporaryLocked) {
      handleSubmit()
    }
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            {isTemporaryLocked ? (
              <AlertCircle className="w-6 h-6 text-destructive" />
            ) : (
              <Lock className="w-6 h-6 text-primary" />
            )}
          </div>
          <CardTitle>
            {isTemporaryLocked ? 'Access Locked' : title}
          </CardTitle>
          <CardDescription>
            {isTemporaryLocked 
              ? `Please wait ${timeRemaining} before trying again`
              : description
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isTemporaryLocked && (
            <div>
              <label htmlFor="pin-input" className="text-sm font-medium mb-2 block sr-only">
                Enter PIN
              </label>
              <Input
                id="pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyDown={handleKeyPress}
                className="text-center text-2xl font-mono tracking-widest"
                placeholder="••••"
                disabled={isLoading || isTemporaryLocked}
                autoFocus
                aria-label="Enter your 4-digit PIN"
              />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 p-3 rounded-lg">
              <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {!isTemporaryLocked && attemptCount > 0 && attemptCount < maxAttempts && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                {attemptCount} of {maxAttempts} attempts used. 
                After {maxAttempts} failed attempts, access will be locked for 5 minutes.
              </p>
            </div>
          )}

          {isTemporaryLocked && (
            <div className="bg-destructive/10 p-3 rounded-lg">
              <div className="text-center">
                <Shield className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive font-medium mb-1">Security Lockout Active</p>
                <p className="text-xs text-muted-foreground">
                  Access has been temporarily restricted due to multiple failed PIN attempts. 
                  This is a security feature to protect your private journal data.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {!isTemporaryLocked && (
              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                size="lg"
                disabled={isLoading || pin.length !== 4}
              >
                {isLoading ? 'Verifying...' : 'Unlock'}
              </Button>
            )}

            {showResetOption && onReset && (
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="w-full"
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset & Clear All Data
              </Button>
            )}
          </div>

          {showResetOption && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                Forgot your PIN? You can reset it, but this will permanently delete all your journal data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}