'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Flame, Calendar, Target, RotateCcw, AlertTriangle } from 'lucide-react'
import { dbUtils, StreakSummary } from '@/lib/database'
import { useToast } from '@/components/ui/toast'

interface StreaksPanelProps {
  streak: StreakSummary | null
  hasEntryToday: boolean
  onStreakUpdate: (streak: StreakSummary) => void
}

export function StreaksPanel({ streak, hasEntryToday, onStreakUpdate }: StreaksPanelProps) {
  const { addToast } = useToast()
  const [isResetting, setIsResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  if (!streak) {
    return (
      <Card className="border-muted">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Streak data unavailable</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleResetStreak = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true)
      return
    }

    try {
      setIsResetting(true)
      const success = await dbUtils.resetStreakData()
      
      if (success) {
        const newStreak = await dbUtils.initializeStreakSummary()
        onStreakUpdate(newStreak)
        addToast({
          type: 'success',
          title: 'Streak Reset',
          description: 'Your streak has been reset. Previous data has been backed up.'
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
        description: 'An unexpected error occurred while resetting streak data.'
      })
    } finally {
      setIsResetting(false)
      setShowResetConfirm(false)
    }
  }

  const formatStartDate = (dateString: string) => {
    try {
      return dbUtils.getStreakStartDate(dateString)
    } catch {
      return 'Unknown'
    }
  }

  const getStreakIcon = (count: number) => {
    if (count === 0) return <Target className="w-5 h-5 text-muted-foreground" />
    if (count < 7) return <Flame className="w-5 h-5 text-orange-500" />
    if (count < 30) return <Flame className="w-5 h-5 text-red-500" />
    return <Flame className="w-5 h-5 text-purple-500" />
  }

  const getStreakColor = (count: number) => {
    if (count === 0) return 'bg-muted text-muted-foreground'
    if (count < 7) return 'bg-orange-100 text-orange-700 border-orange-200'
    if (count < 30) return 'bg-red-100 text-red-700 border-red-200'
    return 'bg-purple-100 text-purple-700 border-purple-200'
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStreakIcon(streak.current_streak)}
            <div>
              <CardTitle className="text-lg">Daily Streak</CardTitle>
              <CardDescription>Track your consistency</CardDescription>
            </div>
          </div>
          {showResetConfirm ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetStreak}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetStreak}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Reset streak data"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 ${getStreakColor(streak.current_streak)}`}>
              <span className="text-2xl font-bold">{streak.current_streak}</span>
            </div>
            <p className="text-sm font-medium mt-2">Current Streak</p>
            <p className="text-xs text-muted-foreground">
              {streak.current_streak === 0 ? 'Start today!' : `${streak.current_streak} day${streak.current_streak !== 1 ? 's' : ''}`}
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 bg-primary/10 text-primary border-primary/20">
              <span className="text-2xl font-bold">{streak.longest_streak}</span>
            </div>
            <p className="text-sm font-medium mt-2">Best Streak</p>
            <p className="text-xs text-muted-foreground">
              {streak.longest_streak === 0 ? 'None yet' : `${streak.longest_streak} day${streak.longest_streak !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Streak Details */}
        <div className="space-y-3">
          {streak.current_streak > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Started</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatStartDate(streak.start_date)}
              </span>
            </div>
          )}

          {/* Today's Status */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hasEntryToday ? 'bg-green-500' : 'bg-muted-foreground/50'}`} />
              <span className="text-sm font-medium">Today's Entry</span>
            </div>
            <Badge 
              variant={hasEntryToday ? 'default' : 'secondary'}
              className={hasEntryToday ? 'bg-green-100 text-green-800 border-green-200' : ''}
            >
              {hasEntryToday ? 'Recorded' : 'Pending'}
            </Badge>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg border border-primary/10">
          {streak.current_streak === 0 ? (
            <p className="text-sm text-muted-foreground">
              🌱 Start your journey today! Every expert was once a beginner.
            </p>
          ) : streak.current_streak < 7 ? (
            <p className="text-sm text-muted-foreground">
              🔥 Great start! Building habits takes consistency. Keep going!
            </p>
          ) : streak.current_streak < 21 ? (
            <p className="text-sm text-muted-foreground">
              ⚡ Amazing progress! You're developing a strong habit.
            </p>
          ) : streak.current_streak < 66 ? (
            <p className="text-sm text-muted-foreground">
              🚀 Incredible dedication! This is becoming second nature.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              🏆 You're a master of consistency! Your dedication inspires others.
            </p>
          )}
        </div>

        {/* Reset Warning */}
        {showResetConfirm && (
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 mb-1">Reset Streak Data?</p>
              <p className="text-yellow-700">
                This will reset your current and longest streak to 0. Your previous data will be backed up for recovery.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}