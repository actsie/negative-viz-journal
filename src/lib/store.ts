import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Settings, Entry, StreakSummary } from './database'

interface AppState {
  // Settings
  settings: Settings | null
  setSettings: (settings: Settings) => void

  // Authentication
  isLocked: boolean
  setLocked: (locked: boolean) => void

  // Onboarding
  isFirstLaunch: boolean
  setFirstLaunch: (isFirst: boolean) => void

  // Current session data
  todayEntry: Entry | null
  setTodayEntry: (entry: Entry | null) => void

  // Streak data
  streak: StreakSummary | null
  setStreak: (streak: StreakSummary) => void

  // UI state
  currentView: 'onboarding' | 'today' | 'journal' | 'last7days' | 'all' | 'settings'
  setCurrentView: (view: AppState['currentView']) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Settings
      settings: null,
      setSettings: (settings) => set({ settings }),

      // Authentication  
      isLocked: false,
      setLocked: (locked) => set({ isLocked: locked }),

      // Onboarding
      isFirstLaunch: true,
      setFirstLaunch: (isFirst) => set({ isFirstLaunch: isFirst }),

      // Current session data
      todayEntry: null,
      setTodayEntry: (entry) => set({ todayEntry: entry }),

      // Streak data
      streak: null,
      setStreak: (streak) => set({ streak }),

      // UI state
      currentView: 'onboarding',
      setCurrentView: (view) => set({ currentView: view }),
    }),
    {
      name: 'negviz-app-store',
      partialize: (state) => ({
        isFirstLaunch: state.isFirstLaunch,
        currentView: state.currentView,
      }),
    }
  )
)