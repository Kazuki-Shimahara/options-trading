// Service Worker for Web Push Notifications

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')

  let data = {
    title: 'NK225 Options',
    body: '新しい通知があります',
    icon: '/next.svg',
    badge: '/next.svg',
    url: '/',
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      data = { ...data, ...payload }
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: {
      url: data.url,
    },
    actions: [
      { action: 'open', title: '開く' },
      { action: 'close', title: '閉じる' },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked')
  event.notification.close()

  const url = event.notification.data?.url || '/'

  if (event.action === 'close') {
    return
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        return self.clients.openWindow(url)
      })
  )
})
