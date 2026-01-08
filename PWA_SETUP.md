# 📱 hexOS PWA Setup Guide

This guide will help you complete the PWA (Progressive Web App) setup for hexOS.

## ✅ What's Already Done

The following has been implemented:

### 1. Database Migration
- ✅ Supabase migration for `push_subscriptions` table
- ✅ RLS policies for push subscriptions
- Location: `/supabase/migrations/20260108000001_push_subscriptions.sql`

### 2. Core PWA Infrastructure
- ✅ PWA manifest (`/public/manifest.json`)
- ✅ Service worker configuration in `next.config.ts`
- ✅ IndexedDB offline storage layer (`/lib/db/offline-storage.ts`)
- ✅ Offline mutation queue system (`/lib/offline/sync-queue.ts`)
- ✅ Online/offline status detection hook (`/hooks/use-online-status.ts`)

### 3. UI Components
- ✅ Offline indicator banner (`/components/offline-indicator.tsx`)
- ✅ Install prompt (`/components/install-prompt.tsx`)
- ✅ Components added to root layout

### 4. Push Notifications
- ✅ Client-side push notification manager (`/lib/push/notifications.ts`)
- ✅ Server-side push sender (`/lib/push/send-notification.ts`)
- ✅ Push subscription API routes (`/app/api/push/subscribe/route.ts`)
- ✅ Custom service worker with push handlers (`/public/sw-custom.js`)

### 5. Dependencies
- ✅ All NPM packages installed (next-pwa, idb, workbox-window, web-push)

---

## 🚀 Required Setup Steps

### Step 1: Run Database Migration

```bash
# Make sure you're connected to Supabase
npx supabase db push

# Or if using the Supabase CLI locally
supabase db push
```

This will create the `push_subscriptions` table needed for push notifications.

---

### Step 2: Generate VAPID Keys

VAPID keys are required for Web Push notifications.

```bash
node scripts/generate-vapid-keys.js
```

This will output two keys. **Add them to your `.env` file:**

```bash
# .env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key-here"
VAPID_PRIVATE_KEY="your-private-key-here"
```

