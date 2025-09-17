'use client'

import { useEffect } from 'react'

export function TabDetection() {
  useEffect(() => {
    if (!('BroadcastChannel' in window)) {
      return
    }

    const channel = new BroadcastChannel('nvj-tab-check')
    
    channel.onmessage = (event) => {
      if (event.data === 'ping') {
        // Respond to indicate this tab is active
        channel.postMessage('pong')
      }
    }

    return () => {
      channel.close()
    }
  }, [])

  return null
}