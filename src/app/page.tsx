'use client'

import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { TodayCard } from '@/components/TodayCard'
import { PromptEntry } from '@/components/PromptEntry'
import { SettingsPage } from '@/components/SettingsPage'
import { Last7DaysView } from '@/components/Last7DaysView'
import { AllEntriesView } from '@/components/AllEntriesView'
import { TabDetection } from '@/components/TabDetection'
import { AppGuard } from '@/components/AppGuard'
import { useAppStore } from '@/lib/store'

export default function Home() {
  const { isFirstLaunch, currentView } = useAppStore()

  if (isFirstLaunch) {
    return <OnboardingFlow />
  }

  // Main app - render based on current view
  const renderMainContent = () => {
    switch (currentView) {
      case 'journal':
        return <PromptEntry />
      case 'settings':
        return <SettingsPage />
      case 'last7days':
        return <Last7DaysView />
      case 'all':
        return <AllEntriesView />
      case 'today':
      default:
        return <TodayCard />
    }
  }

  return (
    <AppGuard>
      <TabDetection />
      {renderMainContent()}
    </AppGuard>
  )
}