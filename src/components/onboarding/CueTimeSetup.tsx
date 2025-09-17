'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CueTimeSetupProps {
  onContinue: (cueTime?: string) => void;
}

export default function CueTimeSetup({ onContinue }: CueTimeSetupProps) {
  const [time, setTime] = useState('18:00');
  const [error, setError] = useState('');

  const handleTimeChange = (value: string) => {
    setTime(value);
    setError('');
  };

  const handleSetTime = () => {
    if (!time) {
      setError('Please select a time');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      setError('Please select a valid time');
      return;
    }

    onContinue(time);
  };

  const handleSkip = () => {
    onContinue();
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Daily Reminder</CardTitle>
          <CardDescription className="text-base">
            When would you like to be reminded to journal?
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="time-input" className="text-sm font-medium">
                Preferred time (optional)
              </label>
              <Input
                id="time-input"
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="text-center text-lg"
                aria-describedby={error ? 'time-error' : 'time-description'}
              />
              <p id="time-description" className="text-sm text-muted-foreground text-center">
                Currently set to {formatTime(time)}
              </p>
            </div>

            {error && (
              <p id="time-error" className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleSetTime} 
              className="w-full"
              aria-label={`Set daily reminder for ${formatTime(time)}`}
            >
              Set Reminder Time
            </Button>
            
            <Button 
              onClick={handleSkip} 
              variant="outline" 
              className="w-full"
            >
              Skip Daily Reminder
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>We'll send you a notification at this time each day.</p>
            <p>You can change this later in settings.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}