'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar, Edit2, Trash2, Clock } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { dbUtils, db, Entry } from '@/lib/database'
import { useToast } from '@/components/ui/toast'

export function Last7DaysView() {
  const { setCurrentView } = useAppStore()
  const { addToast } = useToast()
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)

  useEffect(() => {
    const loadRecentEntries = async () => {
      try {
        setIsLoading(true)
        const recentEntries = await dbUtils.getRecentEntries(7)
        setEntries(recentEntries)
      } catch (error) {
        console.error('Failed to load recent entries:', error)
        addToast({
          type: 'error',
          title: 'Failed to load entries',
          description: 'There was an error loading your recent entries.'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadRecentEntries()
  }, [addToast])

  const formatDate = (dateLocal: string) => {
    try {
      const date = new Date(dateLocal + 'T00:00:00')
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      
      const todayStr = dbUtils.getTodayLocal()
      const yesterdayStr = yesterday.getFullYear() + '-' + 
                          String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(yesterday.getDate()).padStart(2, '0')

      if (dateLocal === todayStr) return 'Today'
      if (dateLocal === yesterdayStr) return 'Yesterday'
      
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateLocal
    }
  }

  const canEdit = (entry: Entry) => dbUtils.canEditEntry(entry)

  const handleEdit = (entry: Entry) => {
    if (!canEdit(entry)) {
      const createdAt = new Date(entry.created_at)
      const hoursAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60))
      addToast({
        type: 'error',
        title: 'Cannot edit entry',
        description: `Entries can only be edited within 24 hours. This entry was created ${hoursAgo} hours ago.`
      })
      return
    }
    
    // Navigate to journal view with entry to edit
    setCurrentView('journal')
  }

  const handleDelete = async (entry: Entry) => {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return
    }

    try {
      await db.entries.delete(entry.id)
      setEntries(prev => prev.filter(e => e.id !== entry.id))
      
      // Show undo toast
      const undoToast = addToast({
        type: 'success',
        title: 'Entry deleted',
        description: 'Click to undo within 5 seconds',
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await db.entries.put(entry)
              setEntries(prev => {
                const newEntries = [...prev, entry]
                return newEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              })
              addToast({
                type: 'info',
                title: 'Entry restored',
                description: 'Your entry has been restored.'
              })
            } catch (error) {
              addToast({
                type: 'error',
                title: 'Failed to restore entry',
                description: 'Could not restore the deleted entry.'
              })
            }
          }
        }
      })
    } catch (error) {
      console.error('Failed to delete entry:', error)
      addToast({
        type: 'error',
        title: 'Failed to delete entry',
        description: 'There was an error deleting the entry. Please try again.'
      })
    }
  }

  const getExcerpt = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  const getHoursAgo = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const hoursAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    
    if (hoursAgo < 1) return 'Less than 1 hour ago'
    if (hoursAgo === 1) return '1 hour ago'
    if (hoursAgo < 24) return `${hoursAgo} hours ago`
    
    const daysAgo = Math.floor(hoursAgo / 24)
    if (daysAgo === 1) return '1 day ago'
    return `${daysAgo} days ago`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('today')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Last 7 Days</h1>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading entries...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('today')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Last 7 Days</h1>
            <p className="text-sm text-muted-foreground">{entries.length} entries found</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {entries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No recent entries</h3>
              <p className="text-muted-foreground mb-6">
                You haven't created any journal entries in the last 7 days.
              </p>
              <Button onClick={() => setCurrentView('journal')}>
                <Calendar className="w-4 h-4 mr-2" />
                Start Your First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{formatDate(entry.dateLocal)}</CardTitle>
                      <CardDescription className="text-xs">
                        {getHoursAgo(entry.created_at)}
                        {entry.edited_at && entry.edited_at !== entry.created_at && (
                          <span className="ml-2 text-muted-foreground">• Edited</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                        disabled={!canEdit(entry)}
                        className="p-2"
                        aria-label={canEdit(entry) ? 'Edit entry' : 'Cannot edit (>24h old)'}
                      >
                        <Edit2 className={`w-4 h-4 ${canEdit(entry) ? '' : 'text-muted-foreground/50'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry)}
                        className="p-2 text-destructive hover:text-destructive"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {entry.setback && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Setback Visualization
                        </h4>
                        <p className="text-sm leading-relaxed">{getExcerpt(entry.setback, 150)}</p>
                      </div>
                    )}
                    {entry.protective_step && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Protective Step
                        </h4>
                        <p className="text-sm leading-relaxed">{getExcerpt(entry.protective_step, 150)}</p>
                      </div>
                    )}
                    {entry.gratitude && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Gratitude
                        </h4>
                        <p className="text-sm leading-relaxed">{getExcerpt(entry.gratitude, 150)}</p>
                      </div>
                    )}
                  </div>
                  
                  {!canEdit(entry) && (
                    <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Editing disabled (entry is more than 24 hours old)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 mt-8">
          <Button variant="outline" onClick={() => setCurrentView('today')} className="flex-1">
            Back to Today
          </Button>
          <Button variant="outline" onClick={() => setCurrentView('all')} className="flex-1">
            View All Entries
          </Button>
        </div>
      </div>
    </div>
  )
}