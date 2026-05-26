// public/sw.js
// Service Worker — HobbitGo Push Notifications
// Soporta: Chrome, Firefox, Edge, Safari iOS 16.4+ (PWA instalada)

const CACHE_NAME = 'hobbitgo-v1'

// ── Install ───────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Limpiar caches viejos
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    ])
  )
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
      { action: 'snooze', title: 'Posponer 1h' },
    ],
  }

  e.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click ────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close()

  // snooze: no hacer nada
  if (e.action === 'snooze') return

  // 'open' action o clic directo en la notificación → abrir la app
  const url = e.notification.data?.url || '/dashboard'
  const fullUrl = self.location.origin + url

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Buscar una pestaña/ventana ya abierta de la app
      const existing = clients.find(c => c.url.startsWith(self.location.origin))
      if (existing) {
        existing.focus()
        return existing.navigate(fullUrl)
      }
      // Si no hay ninguna abierta, abrir nueva
      return self.clients.openWindow(fullUrl)
    })
  )
})