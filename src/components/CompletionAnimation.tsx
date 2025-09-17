'use client'

import { useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'

interface CompletionAnimationProps {
  show: boolean
  onComplete?: () => void
  message?: string
}

export function CompletionAnimation({ show, onComplete, message = 'Entry saved!' }: CompletionAnimationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [animationStage, setAnimationStage] = useState<'enter' | 'tick' | 'sparkles' | 'exit'>('enter')

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setAnimationStage('enter')
      
      // Animation sequence
      const timeouts = [
        setTimeout(() => setAnimationStage('tick'), 200),      // Show tick
        setTimeout(() => setAnimationStage('sparkles'), 800),  // Add sparkles
        setTimeout(() => setAnimationStage('exit'), 1500),     // Start exit
        setTimeout(() => {
          setIsVisible(false)
          setAnimationStage('enter')
          onComplete?.()
        }, 2000), // Complete
      ]

      return () => {
        timeouts.forEach(clearTimeout)
      }
    }
  }, [show, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className={`
        relative flex flex-col items-center justify-center p-8 rounded-2xl bg-white shadow-2xl border-2 border-green-200
        transition-all duration-500 ease-out
        ${animationStage === 'enter' ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}
        ${animationStage === 'exit' ? 'scale-110 opacity-0' : ''}
      `}>
        {/* Background gradient animation */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 animate-pulse" />
        
        {/* Main tick circle */}
        <div className={`
          relative z-10 flex items-center justify-center w-20 h-20 rounded-full border-4 border-green-500 bg-green-50
          transition-all duration-700 ease-out
          ${animationStage === 'tick' || animationStage === 'sparkles' || animationStage === 'exit' 
            ? 'scale-100 bg-green-500 border-green-600' 
            : 'scale-75 bg-green-50 border-green-300'
          }
        `}>
          <Check className={`
            w-10 h-10 transition-all duration-500 ease-out
            ${animationStage === 'tick' || animationStage === 'sparkles' || animationStage === 'exit'
              ? 'text-white scale-100 opacity-100'
              : 'text-green-500 scale-75 opacity-0'
            }
          `} />
        </div>

        {/* Sparkles animation */}
        {(animationStage === 'sparkles' || animationStage === 'exit') && (
          <>
            {/* Sparkle 1 */}
            <Sparkles className="absolute top-4 left-8 w-4 h-4 text-yellow-400 animate-pulse" 
              style={{ animationDelay: '0ms' }} />
            
            {/* Sparkle 2 */}
            <Sparkles className="absolute top-8 right-6 w-3 h-3 text-blue-400 animate-pulse" 
              style={{ animationDelay: '200ms' }} />
            
            {/* Sparkle 3 */}
            <Sparkles className="absolute bottom-6 left-6 w-5 h-5 text-purple-400 animate-pulse" 
              style={{ animationDelay: '400ms' }} />
            
            {/* Sparkle 4 */}
            <Sparkles className="absolute bottom-8 right-8 w-3 h-3 text-pink-400 animate-pulse" 
              style={{ animationDelay: '600ms' }} />
          </>
        )}

        {/* Success message */}
        <div className={`
          relative z-10 mt-6 text-center transition-all duration-500 ease-out
          ${animationStage === 'tick' || animationStage === 'sparkles' || animationStage === 'exit'
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
          }
        `}>
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            {message}
          </h3>
          <p className="text-sm text-green-600">
            Your reflection has been saved
          </p>
        </div>

        {/* Ripple effect */}
        <div className={`
          absolute inset-0 rounded-2xl border-2 border-green-300
          ${animationStage === 'tick' ? 'animate-ping' : 'opacity-0'}
        `} style={{ animationDuration: '1s', animationIterationCount: '1' }} />
      </div>
    </div>
  )
}

export function useCompletionAnimation() {
  const [isShowing, setIsShowing] = useState(false)

  const showAnimation = () => {
    setIsShowing(true)
  }

  const hideAnimation = () => {
    setIsShowing(false)
  }

  return {
    isShowing,
    showAnimation,
    hideAnimation,
    CompletionAnimation: (props: Omit<CompletionAnimationProps, 'show'>) => (
      <CompletionAnimation 
        {...props} 
        show={isShowing} 
        onComplete={() => {
          hideAnimation()
          props.onComplete?.()
        }}
      />
    )
  }
}