'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Settings, BookOpen, RefreshCw, Sparkles } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { shouldShowInAppReminder } from '@/lib/notifications'
import { dbUtils, db, Prompt } from '@/lib/database'
import { promptUtils } from '@/lib/prompts'
import { useToast } from '@/components/ui/toast'
import { StreaksPanel } from '@/components/StreaksPanel'

export function TodayCard() {
  const { settings, streak, setCurrentView, setStreak } = useAppStore()
  const { addToast } = useToast()
  const [showReminder, setShowReminder] = useState(false)
  const [todayDate, setTodayDate] = useState('')
  const [todayEntry, setTodayEntryLocal] = useState<any>(null)
  const [totalEntries, setTotalEntries] = useState(0)
  const [todayPrompt, setTodayPrompt] = useState<Prompt | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true)
  const [isSwapping, setIsSwapping] = useState(false)
  const [canSwap, setCanSwap] = useState(true)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [hasEntryToday, setHasEntryToday] = useState(false)

  useEffect(() => {
    const loadTodayData = async () => {
      // Set today's date
      const today = new Date()
      const dateStr = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      setTodayDate(dateStr)

      // Check if we should show in-app reminder
      if (settings?.dailyCueTime) {
        setShowReminder(shouldShowInAppReminder(settings.dailyCueTime))
      }

      try {
        // Check storage availability first
        const storageCheck = await promptUtils.isStorageAvailable()
        if (!storageCheck.available) {
          setStorageError(storageCheck.error || 'Storage unavailable')
          addToast({
            type: 'error',
            title: 'Storage Warning',
            description: storageCheck.error || 'Local storage is unavailable. Using session-only storage.',
            duration: 8000
          })
        }

        // Initialize seed prompts first (may fail if storage unavailable)
        try {
          await promptUtils.initializeSeedPrompts()
        } catch (error) {
          console.warn('Failed to initialize seed prompts, using fallback')
        }

        // Load today's prompt (will use fallback if storage fails)
        setIsLoadingPrompt(true)
        const installDate = settings?.installAt || new Date().toISOString()
        const currentPrompt = await promptUtils.getCurrentPrompt(installDate)
        setTodayPrompt(currentPrompt)

        // Check if user can swap today (disable if storage unavailable)
        if (storageCheck.available) {
          const currentSettings = await db.settings.get('main')
          setCanSwap(promptUtils.canSwapToday(currentSettings?.swapUsedDate))
        } else {
          setCanSwap(false) // Disable swap if storage unavailable
        }

        // Load today's entry if exists (may fail if storage unavailable)
        try {
          const todayLocal = dbUtils.getTodayLocal()
          const entry = await db.entries.where('dateLocal').equals(todayLocal).first()
          setTodayEntryLocal(entry || null)
          setHasEntryToday(!!entry)

          // Load and validate streak data
          const validationResult = await dbUtils.validateAndRecoverStreakData()
          setStreak(validationResult.streak)
          
          if (validationResult.recovered && !validationResult.isValid) {
            addToast({
              type: 'info',
              title: 'Data Recovery',
              description: 'Streak data was automatically recovered. Your entries remain safe.',
              duration: 5000
            })
          }

          // Load total entries count
          const total = await db.entries.count()
          setTotalEntries(total)
        } catch (error) {
          console.warn('Failed to load entries, likely due to storage issues')
          // Set defaults for session-only mode
          setTodayEntryLocal(null)
          setHasEntryToday(false)
          setStreak({ id: 'main', start_date: new Date().toISOString(), current_streak: 0, longest_streak: 0 })
          setTotalEntries(0)
        }
      } catch (error) {
        console.error('Failed to load today data:', error)
        addToast({
          type: 'error',
          title: 'Failed to load data',
          description: 'There was an error loading today\'s information. Please refresh the page.'
        })
      } finally {
        setIsLoadingPrompt(false)
      }
    }

    loadTodayData()
  }, [settings, setStreak, addToast])

  const handleStartJournal = () => {
    setCurrentView('journal')
  }

  const handleSwapPrompt = async () => {
    if (!canSwap || isSwapping || !settings?.installAt) return

    try {
      setIsSwapping(true)
      const result = await promptUtils.swapTodayPrompt(settings.installAt)
      
      if (result.success && result.newPrompt) {
        setTodayPrompt(result.newPrompt)
        setCanSwap(false)
        addToast({
          type: 'success',
          title: 'Prompt swapped!',
          description: 'You have a new prompt for today. You can swap again tomorrow.'
        })
      } else {
        addToast({
          type: 'error',
          title: 'Unable to swap',
          description: result.error || 'Failed to swap prompt. Please try again.'
        })
      }
    } catch (error) {
      console.error('Swap failed:', error)
      addToast({
        type: 'error',
        title: 'Swap failed',
        description: 'An unexpected error occurred while swapping the prompt.'
      })
    } finally {
      setIsSwapping(false)
    }
  }

  const formatCueTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Negative Visualization Journal</h1>
          <p className="text-sm text-muted-foreground">{todayDate}</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setCurrentView('settings')}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Daily Reminder Banner */}
        {showReminder && settings?.dailyCueTime && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <div>
                  <p className="font-medium text-sm">Daily Reminder</p>
                  <p className="text-xs text-muted-foreground">
                    It's time for your reflection at {formatCueTime(settings.dailyCueTime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Storage Warning Banner */}
        {storageError && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                <div>
                  <p className="font-medium text-sm text-yellow-800">Storage Warning</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {storageError}. Your progress won't be saved permanently, but you can still use the app.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Prompt Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Today's Prompt</CardTitle>
                  <CardDescription className="text-sm">Your daily negative visualization practice</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwapPrompt}
                disabled={!canSwap || isSwapping || !!storageError}
                className="shrink-0"
                aria-label={
                  storageError 
                    ? "Swap unavailable - storage issues" 
                    : canSwap 
                    ? "Swap today's prompt" 
                    : "Prompt already swapped today"
                }
              >
                <RefreshCw className={`w-4 h-4 ${isSwapping ? 'animate-spin' : ''}`} />
                {isSwapping ? 'Swapping...' : storageError ? 'N/A' : canSwap ? 'Swap' : 'Used'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPrompt ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading prompt...</p>
              </div>
            ) : todayPrompt ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                  <p className="font-medium text-sm leading-relaxed">{todayPrompt.text}</p>
                </div>
                {todayPrompt.gratitude_prompt && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-medium">Reflection focus:</span> {todayPrompt.gratitude_prompt}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {storageError 
                      ? 'Swap unavailable (storage issues)' 
                      : canSwap 
                      ? 'You can swap this prompt once today' 
                      : 'Prompt swap used for today'
                    }
                  </span>
                  {!storageError && <span>Reset tomorrow</span>}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Unable to load prompt</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Ready to Begin?</CardTitle>
            <CardDescription>
              Take 5 minutes to reflect and build resilience through negative visualization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium text-sm mb-2">What is negative visualization?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A Stoic practice where you imagine potential challenges or losses to build gratitude 
                for what you have and prepare mentally for life's uncertainties.
              </p>
            </div>

            <div className="space-y-3">
              {/* Show today's entry if it exists */}
              {todayEntry && (
                <Card className="bg-primary/5 border-primary/20 mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      Today's Entry
                      {dbUtils.canEditEntry(todayEntry) && (
                        <span className="text-xs font-normal text-muted-foreground">
                          Can edit for {Math.ceil(24 - (Date.now() - new Date(todayEntry.created_at).getTime()) / (1000 * 60 * 60))} more hours
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3 text-sm">
                      {todayEntry.setback && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Setback Visualization
                          </h4>
                          <p className="leading-relaxed">{todayEntry.setback.length > 150 ? todayEntry.setback.substring(0, 150) + '...' : todayEntry.setback}</p>
                        </div>
                      )}
                      {todayEntry.protective_step && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Protective Step
                          </h4>
                          <p className="leading-relaxed">{todayEntry.protective_step.length > 150 ? todayEntry.protective_step.substring(0, 150) + '...' : todayEntry.protective_step}</p>
                        </div>
                      )}
                      {todayEntry.gratitude && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Gratitude
                          </h4>
                          <p className="leading-relaxed">{todayEntry.gratitude.length > 150 ? todayEntry.gratitude.substring(0, 150) + '...' : todayEntry.gratitude}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleStartJournal} 
                className="w-full" 
                size="lg"
                aria-label={todayEntry ? 'Edit today\'s reflection entry' : 'Start today\'s reflection entry'}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {todayEntry ? 'Edit Today\'s Reflection' : 'Start Today\'s Reflection'}
              </Button>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setCurrentView('last7days')}
                  aria-label="View entries from the last 7 days"
                >
                  Past 7 Days
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setCurrentView('all')}
                  aria-label="View all journal entries with pagination"
                >
                  All Entries
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streaks Panel */}
        <StreaksPanel 
          streak={streak}
          hasEntryToday={hasEntryToday}
          onStreakUpdate={(newStreak) => setStreak(newStreak)}
        />

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Journal Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{totalEntries}</div>
                <div className="text-xs text-muted-foreground">Total Entries</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{streak?.longest_streak || 0}</div>
                <div className="text-xs text-muted-foreground">Best Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="text-center pt-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCurrentView('settings')}
          >
            Manage Settings
          </Button>
        </div>
      </div>
    </div>
  )
}