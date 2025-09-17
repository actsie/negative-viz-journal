'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
  confirmationPhrase?: string
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  confirmationPhrase = "DELETE"
}: DeleteConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isConfirmationValid = inputValue === confirmationPhrase

  useEffect(() => {
    if (isOpen) {
      setInputValue('')
      setError('')
      // Focus input after modal animation
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    if (!isConfirmationValid) {
      setError(`Please type "${confirmationPhrase}" exactly as shown`)
      inputRef.current?.focus()
      return
    }

    try {
      await onConfirm()
    } catch (error) {
      setError('An error occurred during deletion. Please try again.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (error) setError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isConfirmationValid && !isDeleting) {
      handleConfirm()
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={isDeleting ? () => {} : onClose}
      title="Delete All Data"
      className="max-w-lg"
    >
      <div className="space-y-6">
        
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-red-100 dark:bg-red-950/40 rounded-lg border border-red-300 dark:border-red-800">
          <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-red-900 dark:text-red-300 mb-2">
              This action cannot be undone
            </p>
            <p className="text-red-800 dark:text-red-200 mb-2">
              This will permanently delete:
            </p>
            <ul className="text-red-800 dark:text-red-200 space-y-1">
              <li>• All journal entries</li>
              <li>• Settings and preferences</li>
              <li>• Streak data and statistics</li>
              <li>• PIN and security settings</li>
              <li>• All local app data</li>
            </ul>
          </div>
        </div>

        {/* Export Reminder */}
        <div className="p-3 bg-blue-100 dark:bg-blue-950/40 rounded-lg border border-blue-300 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
            <strong>Tip:</strong> Consider exporting your data first if you want to keep a backup. 
            You can export from the Data section in Settings.
          </p>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-3">
          <div>
            <label htmlFor="confirmation-input" className="block text-sm font-medium mb-2">
              To confirm deletion, type <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{confirmationPhrase}</code> below:
            </label>
            <Input
              id="confirmation-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Type "${confirmationPhrase}" to confirm`}
              disabled={isDeleting}
              className={error ? 'border-red-500 focus:border-red-500' : ''}
              aria-describedby={error ? "confirmation-error" : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {error && (
              <p id="confirmation-error" className="text-sm text-red-600 mt-1" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isDeleting}
            className="min-w-24"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Data
              </>
            )}
          </Button>
        </div>

        {/* Accessibility note */}
        <div className="text-xs text-muted-foreground">
          <p>Press Escape to cancel, or Enter to confirm once you've typed the confirmation phrase.</p>
        </div>

      </div>
    </Modal>
  )
}