⚠️ **IMPORTANT:**
- The public key must start with `NEXT_PUBLIC_` (it's used in the browser)
- The private key should be kept secret (server-side only)
- Never commit these keys to git!

---

### Step 3: Generate PWA Icons

The PWA requires icons in multiple sizes. You have three options:

#### Option A: Use an online tool (Easiest)
1. Go to https://realfavicongenerator.net/
2. Upload `/app/favicon.ico`
3. Download generated icons
4. Place them in `/public/`

#### Option B: Use PWA Asset Generator
```bash
npx pwa-asset-generator app/favicon.ico public/ --icon-only --background "#8860d0"
```

#### Option C: Use ImageMagick
See `/public/ICONS_README.md` for detailed commands.

**Required icon files:**
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `icon-maskable-512x512.png` (with safe zone padding)
- `apple-touch-icon.png` (180x180 for iOS)

---

### Step 4: Build and Test

```bash
# Build the app
npm run build

# Start production server
npm start
```

**Test checklist:**
1. ✅ Visit http://localhost:3000
2. ✅ Check for install prompt (after ~30 seconds)
3. ✅ Open DevTools → Application → Manifest (should be valid)
4. ✅ Check Service Worker is registered
5. ✅ Test offline mode (DevTools → Network → Offline)
6. ✅ Verify offline indicator appears
7. ✅ Request notification permission
8. ✅ Test push notifications

---

### Step 5: Lighthouse PWA Audit

Run a Lighthouse audit to verify PWA compliance:

```bash
npx lighthouse http://localhost:3000 --view --preset=desktop
```

**Should pass all PWA checks:**
- ✅ Installable
- ✅ PWA Optimized
- ✅ Works offline
- ✅ Fast load times

---

## 🔧 How to Use PWA Features

### Offline Caching

Data is automatically cached when users visit pages:

```typescript
import { cacheProject } from '@/lib/db/offline-storage';

// Cache a project for offline access
await cacheProject(project);
```

### Queuing Offline Actions

```typescript
import { queueMessage, queueTaskCompletion } from '@/lib/offline/sync-queue';

// Queue a message to send when online
await queueMessage(conversationId, content, userId);

// Queue task completion
await queueTaskCompletion(taskId);
```

### Sending Push Notifications

```typescript
import { sendPushNotification } from '@/lib/push/send-notification';

// Send push to a user
await sendPushNotification(userId, {
  title: 'New Message',
  body: 'You have a new message from John',
  url: '/conversations/abc123',
  icon: '/icon-192x192.png',
});
```

### Subscribing to Push (Client-side)

```typescript
import { subscribeToPushNotifications } from '@/lib/push/notifications';

// Request permission and subscribe
const success = await subscribeToPushNotifications('My Device');
```

---

## 📊 Offline Capabilities

### What Works Offline:

✅ **Read Access:**
- View cached projects (last 10 viewed)
- Read cached messages (last 50 per conversation)
- View pulse tasks (last 7 days)
- See notifications (last 30 days)
- Access user profile

✅ **Write with Queue:**
- Send messages (queued, sent when online)
- Complete pulse tasks (optimistic, synced later)
- React to messages (queued)
- Mark notifications as read (synced later)

❌ **Requires Online:**
- Real-time updates (Supabase Realtime)
- File uploads/downloads
- Payments (Stripe)
- Creating new projects
- Search/filtering
- AI form copilot

---

## 🎨 Customization

### Adjust Cache Sizes

Edit `/lib/db/offline-storage.ts`:

```typescript
// Keep more projects
export async function getCachedProjects(limit = 20) { // Changed from 10

// Keep more messages per conversation
cached.messages = cached.messages.slice(-100); // Changed from 50
```

### Modify Service Worker Caching

Edit `next.config.ts` to adjust caching strategies:

```typescript
runtimeCaching: [
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
    handler: "NetworkFirst",
    options: {
      cacheName: "api-cache",
      networkTimeoutSeconds: 5, // Increase timeout
      expiration: {
        maxEntries: 100, // Cache more entries
        maxAgeSeconds: 10 * 60, // Keep for 10 minutes
      },
    },
  },
]
```

### Customize Install Prompt

Edit `/components/install-prompt.tsx`:

```typescript
// Show prompt after fewer visits
if (visitCount >= 1) { // Changed from 3

// Show prompt sooner
setTimeout(() => {
  setShowPrompt(true);
}, 10000); // Changed from 30000 (10 seconds instead of 30)
```

---

## 🐛 Troubleshooting

### Service Worker Not Registering

1. Check HTTPS (required for PWA)
2. Clear browser cache
3. Check DevTools → Application → Service Workers
4. Look for errors in console

```bash
# Unregister old service worker in DevTools Console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

### Push Notifications Not Working

1. Verify VAPID keys are set in `.env`
2. Check notification permission is granted
3. Ensure service worker is active
4. Check browser support (iOS requires 16.4+)

```typescript
// Check permission status
console.log('Permission:', Notification.permission);

// Check subscription
const sub = await navigator.serviceWorker.ready
  .then(reg => reg.pushManager.getSubscription());
console.log('Subscription:', sub);
```

### Offline Sync Not Working

1. Check IndexedDB in DevTools → Application → Storage
2. Verify pending mutations are queued
3. Check network tab for sync attempts

```typescript
// Debug pending mutations
import { getPendingMutations } from '@/lib/db/offline-storage';
const mutations = await getPendingMutations();
console.log('Pending:', mutations);
```

### Icons Not Showing

1. Verify all icon files exist in `/public/`
2. Check manifest.json paths are correct
3. Clear browser cache
4. Run Lighthouse audit

---

## 📱 Testing on Devices

### Android (Chrome)

1. Build and deploy to production
2. Visit site on mobile
3. Chrome will show "Add to Home Screen" banner
4. Install and test offline mode

### iOS (Safari)

1. Deploy to production (HTTPS required)
2. Visit in Safari
3. Tap Share → Add to Home Screen (manual install)
4. Test offline features

**Note:** iOS has limitations:
- No automatic install prompt
- Push notifications require iOS 16.4+
- No background sync support

---

## 🔒 Security Notes

1. **VAPID Private Key:** Never commit to git, use environment variables only
2. **Push Subscriptions:** Encrypted end-to-end, stored securely in database
3. **RLS Policies:** Users can only access their own subscriptions
4. **HTTPS Required:** PWA features only work over secure connections

---

## 📈 Monitoring

### Check Storage Usage

```typescript
import { getStorageInfo } from '@/lib/db/offline-storage';

const info = await getStorageInfo();
console.log('Storage:', info);
// { projects: 10, conversations: 5, notifications: 30, ... }
```

### Monitor Sync Queue

```typescript
import { getSyncQueue } from '@/lib/offline/sync-queue';

const queue = getSyncQueue();
queue.onSyncStatusChange(() => {
  console.log('Syncing:', queue.isSyncing());
});
```

---

## 🎯 Next Steps

1. **Generate and add VAPID keys** to `.env`
2. **Create PWA icons** from favicon
3. **Run database migration**
4. **Test in production** with real devices
5. **Monitor usage** and adjust cache sizes as needed

For questions or issues, check the code comments or reach out to the team!
