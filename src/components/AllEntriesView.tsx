'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar, Edit2, Trash2, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { dbUtils, db, Entry } from '@/lib/database'
import { useToast } from '@/components/ui/toast'

const PAGE_SIZE = 20

export function AllEntriesView() {
  const { setCurrentView } = useAppStore()
  const { addToast } = useToast()
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    const loadEntries = async () => {
      try {
        setIsLoading(true)
        
        // Get total count
        const total = await db.entries.count()
        setTotalEntries(total)
        setTotalPages(Math.ceil(total / PAGE_SIZE))
        
        // Get entries for current page
        const offset = (currentPage - 1) * PAGE_SIZE
        const pageEntries = await db.entries
          .orderBy('created_at')
          .reverse()
          .offset(offset)
          .limit(PAGE_SIZE)
          .toArray()
        
        setEntries(pageEntries)
      } catch (error) {
        console.error('Failed to load entries:', error)
        addToast({
          type: 'error',
          title: 'Failed to load entries',
          description: 'There was an error loading your entries.'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadEntries()
  }, [currentPage, addToast])

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
        year: 'numeric',
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
      
      // Recalculate pagination after deletion
      const newTotal = totalEntries - 1
      const newTotalPages = Math.ceil(newTotal / PAGE_SIZE)
      
      setTotalEntries(newTotal)
      setTotalPages(newTotalPages)
      
      // If current page becomes empty and it's not page 1, go to previous page
      if (entries.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      } else {
        // Refresh current page
        setEntries(prev => prev.filter(e => e.id !== entry.id))
      }
      
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
              
              // Recalculate after restore
              setTotalEntries(newTotal + 1)
              setTotalPages(Math.ceil((newTotal + 1) / PAGE_SIZE))
              
              // Refresh the current page
              const offset = (currentPage - 1) * PAGE_SIZE
              const pageEntries = await db.entries
                .orderBy('created_at')
                .reverse()
                .offset(offset)
                .limit(PAGE_SIZE)
                .toArray()
              
              setEntries(pageEntries)
              
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

  const getTimeAgo = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const hoursAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    
    if (hoursAgo < 1) return 'Less than 1 hour ago'
    if (hoursAgo === 1) return '1 hour ago'
    if (hoursAgo < 24) return `${hoursAgo} hours ago`
    
    const daysAgo = Math.floor(hoursAgo / 24)
    if (daysAgo === 1) return '1 day ago'
    if (daysAgo < 7) return `${daysAgo} days ago`
    
    const weeksAgo = Math.floor(daysAgo / 7)
    if (weeksAgo === 1) return '1 week ago'
    if (weeksAgo < 4) return `${weeksAgo} weeks ago`
    
    const monthsAgo = Math.floor(daysAgo / 30)
    if (monthsAgo === 1) return '1 month ago'
    if (monthsAgo < 12) return `${monthsAgo} months ago`
    
    const yearsAgo = Math.floor(daysAgo / 365)
    if (yearsAgo === 1) return '1 year ago'
    return `${yearsAgo} years ago`
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      // Scroll to top of list
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('today')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">All Entries</h1>
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
            <h1 className="text-xl font-semibold">All Entries</h1>
            <p className="text-sm text-muted-foreground">
              {totalEntries} total entries
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {totalEntries === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No entries yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your negative visualization journey by creating your first entry.
              </p>
              <Button onClick={() => setCurrentView('journal')}>
                <Calendar className="w-4 h-4 mr-2" />
                Start Your First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Pagination Controls - Top */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Entries List */}
            <div className="space-y-4">
              {entries.map((entry) => (
                <Card key={entry.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{formatDate(entry.dateLocal)}</CardTitle>
                        <CardDescription className="text-xs">
                          {getTimeAgo(entry.created_at)}
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

            {/* Pagination Controls - Bottom */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {/* Page number buttons for smaller page counts */}
                  {totalPages <= 7 ? (
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    ))
                  ) : (
                    // Condensed pagination for larger page counts
                    <>
                      {currentPage > 3 && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} className="w-10">1</Button>
                          {currentPage > 4 && <span className="text-muted-foreground">...</span>}
                        </>
                      )}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                        if (page > totalPages) return null
                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        )
                      })}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && <span className="text-muted-foreground">...</span>}
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(totalPages)} className="w-10">{totalPages}</Button>
                        </>
                      )}
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-2 mt-8">
          <Button variant="outline" onClick={() => setCurrentView('today')} className="flex-1">
            Back to Today
          </Button>
          <Button variant="outline" onClick={() => setCurrentView('last7days')} className="flex-1">
            Last 7 Days
          </Button>
        </div>
      </div>
    </div>
  )
}