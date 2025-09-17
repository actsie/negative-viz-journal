'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Lock, AlertCircle, Shield } from 'lucide-react'
import { cryptoUtils, sessionUtils } from '@/lib/crypto'
import { useAppStore } from '@/lib/store'

interface PinUnlockProps {
  onUnlock: () => void
  pinHash: string
  pinSalt: string
  pinIterations: number
}

export function PinUnlock({ onUnlock, pinHash, pinSalt, pinIterations }: PinUnlockProps) {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptCount, setAttemptCount] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockEndTime, setLockEndTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('')

  const MAX_ATTEMPTS = 5
  const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes

  // Check if we're in lockout period on mount
  useEffect(() => {
    const lockoutEndTime = localStorage.getItem('nvj_pinLockoutEnd')
    if (lockoutEndTime) {
      const endTime = parseInt(lockoutEndTime, 10)
      if (Date.now() < endTime) {
        setIsLocked(true)
        setLockEndTime(endTime)
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
  }, [])

  // Update countdown timer
  useEffect(() => {
    if (!isLocked || !lockEndTime) return

    const updateTimer = () => {
      const now = Date.now()
      const remaining = lockEndTime - now

      if (remaining <= 0) {
        setIsLocked(false)
        setLockEndTime(null)
        setAttemptCount(0)
        localStorage.removeItem('nvj_pinLockoutEnd')
        localStorage.removeItem('nvj_pinAttempts')
        return
      }

      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isLocked, lockEndTime])

  const handleSubmit = async () => {
    if (isLocked) return
    if (!cryptoUtils.isValidPin(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const isValid = await cryptoUtils.verifyPin(pin, {
        hash: pinHash,
        salt: pinSalt,
        iterations: pinIterations
      })

      if (isValid) {
        // Successful unlock
        localStorage.removeItem('nvj_pinAttempts')
        localStorage.removeItem('nvj_pinLockoutEnd')
        sessionUtils.unlockSession()
        onUnlock()
      } else {
        // Failed attempt
        const newAttemptCount = attemptCount + 1
        setAttemptCount(newAttemptCount)
        localStorage.setItem('nvj_pinAttempts', newAttemptCount.toString())

        if (newAttemptCount >= MAX_ATTEMPTS) {
          // Lock for 5 minutes
          const lockoutEnd = Date.now() + LOCKOUT_DURATION
          setIsLocked(true)
          setLockEndTime(lockoutEnd)
          localStorage.setItem('nvj_pinLockoutEnd', lockoutEnd.toString())
          setError(`Too many failed attempts. Please wait 5 minutes before trying again.`)
        } else {
          const remaining = MAX_ATTEMPTS - newAttemptCount
          setError(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`)
        }
        setPin('')
      }
    } catch (err) {
      setError('Failed to verify PIN. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinChange = (value: string) => {
    if (isLocked) return
    
    // Only allow digits, max 4 characters
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 4)
    setPin(sanitized)
    
    if (error && !error.includes('Too many')) setError('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 4 && !isLoading && !isLocked) {
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            {isLocked ? (
              <AlertCircle className="w-6 h-6 text-destructive" />
            ) : (
              <Lock className="w-6 h-6 text-primary" />
            )}
          </div>
          <CardTitle>{isLocked ? 'Access Locked' : 'Enter PIN'}</CardTitle>
          <CardDescription>
            {isLocked 
              ? `Please wait ${timeRemaining} before trying again`
              : 'Enter your 4-digit PIN to access your journal'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isLocked && (
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
                disabled={isLoading || isLocked}
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

          {!isLocked && attemptCount > 0 && attemptCount < MAX_ATTEMPTS && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                {attemptCount} of {MAX_ATTEMPTS} attempts used. 
                After {MAX_ATTEMPTS} failed attempts, access will be locked for 5 minutes.
              </p>
            </div>
          )}

          {isLocked && (
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

          {!isLocked && (
            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              size="lg"
              disabled={isLoading || pin.length !== 4}
            >
              {isLoading ? 'Verifying...' : 'Unlock Journal'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}