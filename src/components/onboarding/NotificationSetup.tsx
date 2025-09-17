'use client';

import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requestNotificationPermission } from '@/lib/notifications';

interface NotificationSetupProps {
  onContinue: (permission: NotificationPermission) => void;
}

export default function NotificationSetup({ onContinue }: NotificationSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const permission = await requestNotificationPermission();
      onContinue(permission);
    } catch (error) {
      setError('Failed to request notification permission. You can enable this later in settings.');
      setTimeout(() => onContinue('denied'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onContinue('denied');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Stay on Track</CardTitle>
          <CardDescription className="text-base">
            Get daily reminders to practice negative visualization
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Bell className="w-4 h-4" />
                <span>Gentle daily reminders</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <BellOff className="w-4 h-4" />
                <span>No spam or unwanted alerts</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleEnableNotifications} 
              className="w-full"
              disabled={isLoading}
              aria-label="Enable notifications for daily reminders"
            >
              {isLoading ? 'Requesting Permission...' : 'Enable Notifications'}
            </Button>
            
            <Button 
              onClick={handleSkip} 
              variant="outline" 
              className="w-full"
              disabled={isLoading}
            >
              Maybe Later
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>You can change notification settings anytime.</p>
            <p>Notifications are sent locally - nothing leaves your device.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}