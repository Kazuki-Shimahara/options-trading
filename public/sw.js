// Service Worker for Web Push Notifications

self.addEventListener('push', (event) => {
  const defaultData = {
    title: 'NK225 Options',
    body: '新しい通知があります',
    icon: '/icon-192x192.png',
  }

  let data = defaultData
  try {
    if (event.data) {
      data = { ...defaultData, ...event.data.json() }
    }
  } catch {
    // JSONパース失敗時はデフォルトを使用
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/')
    })
  )
})
