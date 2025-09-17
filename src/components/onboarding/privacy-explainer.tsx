'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Database, Download, Trash2, Eye } from 'lucide-react'
import { PrivacyExplainerPage } from '@/components/PrivacyExplainerPage'

interface PrivacyExplainerProps {
  onNext: () => void
}

export function PrivacyExplainer({ onNext }: PrivacyExplainerProps) {
  const [showDetailedPrivacy, setShowDetailedPrivacy] = useState(false)
  
  if (showDetailedPrivacy) {
    return (
      <PrivacyExplainerPage 
        showBackButton={true}
        onBack={() => setShowDetailedPrivacy(false)}
      />
    )
  }
  return (
    <div 
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4 cursor-pointer" 
      onClick={onNext}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNext()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="Continue to setup after reading privacy information"
    >
      <Card className="w-full max-w-md pointer-events-none select-none">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Your Privacy First</CardTitle>
          <CardDescription>
            This journal keeps your thoughts completely private
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Local Storage Only</p>
                <p className="text-xs text-muted-foreground">
                  All entries stay on your device. No accounts, no servers, no cloud sync.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Export Your Data</p>
                <p className="text-xs text-muted-foreground">
                  Download your entries as a JSON file anytime you want.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Delete Everything</p>
                <p className="text-xs text-muted-foreground">
                  Clear all data with one tap. It's completely gone.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Optional: Set up a 4-digit PIN to lock your journal when you're away
            </p>
          </div>

          <div className="text-center space-y-3">
            <p className="text-sm text-primary font-medium">
              Tap anywhere to continue
            </p>
            
            <div className="space-y-2 pointer-events-auto">
              <Button 
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDetailedPrivacy(true)
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Read Detailed Privacy Info
              </Button>
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={(e) => {
                  e.stopPropagation()
                  onNext()
                }}
              >
                Continue Setup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}