# Prompt: Implement Offline-First Form Handling

## Objective

Implement offline-first form handling across all data submission flows. All form data must be stored locally (in IndexedDB) when submission fails due to network issues. Upon connectivity re-establishment, pending data must be automatically submitted to the backend with synchronization integrity guarantees.

## Requirements

### 1. Local Storage Layer
- Create a generic `OfflineQueue` module using IndexedDB (via `idb` library or raw IndexedDB API). Do NOT use `localStorage` for pending submissions—IndexedDB is required for structured data with query capability.
- The queue must store:
  - `id` (auto-increment)
  - `endpoint` (the API URL)
  - `method` (POST, PUT, PATCH, DELETE)
  - `headers` (serialized)
  - `body` (serialized JSON)
  - `createdAt` (timestamp)
  - `retryCount` (number of attempts)
  - `maxRetries` (default: 5)
- Export functions: `enqueue`, `dequeue`, `peek`, `getQueueLength`, `clearQueue`

### 2. Form Submission Wrapper
- Create a `useOfflineForm` hook (or HOC) that wraps the submission logic:
  - On submit: attempt the fetch to the API endpoint.
  - On success: return success to the UI, show a "Saved" confirmation.
  - On network failure (`fetch` throws `TypeError`, `AbortError`, or `res.status >= 500` with no response): serialize the submission payload, `enqueue` it to IndexedDB, show an "Saved offline — will sync when connected" indicator.
  - On non-network server errors (4xx): surface the error to the user immediately (do not queue).
- The hook must return: `{ submit, isPending, isOfflineQueued, lastSyncStatus, queueLength }`

### 3. Connectivity Monitoring
- Use `navigator.onLine` + `window.addEventListener("online" / "offline")` to track connectivity state.
- Expose a `useConnectivity` hook that returns `{ isOnline, wasOffline }`.
- When transitioning from offline to online:
  1. Set a flag `isSyncing = true`.
  2. Process the queue in FIFO order.
  3. For each queued item: attempt the fetch. On success, `dequeue`. On transient failure, increment `retryCount` and skip (retry next cycle). On permanent failure (4xx), `dequeue` and log to console.error with full payload dump.
  4. After all items processed, set `isSyncing = false`.
  5. If any items remain, schedule the next sync attempt with `setTimeout` (exponential backoff: 1s, 2s, 4s, 8s, max 30s).

### 4. User Feedback
- Show a persistent banner/pill component in the app header (or next to each form) indicating:
  - `🟢 Online — All saved` (when queue is empty and online)
  - `🟡 Offline — Saving locally` (when offline and data is queued)
  - `🔵 Syncing — {n} items pending` (when online and actively syncing)
  - `🔴 Sync failed — {n} items` (when retries exhausted)
- The component must be accessible, respect `prefers-reduced-motion`, and not be announced by screen readers during rapid status updates.

### 5. Synchronization Integrity
- Each queued item must include the original `createdAt` timestamp so the backend can deduplicate if needed.
- The sync processor must not allow duplicate submissions: check by `id` + `createdAt` hash before enqueueing.
- If the user submits the same form twice while offline, the second submission should replace the first (same `endpoint` + idempotency key) rather than appending.
- After sync completes, invalidate relevant React Query caches (`queryClient.invalidateQueries`).

### 6. Integration Points
- Integrate `useOfflineForm` into:
  - `/employees/add-employee-form.tsx` (POST /api/employees)
  - `/addemployees/add-employee-form.tsx` (POST /api/employees, POST /api/files)
  - `/orgmenu/members/invite/invite-form.tsx` (POST /api/organizations/invite)
  - `/orgmenu/settings/settings-form.tsx` (settings save)
  - `/employees/employee-edit-form.tsx` (PUT /api/employees/:id)
  - `/clients/*` (client CRUD)
  - `/projects/*` (project CRUD)
  - `/teams/*` (team CRUD)
  - `/tasks/*` (task CRUD)
  - `/time-entries/*` (time entry CRUD)

### 7. Testing
- Write unit tests for:
  - `enqueue` / `dequeue` / `peek` operations
  - Queue FIFO order guarantee
  - Duplicate prevention by idempotency key
  - Retry count increment and max retries exhaustion
  - Queue persistence across page reload (IndexedDB survival)
- Write integration tests for:
  - Form submission while `navigator.onLine = false` queues the data
  - `window.dispatchEvent(new Event("online"))` triggers queue processing
  - Successful sync removes items from queue
  - Failed sync with 4xx removes item and logs error
  - Failed sync with network error retries with backoff

## Files to Create

| File | Purpose |
|---|---|
| `lib/offline/queue.ts` | IndexedDB queue implementation |
| `lib/offline/use-offline-form.ts` | Hook wrapping form submit with offline queue |
| `lib/offline/use-connectivity.ts` | Hook tracking online/offline state |
| `lib/offline/sync-processor.ts` | Background sync processor |
| `components/offline-banner.tsx` | UI component showing sync status |

## Non-Goals
- Do not implement service workers or Workbox — this prompt only covers IndexedDB + periodic sync.
- Do not implement conflict resolution (last-write-wins is acceptable for v1).
- Do not modify backend endpoints for idempotency — the client-side `createdAt` hash is sufficient for deduplication.

## Files to Modify

| File | Change |
|---|---|
| `frontend/package.json` | Add `idb` dependency |
| `lib/services/employee-service.ts` | Wrap with `useOfflineForm` |
| `app/employees/add-employee-form.tsx` | Replace `useMutation` with `useOfflineForm` |
| `app/addemployees/add-employee-form.tsx` | Replace `useMutation` with `useOfflineForm` |
| `app/orgmenu/settings/settings-form.tsx` | Wrap save with offline handler |
| `app/orgmenu/members/invite/invite-form.tsx` | Wrap fetch with offline handler |
| `app/layout.tsx` | Add `<OfflineBanner />` |
