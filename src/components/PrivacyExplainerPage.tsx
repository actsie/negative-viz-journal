'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, 
  Shield, 
  Database, 
  Download, 
  Trash2, 
  HardDrive, 
  Wifi, 
  Lock,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

interface PrivacyExplainerPageProps {
  showBackButton?: boolean
  onBack?: () => void
}

export function PrivacyExplainerPage({ showBackButton = true, onBack }: PrivacyExplainerPageProps) {
  const { setCurrentView } = useAppStore()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      setCurrentView('settings')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {showBackButton && (
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Privacy & Data</h1>
              <p className="text-sm text-muted-foreground">Understanding your data security</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Hero Section */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Your Privacy Matters</CardTitle>
              <p className="text-muted-foreground">
                Your journal is completely private and secure. Here's exactly how your data is handled.
              </p>
            </CardHeader>
          </Card>

          {/* Local Storage Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Local Storage Only
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">IndexedDB Storage</h4>
                    <p className="text-sm text-muted-foreground">
                      All your journal entries, settings, and streaks are stored in your browser's IndexedDB. 
                      This is a secure, local database that only your device can access.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Wifi className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">No Network Upload</h4>
                    <p className="text-sm text-muted-foreground">
                      Your data never leaves your device. There are no servers, no cloud storage, 
                      and no data transmission. Everything stays completely local.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">Optional PIN Protection</h4>
                    <p className="text-sm text-muted-foreground">
                      You can set up a PIN to add an extra layer of security. Your PIN is encrypted 
                      and stored locally - we never see or store your PIN.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">JSON Export Format</h4>
                    <p className="text-sm text-muted-foreground">
                      You can export all your data as a JSON file. The export includes your entries, 
                      settings, and streak data. PIN data is excluded for security.
                    </p>
                  </div>
                </div>
                
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-medium mb-2">Export file includes:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• App metadata (version, export date, entry count)</li>
                    <li>• All journal entries with timestamps</li>
                    <li>• Non-sensitive settings (theme, notifications)</li>
                    <li>• Streak data and statistics</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-100 dark:bg-amber-950/40 rounded-lg border border-amber-300 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900 dark:text-amber-300">Security Note</p>
                    <p className="text-amber-800 dark:text-amber-200">
                      PIN and encryption data are never included in exports for your security.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Deletion Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Secure Data Deletion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Complete Data Removal</h4>
                  <p className="text-sm text-muted-foreground">
                    When you choose to delete all data, the app removes everything stored locally:
                  </p>
                </div>
                
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• All journal entries from IndexedDB</li>
                    <li>• Settings and preferences</li>
                    <li>• Streak data and statistics</li>
                    <li>• App cache and temporary data</li>
                    <li>• Browser storage (localStorage/sessionStorage)</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-100 dark:bg-red-950/40 rounded-lg border border-red-300 dark:border-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-900 dark:text-red-300">Permanent Action</p>
                    <p className="text-red-800 dark:text-red-200">
                      Data deletion cannot be undone. Export your data first if you want to keep a backup.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What We Don't Collect */}
          <Card>
            <CardHeader>
              <CardTitle>What We Don't Collect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">No usage analytics or tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">No personal information</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">No crash reports or error logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">No cookies or third-party trackers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground">No network requests or API calls</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Storage Technology:</strong> IndexedDB with Dexie.js for structured data storage
              </p>
              <p>
                <strong>Encryption:</strong> PIN protection uses PBKDF2 with salt and 100,000 iterations
              </p>
              <p>
                <strong>Offline Capability:</strong> Progressive Web App (PWA) that works without internet
              </p>
              <p>
                <strong>Data Persistence:</strong> Data persists across browser sessions and updates
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}