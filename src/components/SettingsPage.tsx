'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Bell, Database, Shield, Palette, Download, Trash2, Eye, Loader2, Lock } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { NotificationSettings } from '@/components/NotificationSettings'
import { scheduleNotification, clearScheduledNotification } from '@/lib/notifications'
import { dbUtils } from '@/lib/database'
import { useToast } from '@/components/ui/toast'
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal'
import { PrivacyExplainerPage } from '@/components/PrivacyExplainerPage'
import { SecuritySettings } from '@/components/SecuritySettings'
import { telemetryService } from '@/lib/telemetry'

export function SettingsPage() {
  const { settings, setCurrentView, setSettings } = useAppStore()
  const { addToast } = useToast()
  const [activeSection, setActiveSection] = useState<'notifications' | 'security' | 'data' | 'privacy' | 'appearance'>('notifications')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('')
  const [showPrivacyExplainer, setShowPrivacyExplainer] = useState(false)
  const [telemetryOptIn, setTelemetryOptIn] = useState(false)
  const [telemetryLoading, setTelemetryLoading] = useState(false)
  const [queueStatus, setQueueStatus] = useState({ queueLength: 0, isProcessing: false, events: [] as any[] })

  // Load telemetry status on mount
  useEffect(() => {
    const loadTelemetryStatus = async () => {
      try {
        const isOptedIn = await telemetryService.isOptedIn()
        setTelemetryOptIn(isOptedIn)
        setQueueStatus(telemetryService.getQueueStatus())
      } catch (error) {
        console.warn('Failed to load telemetry status:', error)
      }
    }
    
    loadTelemetryStatus()
    
    // Update queue status periodically
    const interval = setInterval(() => {
      setQueueStatus(telemetryService.getQueueStatus())
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Update notification scheduling when settings change
  useEffect(() => {
    if (settings?.dailyCueEnabled && settings?.dailyCueTime) {
      scheduleNotification(
        settings.dailyCueTime, 
        'Time for your daily reflection! Take a few minutes to practice negative visualization.'
      )
    } else {
      clearScheduledNotification()
    }
  }, [settings?.dailyCueEnabled, settings?.dailyCueTime])
  
  const handleTelemetryToggle = async (enabled: boolean) => {
    setTelemetryLoading(true)
    try {
      if (enabled) {
        await telemetryService.optIn()
        addToast({
          type: 'success',
          title: 'Telemetry Enabled',
          description: 'Thank you for helping us improve the app with anonymous usage data.'
        })
      } else {
        await telemetryService.optOut()
        addToast({
          type: 'info',
          title: 'Telemetry Disabled', 
          description: 'Anonymous usage data collection has been turned off and local data cleared.'
        })
      }
      setTelemetryOptIn(enabled)
      setQueueStatus(telemetryService.getQueueStatus())
    } catch (error) {
      console.error('Failed to update telemetry setting:', error)
      addToast({
        type: 'error',
        title: 'Settings Error',
        description: 'Failed to update telemetry preference. Please try again.'
      })
    } finally {
      setTelemetryLoading(false)
    }
  }

  const handleSettingsUpdate = (newSettings: typeof settings) => {
    if (newSettings) {
      setSettings(newSettings)
    }
  }

  const handleDataReset = async () => {
    try {
      const confirmed = window.confirm(
        'Are you sure you want to reset all streak data? This action cannot be undone, but your journal entries will remain safe.'
      )
      
      if (!confirmed) return

      const success = await dbUtils.resetStreakData()
      if (success) {
        addToast({
          type: 'success',
          title: 'Streak Data Reset',
          description: 'Your streak has been reset successfully.'
        })
      } else {
        addToast({
          type: 'error',
          title: 'Reset Failed',
          description: 'Unable to reset streak data. Please try again.'
        })
      }
    } catch (error) {
      console.error('Reset error:', error)
      addToast({
        type: 'error',
        title: 'Reset Error',
        description: 'An unexpected error occurred.'
      })
    }
  }

  const handleDataExport = async () => {
    if (isExporting) return
    
    try {
      setIsExporting(true)
      setExportProgress(0)
      setExportStatus('Preparing export...')
      
      const result = await dbUtils.exportDataWithProgress((progress, status) => {
        setExportProgress(progress)
        setExportStatus(status)
      })
      
      const blob = new Blob([result.json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = dbUtils.generateExportFilename()
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addToast({
        type: 'success',
        title: 'Export Complete',
        description: `Exported ${result.metadata.entryCount} journal entries successfully.`
      })
    } catch (error) {
      console.error('Export error:', error)
      addToast({
        type: 'error',
        title: 'Export Failed',
        description: 'Unable to export your data. Please try again.'
      })
    } finally {
      setIsExporting(false)
      setExportProgress(0)
      setExportStatus('')
    }
  }

  const handleDeleteAllData = async () => {
    setIsDeleting(true)
    try {
      const result = await dbUtils.deleteAllData()
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Data Deleted',
          description: 'All data has been permanently deleted. The app will now restart.'
        })
        
        // Give user time to see the success message, then reload
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        addToast({
          type: 'error',
          title: 'Deletion Failed',
          description: result.error || 'Unable to delete data. Please try again.'
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      addToast({
        type: 'error',
        title: 'Deletion Error',
        description: 'An unexpected error occurred during deletion.'
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'notifications':
        return (
          <div className="space-y-6">
            <NotificationSettings 
              settings={settings}
              onSettingsUpdate={handleSettingsUpdate}
            />
          </div>
        )
      
      case 'security':
        return (
          <div className="space-y-6">
            <SecuritySettings />
          </div>
        )
      
      case 'data':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Export Data */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Export Data</h4>
                  <p className="text-xs text-muted-foreground">
                    Download all your journal entries and settings as a JSON file. Personal security data (PIN) is excluded for safety.
                  </p>
                  
                  {isExporting && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {exportStatus}
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${exportProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={handleDataExport}
                    disabled={isExporting}
                    className="min-w-32"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Journal Data
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="border-t pt-6" />
                
                {/* Reset Streak Data */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Reset Streak Data</h4>
                  <p className="text-xs text-muted-foreground">
                    Reset your current and longest streak counters. Your journal entries will remain safe. This action cannot be undone.
                  </p>
                  <Button variant="destructive" onClick={handleDataReset}>
                    Reset Streak Data
                  </Button>
                </div>
                
                <div className="border-t pt-6" />
                
                {/* Delete All Data */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-red-600 dark:text-red-400">Delete All Data</h4>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete all your journal entries, settings, and app data. This action cannot be undone.
                  </p>
                  <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-lg border border-red-300 dark:border-red-800">
                    <p className="text-xs text-red-900 dark:text-red-200 font-medium">
                      <strong>Warning:</strong> Consider exporting your data first if you want to keep a backup.
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All Data
                  </Button>
                </div>
                
              </CardContent>
            </Card>
          </div>
        )
      
      case 'privacy':
        return (
          <div className="space-y-6">
            {/* Telemetry Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Anonymous Telemetry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Help Improve the App</h4>
                    <p className="text-xs text-muted-foreground">
                      Share minimal, anonymous usage data (activation, daily completions, 7-day streaks)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {telemetryLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    <Button
                      variant={telemetryOptIn ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTelemetryToggle(!telemetryOptIn)}
                      disabled={telemetryLoading}
                    >
                      {telemetryOptIn ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>
                
                {telemetryOptIn && (
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <div className="flex justify-between">
                      <span>Queue status:</span>
                      <span>{queueStatus.queueLength} events, {queueStatus.isProcessing ? 'processing' : 'idle'}</span>
                    </div>
                    {queueStatus.events.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View queued events</summary>
                        <div className="mt-2 space-y-1">
                          {queueStatus.events.map((event, i) => (
                            <div key={i} className="text-xs flex justify-between">
                              <span>{event.eventType}</span>
                              <span>retry: {event.retryCount}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>What we collect:</strong> Anonymous activation, daily completion, and 7-day streak events</p>
                  <p><strong>What we never collect:</strong> Your journal entries, personal information, or identifying data</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Privacy Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Local Storage</h4>
                    <p className="text-muted-foreground">
                      All your journal data is stored locally on your device and never sent to external servers.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Offline-First</h4>
                    <p className="text-muted-foreground">
                      The app works completely offline. Your journal entries, streaks, and settings remain private to you.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Minimal Data</h4>
                    <p className="text-muted-foreground">
                      Optional anonymous telemetry only includes usage milestones, never your personal reflections.
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPrivacyExplainer(true)}
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Detailed Privacy Explainer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'appearance':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Theme customization will be available in a future update.</p>
                  <p className="mt-2">Currently using: {settings?.currentTheme || 'system'} theme</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCurrentView('today')}
            aria-label="Back to today"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your preferences</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'data', label: 'Data', icon: Database },
              { id: 'privacy', label: 'Privacy', icon: Shield },
              { id: 'appearance', label: 'Appearance', icon: Palette }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeSection === id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection(id as any)}
                className="flex-shrink-0"
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>

          {/* Content */}
          {renderContent()}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAllData}
        isDeleting={isDeleting}
      />
      
      {/* Privacy Explainer */}
      {showPrivacyExplainer && (
        <div className="fixed inset-0 z-50 bg-background">
          <PrivacyExplainerPage 
            onBack={() => setShowPrivacyExplainer(false)}
          />
        </div>
      )}
      
    </div>
  )
}