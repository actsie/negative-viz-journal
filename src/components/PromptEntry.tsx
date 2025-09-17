'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle, Clock, ArrowLeft, Save, Flame } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { dbUtils, db } from '@/lib/database'
import { promptUtils } from '@/lib/prompts'
import { useCompletionAnimation } from '@/components/CompletionAnimation'
import { useToast } from '@/components/ui/toast'
import { telemetryService } from '@/lib/telemetry'

interface TimerProps {
  onTimeout?: () => void
  duration?: number
}

function Timer({ onTimeout, duration = 300 }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false)
            onTimeout?.()
            return 0
          }
          return time - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft, onTimeout])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const percentage = ((duration - timeLeft) / duration) * 100

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="w-4 h-4" />
      <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-linear"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function PromptEntry() {
  const { settings, todayEntry, setTodayEntry, setCurrentView, streak, setStreak } = useAppStore()
  const { addToast } = useToast()
  const { isShowing, showAnimation, CompletionAnimation } = useCompletionAnimation()
  const [prompt, setPrompt] = useState<string>('')
  const [formData, setFormData] = useState({
    setback: '',
    protective_step: '',
    gratitude: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [streakInfo, setStreakInfo] = useState<{ isFirstToday: boolean, newStreak?: number } | null>(null)

  useEffect(() => {
    const loadTodayPrompt = async () => {
      try {
        setIsLoading(true)
        
        // Initialize seed prompts if needed
        await promptUtils.initializeSeedPrompts()
        
        // Get current prompt (considering any swaps)
        const installDate = settings?.installAt || new Date().toISOString()
        const todayPrompt = await promptUtils.getCurrentPrompt(installDate)
        setPrompt(todayPrompt.text)

        // Check if there's already an entry for today
        const today = dbUtils.getTodayLocal()
        const existingEntry = await db.entries.where('dateLocal').equals(today).first()
        
        if (existingEntry) {
          setFormData({
            setback: existingEntry.setback,
            protective_step: existingEntry.protective_step,
            gratitude: existingEntry.gratitude
          })
          setTodayEntry(existingEntry)
        }
      } catch (error) {
        console.error('Failed to load prompt:', error)
        setErrors({ general: 'Failed to load today\'s prompt. Please try again.' })
      } finally {
        setIsLoading(false)
      }
    }

    loadTodayPrompt()
  }, [settings, setTodayEntry])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.setback.trim()) {
      newErrors.setback = 'This field is required'
    } else if (formData.setback.length > 280) {
      newErrors.setback = 'Must be under 280 characters'
    }
    
    if (!formData.protective_step.trim()) {
      newErrors.protective_step = 'This field is required'
    } else if (formData.protective_step.length > 280) {
      newErrors.protective_step = 'Must be under 280 characters'
    }
    
    if (!formData.gratitude.trim()) {
      newErrors.gratitude = 'This field is required'
    } else if (formData.gratitude.length > 280) {
      newErrors.gratitude = 'Must be under 280 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      setIsSaving(true)
      const today = dbUtils.getTodayLocal()
      const now = new Date().toISOString()

      // Get current prompt for the entry (considering any swaps)
      const installDate = settings?.installAt || now
      const todayPrompt = await promptUtils.getCurrentPrompt(installDate)

      let entry
      let streakResult
      
      if (todayEntry) {
        // Update existing entry
        entry = {
          ...todayEntry,
          setback: formData.setback.trim(),
          protective_step: formData.protective_step.trim(),
          gratitude: formData.gratitude.trim(),
          edited_at: now
        }
        await db.entries.put(entry)
        
        // Still check streak info for existing entries to show proper toast
        streakResult = await dbUtils.updateStreak(today)
        setStreakInfo({ isFirstToday: false })
      } else {
        // Create new entry
        entry = {
          id: `entry-${Date.now()}`,
          dateLocal: today,
          prompt_id: todayPrompt.id,
          setback: formData.setback.trim(),
          protective_step: formData.protective_step.trim(),
          gratitude: formData.gratitude.trim(),
          created_at: now
        }
        await db.entries.add(entry)
        
        // Update streak for new entries and get result
        streakResult = await dbUtils.updateStreak(today)
        setStreakInfo({ 
          isFirstToday: streakResult.isFirstToday, 
          newStreak: streakResult.streakData.current_streak 
        })
        
        // Update streak in store
        if (streakResult.updated) {
          setStreak(streakResult.streakData)
        }
      }

      setTodayEntry(entry)
      
      // Send telemetry for daily completion if this is a new entry for today
      if (streakResult?.isFirstToday) {
        try {
          await telemetryService.sendDailyCompletionEvent()
        } catch (error) {
          console.warn('Failed to send telemetry event:', error)
          // Don't show error to user for telemetry failures
        }
      }
      
      // Show success animation with appropriate message
      const successMessage = streakInfo?.isFirstToday 
        ? `Entry saved! ${streakResult?.streakData.current_streak === 1 ? 'Streak started!' : `${streakResult?.streakData.current_streak} day streak!`}`
        : todayEntry 
        ? 'Entry updated!'
        : 'Entry saved!'
      
      showAnimation()
      
      // Show appropriate toast
      if (streakResult?.isFirstToday && streakResult.updated) {
        addToast({
          type: 'success',
          title: streakResult.streakData.current_streak === 1 ? 'Streak Started!' : 'Streak Continued!',
          description: `${streakResult.streakData.current_streak} day${streakResult.streakData.current_streak !== 1 ? 's' : ''} and counting!`,
          duration: 4000
        })
      } else if (!todayEntry) {
        addToast({
          type: 'info',
          title: 'Entry Already Recorded',
          description: 'Multiple entries on the same day don\'t affect your streak.',
          duration: 3000
        })
      }
      
    } catch (error) {
      console.error('Failed to save entry:', error)
      setErrors({ general: 'Failed to save entry. Please try again.' })
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Unable to save your entry. Please try again.',
        duration: 5000
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const isFormValid = formData.setback.trim() && 
                     formData.protective_step.trim() && 
                     formData.gratitude.trim() &&
                     formData.setback.length <= 280 &&
                     formData.protective_step.length <= 280 &&
                     formData.gratitude.length <= 280

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-muted-foreground animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Loading today's prompt...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
            <h1 className="text-lg font-semibold">Today's Reflection</h1>
            <Timer duration={300} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Negative Visualization</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {prompt}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {errors.general && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{errors.general}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="setback" className="block text-sm font-medium mb-2">
                  Setback <span className="text-destructive">*</span>
                </label>
                <Input
                  id="setback"
                  value={formData.setback}
                  onChange={(e) => handleInputChange('setback', e.target.value)}
                  placeholder="What challenges might arise from this situation?"
                  className={errors.setback ? 'border-destructive' : ''}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.setback && (
                    <p className="text-xs text-destructive">{errors.setback}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {formData.setback.length}/280
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="protective_step" className="block text-sm font-medium mb-2">
                  Protective Step <span className="text-destructive">*</span>
                </label>
                <Input
                  id="protective_step"
                  value={formData.protective_step}
                  onChange={(e) => handleInputChange('protective_step', e.target.value)}
                  placeholder="What could you do to prepare or protect yourself?"
                  className={errors.protective_step ? 'border-destructive' : ''}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.protective_step && (
                    <p className="text-xs text-destructive">{errors.protective_step}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {formData.protective_step.length}/280
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="gratitude" className="block text-sm font-medium mb-2">
                  Gratitude <span className="text-destructive">*</span>
                </label>
                <Input
                  id="gratitude"
                  value={formData.gratitude}
                  onChange={(e) => handleInputChange('gratitude', e.target.value)}
                  placeholder="What are you grateful for related to this area of your life?"
                  className={errors.gratitude ? 'border-destructive' : ''}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.gratitude && (
                    <p className="text-xs text-destructive">{errors.gratitude}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {formData.gratitude.length}/280
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
              className="w-full"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Entry
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Completion Animation */}
      <CompletionAnimation 
        message={streakInfo?.isFirstToday 
          ? `Entry saved! ${streakInfo.newStreak === 1 ? 'Streak started!' : `${streakInfo.newStreak} day streak!`}`
          : todayEntry 
          ? 'Entry updated!'
          : 'Entry saved!'
        }
        onComplete={() => {
          // Navigate back to today view after animation
          setTimeout(() => setCurrentView('today'), 300)
        }}
      />
    </div>
  )
}