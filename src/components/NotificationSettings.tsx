'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Clock, TestTube, AlertCircle, CheckCircle } from 'lucide-react'
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  isNotificationSupported,
  scheduleNotification,
  clearScheduledNotification,
  testNotification
} from '@/lib/notifications'
import { db, Settings } from '@/lib/database'
import { useToast } from '@/components/ui/toast'

interface NotificationSettingsProps {
  settings: Settings | null
  onSettingsUpdate: (settings: Settings) => void
}

export function NotificationSettings({ settings, onSettingsUpdate }: NotificationSettingsProps) {
  const { addToast } = useToast()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [cueTime, setCueTime] = useState(settings?.dailyCueTime || '09:00')
  const [isEnabled, setIsEnabled] = useState(settings?.dailyCueEnabled || false)
  const [isTesting, setIsTesting] = useState(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Check current notification permission
    setPermission(getNotificationPermission())
    
    // Update local state from settings
    if (settings) {
      setCueTime(settings.dailyCueTime || '09:00')
      setIsEnabled(settings.dailyCueEnabled || false)
    }
  }, [settings])

  const handleRequestPermission = async () => {
    if (!isNotificationSupported()) {
      addToast({
        type: 'error',
        title: 'Not Supported',
        description: 'Notifications are not supported in this browser.'
      })
      return
    }

    try {
      setIsRequestingPermission(true)
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)
      
      if (newPermission === 'granted') {
        addToast({
          type: 'success',
          title: 'Permission Granted',
          description: 'You can now receive daily reminder notifications.'
        })
      } else if (newPermission === 'denied') {
        addToast({
          type: 'error',
          title: 'Permission Denied',
          description: 'Notifications were blocked. You can enable them in your browser settings.'
        })
      }
    } catch (error) {
      console.error('Permission request failed:', error)
      addToast({
        type: 'error',
        title: 'Permission Failed',
        description: 'Unable to request notification permission. Please try again.'
      })
    } finally {
      setIsRequestingPermission(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      setIsTesting(true)
      const success = await testNotification('This is a test notification to confirm everything is working!')
      
      if (success) {
        addToast({
          type: 'success',
          title: 'Test Successful',
          description: 'Test notification sent! Check your browser or system notifications.'
        })
      } else {
        addToast({
          type: 'error',
          title: 'Test Failed',
          description: 'Unable to send test notification. Check your notification permissions.'
        })
      }
    } catch (error) {
      console.error('Test notification failed:', error)
      addToast({
        type: 'error',
        title: 'Test Error',
        description: 'An error occurred while testing notifications.'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    try {
      setIsSaving(true)
      
      const updatedSettings: Settings = {
        ...settings,
        dailyCueTime: cueTime,
        dailyCueEnabled: isEnabled,
        notificationsEnabled: permission === 'granted'
      }

      await db.settings.put(updatedSettings)
      onSettingsUpdate(updatedSettings)

      // Schedule notification if enabled and permission granted
      if (isEnabled && permission === 'granted') {
        scheduleNotification(cueTime, 'Time for your daily reflection! Take a few minutes to practice negative visualization.')
        addToast({
          type: 'success',
          title: 'Settings Saved',
          description: `Daily reminder scheduled for ${formatCueTime(cueTime)}`
        })
      } else {
        clearScheduledNotification()
        addToast({
          type: 'success',
          title: 'Settings Saved',
          description: 'Daily reminder disabled'
        })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Unable to save notification settings. Please try again.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatCueTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return time
    }
  }

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Granted</Badge>
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>
      default:
        return <Badge variant="secondary">Not Set</Badge>
    }
  }

  const getPermissionIcon = () => {
    switch (permission) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'denied':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />
    }
  }

  if (!isNotificationSupported()) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 text-yellow-600" />
            <div>
              <CardTitle className="text-lg text-yellow-800">Notifications Not Available</CardTitle>
              <CardDescription className="text-yellow-700">
                Your browser doesn't support notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700">
            Daily reminders are not available in this browser. Consider using Chrome, Firefox, or Safari for the best experience.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getPermissionIcon()}
            <div>
              <CardTitle className="text-lg">Daily Reminders</CardTitle>
              <CardDescription>Get notified when it's time to reflect</CardDescription>
            </div>
          </div>
          {getPermissionBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Notification Permission</p>
              <p className="text-xs text-muted-foreground">
                {permission === 'granted' ? 'Ready to send notifications' :
                 permission === 'denied' ? 'Blocked by browser settings' :
                 'Permission not requested yet'}
              </p>
            </div>
            {permission !== 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestPermission}
                disabled={isRequestingPermission || permission === 'denied'}
              >
                {isRequestingPermission ? 'Requesting...' : 
                 permission === 'denied' ? 'Denied' : 'Allow Notifications'}
              </Button>
            )}
          </div>

          {permission === 'denied' && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800 mb-1">Notifications Blocked</p>
                <p className="text-red-700">
                  To enable notifications, click the 🔒 icon in your address bar and allow notifications for this site.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Time Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Reminder Time</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cue-time" className="text-xs text-muted-foreground block mb-2">
                Daily Reminder Time
              </label>
              <Input
                id="cue-time"
                type="time"
                value={cueTime}
                onChange={(e) => setCueTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">
                Preview
              </label>
              <div className="flex items-center h-10 px-3 bg-muted/30 rounded-md text-sm">
                {formatCueTime(cueTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div>
            <p className="text-sm font-medium">Daily Reminder</p>
            <p className="text-xs text-muted-foreground">
              {isEnabled ? `Enabled for ${formatCueTime(cueTime)}` : 'Disabled'}
            </p>
          </div>
          <Button
            variant={isEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEnabled(!isEnabled)}
            disabled={permission !== 'granted'}
          >
            {isEnabled ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
            {isEnabled ? 'Enabled' : 'Enable'}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving || !settings}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          {permission === 'granted' && (
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={isTesting}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isTesting ? 'Testing...' : 'Test'}
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="mb-2"><strong>About Daily Reminders:</strong></p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Notifications only work when the app is open in your browser</li>
            <li>If notifications fail, you'll see an in-app reminder instead</li>
            <li>You can change or disable reminders anytime</li>
            <li>Settings are saved locally on your device</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}