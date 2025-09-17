'use client';

import { Shield, Lock, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PrivacyExplainerProps {
  onContinue: () => void;
}

export default function PrivacyExplainer({ onContinue }: PrivacyExplainerProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Privacy First</CardTitle>
          <CardDescription className="text-base">
            Your journal stays completely private
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Local Storage Only</p>
                <p className="text-sm text-muted-foreground">
                  Everything stays on your device. No cloud sync, no servers.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Your Data, Your Control</p>
                <p className="text-sm text-muted-foreground">
                  Optional PIN protection and daily reminders you control.
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={onContinue} 
            className="w-full"
            aria-label="Continue to set up your journal"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}