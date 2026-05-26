// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data?.json() || {}
  const title = data.title || 'سوقنا'
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: true
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})