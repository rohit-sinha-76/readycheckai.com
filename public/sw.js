// ReadyCheck AI - Service Worker for PWA and Offline Support
// Version: 1.0.0

const CACHE_NAME = 'readycheck-ai-v1'
const OFFLINE_URL = '/offline'

// Essential files to cache for offline functionality
const ESSENTIAL_CACHE_URLS = [
  '/',
  '/offline',
  '/competitions',
  '/dashboard',
  '/practice',
  '/manifest.json',
  // Static assets
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Add other essential static assets
]

// API endpoints that should be cached for offline access
const API_CACHE_PATTERNS = [
  /^\/api\/competitions$/,
  /^\/api\/categories$/,
  /^\/api\/user\/profile$/
]

// API endpoints that should never be cached (real-time data)
const NO_CACHE_PATTERNS = [
  /^\/api\/competitions\/.*\/compete$/,
  /^\/api\/competitions\/.*\/submit$/,
  /^\/api\/competitions\/.*\/leaderboard$/,
  /^\/api\/auth\//,
  /^\/api\/payments\//
]

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching essential resources')
        return cache.addAll(ESSENTIAL_CACHE_URLS)
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Take control of all pages
      return self.clients.claim()
    })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip requests from other origins
  if (url.origin !== location.origin) {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // Handle static assets
  event.respondWith(handleStaticAssets(request))
})

// Handle API requests with appropriate caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  // Never cache sensitive endpoints
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return fetchWithFallback(request)
  }
  
  // Cache-first strategy for cacheable API endpoints
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return cacheFirst(request)
  }
  
  // Network-first strategy for other API endpoints
  return networkFirst(request)
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request)
    return response
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // If not in cache, return offline page
    return caches.match(OFFLINE_URL)
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  return cacheFirst(request)
}

// Cache-first strategy
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Update cache in background
      updateCacheInBackground(request)
      return cachedResponse
    }
    
    // If not in cache, fetch and cache
    const response = await fetch(request)
    await cacheResponse(request, response.clone())
    return response
  } catch (error) {
    console.error('[ServiceWorker] Cache-first failed:', error)
    throw error
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    // Cache successful responses
    if (response.ok) {
      await cacheResponse(request, response.clone())
    }
    return response
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Fetch with fallback to cache
async function fetchWithFallback(request) {
  try {
    return await fetch(request)
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Cache a response
async function cacheResponse(request, response) {
  // Only cache successful responses
  if (!response.ok) return
  
  // Don't cache responses with cache-control: no-store
  if (response.headers.get('cache-control')?.includes('no-store')) return
  
  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response)
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cacheResponse(request, response.clone())
    }
  } catch (error) {
    // Silently fail background updates
    console.log('[ServiceWorker] Background cache update failed:', error.message)
  }
}

// Handle background sync for competition submissions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag)
  
  if (event.tag === 'competition-submission') {
    event.waitUntil(syncCompetitionSubmissions())
  }
  
  if (event.tag === 'honor-code-violation') {
    event.waitUntil(syncHonorCodeViolations())
  }
})

// Sync competition submissions when back online
async function syncCompetitionSubmissions() {
  try {
    // Get pending submissions from IndexedDB
    const pendingSubmissions = await getPendingSubmissions()
    
    for (const submission of pendingSubmissions) {
      try {
        const response = await fetch(`/api/competitions/${submission.competitionId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission.data)
        })
        
        if (response.ok) {
          // Remove from pending submissions
          await removePendingSubmission(submission.id)
          
          // Notify user of successful submission
          self.registration.showNotification('Submission Complete', {
            body: 'Your competition submission has been processed.',
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag: 'submission-success'
          })
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync submission:', error)
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error)
  }
}

// Sync honor code violations
async function syncHonorCodeViolations() {
  try {
    const pendingViolations = await getPendingViolations()
    
    for (const violation of pendingViolations) {
      try {
        const response = await fetch('/api/honor-code/violations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(violation.data)
        })
        
        if (response.ok) {
          await removePendingViolation(violation.id)
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync violation:', error)
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Violation sync failed:', error)
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: data.data,
    actions: data.actions || [],
    tag: data.tag || 'general',
    renotify: true,
    vibrate: data.urgent ? [200, 100, 200] : [100]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const data = event.notification.data
  let url = '/'
  
  if (data?.competition_id) {
    url = `/competitions/${data.competition_id}`
  } else if (data?.action_url) {
    url = data.action_url
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Message handling from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting()
        break
      case 'CACHE_COMPETITION_DATA':
        cacheCompetitionData(event.data.payload)
        break
      case 'STORE_PENDING_SUBMISSION':
        storePendingSubmission(event.data.payload)
        break
    }
  }
})

// IndexedDB helpers for offline functionality
async function getPendingSubmissions() {
  // TODO: Implement IndexedDB operations
  return []
}

async function removePendingSubmission(id) {
  // TODO: Implement IndexedDB operations
}

async function getPendingViolations() {
  // TODO: Implement IndexedDB operations
  return []
}

async function removePendingViolation(id) {
  // TODO: Implement IndexedDB operations
}

async function storePendingSubmission(submission) {
  // TODO: Implement IndexedDB operations
}

async function cacheCompetitionData(data) {
  const cache = await caches.open(CACHE_NAME)
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
  await cache.put(`/api/competitions/${data.id}`, response)
}
