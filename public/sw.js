// public/sw.js
// Service Worker — HobbitGo Push Notifications

const CACHE_NAME = 'hobbitgo-v1'

// ── Install ───────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim())
})

// ── Push ──────────────────────────────────
self.addEventListener('push', e => {
  let data = {}
  try { data = e.data?.json() || {} } catch { data = { title: 'HobbitGo', body: e.data?.text() } }

  const title   = data.title || 'HobbitGo'
  const options = {
    body:    data.body    || '¡Es hora de practicar tu hobby!',
    icon:    data.icon    || '/assets/icons/icon-192.webp',
    badge:   data.badge   || '/assets/icons/icon-72.webp',
    tag:     data.tag     || 'hobbitgo-reminder',
    data:    { url: data.url || '/dashboard' },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open',   title: '¡Abrir app!' },
      { action: 'snooze', title: 'En 1 hora' },
    ],
  }

  e.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click ────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close()

  if (e.action === 'snooze') return // ignorar snooze por ahora

  const url = e.notification.data?.url || '/dashboard'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.navigate(url)
      } else {
        self.clients.openWindow(url)
      }
    })
  )
})