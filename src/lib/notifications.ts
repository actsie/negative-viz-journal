export interface NotificationSettings {
  enabled: boolean;
  permission: NotificationPermission;
  cueTime?: string;
  message: string;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission;
  }
  return 'denied';
}

export function getNotificationPermission(): NotificationPermission {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

let activeNotificationTimeout: NodeJS.Timeout | null = null;

export function scheduleNotification(time: string, message: string = 'Time for your daily reflection'): void {
  // Clear any existing scheduled notification
  if (activeNotificationTimeout) {
    clearTimeout(activeNotificationTimeout);
    activeNotificationTimeout = null;
  }

  if (!isNotificationSupported() || getNotificationPermission() !== 'granted') {
    console.warn('Notifications not supported or permission not granted');
    return;
  }

  try {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const delay = scheduledTime.getTime() - now.getTime();
    
    // Don't schedule if delay is too far in the future (more than 24 hours)
    if (delay > 24 * 60 * 60 * 1000) {
      console.warn('Notification delay too far in future, skipping');
      return;
    }
    
    activeNotificationTimeout = setTimeout(() => {
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            if ('showNotification' in registration) {
              registration.showNotification('Negative Visualization Journal', {
                body: message,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                tag: 'daily-cue',
                requireInteraction: false,
                silent: false,
              });
            }
          }).catch((error) => {
            console.error('Service worker notification failed:', error);
            // Fallback to browser notification
            showBrowserNotification(message);
          });
        } else {
          // Fallback to browser notification
          showBrowserNotification(message);
        }
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
      activeNotificationTimeout = null;
    }, delay);
    
    console.log(`Notification scheduled for ${scheduledTime.toLocaleString()}`);
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
}

function showBrowserNotification(message: string): void {
  if (getNotificationPermission() === 'granted') {
    new Notification('Negative Visualization Journal', {
      body: message,
      icon: '/icon-192x192.png',
      tag: 'daily-cue',
      requireInteraction: false,
    });
  }
}

export function clearScheduledNotification(): void {
  if (activeNotificationTimeout) {
    clearTimeout(activeNotificationTimeout);
    activeNotificationTimeout = null;
  }
}

export function shouldShowInAppReminder(cueTime: string): boolean {
  if (!cueTime) return false;
  
  try {
    const [hours, minutes] = cueTime.split(':').map(Number);
    const now = new Date();
    const cueDateTime = new Date(now);
    cueDateTime.setHours(hours, minutes, 0, 0);
    
    const timeDiff = now.getTime() - cueDateTime.getTime();
    
    // Show reminder for 1 hour after cue time
    return timeDiff >= 0 && timeDiff < 60 * 60 * 1000;
  } catch (error) {
    console.error('Error checking in-app reminder:', error);
    return false;
  }
}

export async function testNotification(message: string = 'Test notification from Negative Visualization Journal'): Promise<boolean> {
  try {
    if (!isNotificationSupported()) {
      throw new Error('Notifications not supported');
    }

    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      throw new Error(`Notification permission not granted: ${permission}`);
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if ('showNotification' in registration) {
        await registration.showNotification('Test Notification', {
          body: message,
          icon: '/icon-192x192.png',
          tag: 'test-notification',
          requireInteraction: false,
        });
        return true;
      }
    }

    // Fallback to browser notification
    new Notification('Test Notification', {
      body: message,
      icon: '/icon-192x192.png',
      tag: 'test-notification',
      requireInteraction: false,
    });
    return true;
  } catch (error) {
    console.error('Test notification failed:', error);
    return false;
  }
}