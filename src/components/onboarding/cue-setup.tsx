'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Bell, BellOff } from 'lucide-react'
import { scheduleNotification } from '@/lib/notifications'

interface CueSetupProps {
  onComplete: (cueTime?: string) => void
  onBack: () => void
}

export function CueSetup({ onComplete, onBack }: CueSetupProps) {
  const [cueTime, setCueTime] = useState('09:00')
  const [skipCue, setSkipCue] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    setIsRequesting(true)
    
    try {
      const permission = await Notification.requestPermission()
      const granted = permission === 'granted'
      setPermissionGranted(granted)
      return granted
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      setPermissionGranted(false)
      return false
    } finally {
      setIsRequesting(false)
    }
  }

  const handleComplete = async () => {
    if (skipCue) {
      onComplete()
      return
    }

    // Request permission if not already granted
    if (permissionGranted === null) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        setSkipCue(true)
        onComplete()
        return
      }
    }

    // Schedule the notification if permission is granted
    if (permissionGranted || (permissionGranted === null && await requestNotificationPermission())) {
      try {
        scheduleNotification(cueTime, 'Time for your daily negative visualization practice')
      } catch (error) {
        console.warn('Failed to schedule notification:', error)
        // Continue anyway - the app will still show in-app reminders
      }
    }

    onComplete(cueTime)
  }

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            {skipCue ? <BellOff className="w-6 h-6 text-primary" /> : <Bell className="w-6 h-6 text-primary" />}
          </div>
          <CardTitle>{skipCue ? 'Skip Daily Reminder' : 'Daily Reminder'}</CardTitle>
          <CardDescription>
            {skipCue 
              ? 'You can enable reminders later in settings'
              : 'Get a daily notification to practice negative visualization'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!skipCue && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Reminder Time</label>
                  <Input
                    type="time"
                    value={cueTime}
                    onChange={(e) => setCueTime(e.target.value)}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Daily reminder at {formatTimeDisplay(cueTime)}
                  </p>
                </div>

                {permissionGranted === false && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-destructive text-center">
                      Notification permission denied. You can still use the app, but won't receive daily reminders.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  This will request permission to show browser notifications for your daily practice reminder.
                </p>
              </div>
            </>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleComplete} 
              className="w-full" 
              size="lg"
              disabled={isRequesting}
            >
              {isRequesting ? 'Requesting permission...' : (skipCue ? 'Continue without reminders' : 'Enable Daily Reminders')}
            </Button>

            {!skipCue && (
              <Button 
                variant="ghost" 
                onClick={() => setSkipCue(true)} 
                className="w-full"
                disabled={isRequesting}
              >
                Skip Reminders
              </Button>
            )}

            <Button 
              variant="outline" 
              onClick={onBack} 
              className="w-full"
              disabled={isRequesting}
            >
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}