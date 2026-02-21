---
phase: quick-002
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/projects/[id]/mentionables/route.ts
  - features/projects/actions/documentActions.ts
  - lib/api/mentionables.ts
  - lib/api/notifications-utils.ts
  - components/ui/mention-node.tsx
autonomous: true
requirements: [MENTION-01, MENTION-02, MENTION-03]

must_haves:
  truths:
    - "Typing @ in gameplan editor shows all users who can access the project (dfy_partner, assigned_dev, client, all admins/internals)"
    - "Saving a document with a new @mention triggers a notification to the mentioned user"
    - "Mention notification links to the project gameplan tab"
    - "No Star Wars characters appear anywhere in the codebase"
  artifacts:
    - path: "app/api/projects/[id]/mentionables/route.ts"
      provides: "Expanded mentionables API returning all project-accessible users"
      contains: "role.*admin.*internal"
    - path: "features/projects/actions/documentActions.ts"
      provides: "Fixed getMentionablesAction with full user scope + mention detection in updateGameplanContentAction"
      contains: "createNotification"
    - path: "lib/api/mentionables.ts"
      provides: "Fixed getProjectMentionables using correct query pattern (not project_assignments)"
      contains: "admin.*internal"
    - path: "components/ui/mention-node.tsx"
      provides: "Clean mention-node without hardcoded data"
  key_links:
    - from: "features/projects/actions/documentActions.ts"
      to: "lib/api/notifications.ts"
      via: "createNotification call on new mentions"
      pattern: "createNotification.*mention"
    - from: "features/projects/actions/documentActions.ts"
      to: "lib/supabase/admin.ts"
      via: "admin client for querying all admin/internal profiles"
      pattern: "createAdminClient"
---

<objective>
Fix the broken @mention system in gameplan documents by expanding the mentionables query to include all project-accessible users, triggering notifications on new mentions, and cleaning up dead code.

Purpose: The @mention autocomplete currently only finds 0-2 users (dfy_partner + assigned_dev), making it effectively useless. This fix makes mentions work correctly and adds notification integration.
Output: Working @mention autocomplete with full user scope, mention notifications, and clean codebase.
</objective>

<execution_context>
@/Users/aymanbaig/.claude/get-shit-done/workflows/execute-plan.md
@/Users/aymanbaig/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@app/api/projects/[id]/mentionables/route.ts
@features/projects/actions/documentActions.ts
@lib/api/mentionables.ts
@lib/api/notifications.ts
@lib/api/notifications-utils.ts
@lib/api/notification-helpers.ts
@components/ui/mention-node.tsx
@components/editor/plugins/gameplan-mention-kit.tsx
@features/projects/components/gameplan/GameplanEditor.tsx
@features/projects/components/tabs/GameplanTabWrapper.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand mentionables query to include all project-accessible users</name>
  <files>
    app/api/projects/[id]/mentionables/route.ts
    features/projects/actions/documentActions.ts
    lib/api/mentionables.ts
  </files>
  <action>
Fix all three mentionables data sources to return the complete set of users who can access a project. The pattern is the same for all three — expand the user query to include:

1. `projects.dfy_partner_id` (DFY partner)
2. `projects.assigned_dev_id` (assigned dev)
3. `projects.client_id` (client — the projects table has `client_id` column with FK `projects_client_id_fkey` to profiles)
4. ALL profiles with role `admin` or `internal` (they always have project access)

**In `features/projects/actions/documentActions.ts` — `getMentionablesAction()`:**
- Keep existing adminClient pattern and auth check
- Expand the project select to include: `client:profiles!projects_client_id_fkey(id, name, email)` alongside existing dfy_partner and assigned_dev
- After adding dfy_partner and assigned_dev to userMap, add the client the same way
- Add a separate query: `adminClient.from('profiles').select('id, name, email').in('role', ['admin', 'internal'])` to fetch all admin/internal users
- Loop over admin results and add each to userMap (deduplication handled by Map)
- This is the PRIMARY data source used by GameplanTabWrapper

**In `app/api/projects/[id]/mentionables/route.ts`:**
- Same expansion pattern as the server action above
- Add client to the project select, add client to userMap
- Add admin/internal profiles query and add them to userMap
- Keep existing adminClient fallback pattern

**In `lib/api/mentionables.ts` — `getProjectMentionables()`:**
- Remove the `project_assignments` query (that table does not exist — it will error silently or throw)
- Replace with the same pattern: query project for dfy_partner, assigned_dev, and client
- Add query for admin/internal profiles
- Use admin client (import from `@/lib/supabase/admin`) instead of regular client to bypass RLS, following the pattern in the other two files
- Keep the existing deduplication via Map
- Keep the existing deliverables query as-is
- Keep the `searchMentionables` function as-is (it delegates to `getProjectMentionables`)

All three files already import createAdminClient or should. Ensure admin client is used for the profiles query since regular client may not have RLS access to all profiles.
  </action>
  <verify>
Run `npx tsc --noEmit` to verify no type errors. Grep for "project_assignments" in lib/api/mentionables.ts to confirm removal. Grep for "admin.*internal" in all three files to confirm admin query was added.
  </verify>
  <done>
All three mentionables data sources return: dfy_partner + assigned_dev + client + all admin/internal profiles, deduplicated. The project_assignments phantom reference is removed from lib/api/mentionables.ts.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add mention detection and notifications on document save</name>
  <files>
    features/projects/actions/documentActions.ts
    lib/api/notifications-utils.ts
  </files>
  <action>
**Add mention detection to `updateGameplanContentAction` in `features/projects/actions/documentActions.ts`:**

1. Add a helper function `extractMentionUserIds(content: unknown): string[]` at the top of the file (or before the action). This function:
   - Takes Plate.js content (which is an array of node objects)
   - Recursively walks the node tree looking for nodes where `type === 'mention'` AND `trigger === '@'`
   - For each mention node, extracts the `key` field (which contains the user ID — see how GameplanEditor maps `u.id` to `key` in MentionableItem)
   - Returns a deduplicated array of user IDs
   - Uses a recursive approach: if a node has `children` (array), recurse into each child. If a node has `type === 'mention'` and `trigger === '@'`, collect its `key`.
   - Handle edge cases: content is not an array (return []), nodes without children (skip), mention without key (skip)

2. Modify `updateGameplanContentAction` to detect new mentions:
   - BEFORE calling `updateProjectDocument`, fetch the current document content: `const { data: currentDoc } = await supabase.from('project_documents').select('content').eq('id', documentId).single()`
   - Extract mention IDs from the OLD content: `const oldMentions = new Set(extractMentionUserIds(currentDoc?.content))`
   - Extract mention IDs from the NEW content: `const newMentions = extractMentionUserIds(content)`
   - Find truly NEW mentions: `const addedMentions = newMentions.filter(id => !oldMentions.has(id))`
   - After the existing save logic completes, for each new mention user ID (excluding the current user `user.id`):
     - Call `createNotification({ userId: mentionedUserId, type: 'mention', title: 'You were mentioned in a gameplan', message: 'Someone mentioned you in a project gameplan document', projectId, actorId: user.id })`
   - Use `Promise.allSettled` for fire-and-forget notification delivery (don't block save)
   - Import `createNotification` from `@/lib/api/notifications`
   - Log errors but don't throw — mention notification failure should never block document save

**Fix mention notification URL in `lib/api/notifications-utils.ts`:**
- In `getNotificationUrl`, find the `case 'mention':` line (currently grouped with `admin_comment` routing to `?tab=activity`)
- Change `mention` to route to `?tab=gameplan` instead of `?tab=activity`
- Move the `case 'mention':` out of the `admin_comment` group and give it its own return: `return \`/projects/\${projectId}?tab=gameplan\``
- Keep `admin_comment` routing to `?tab=activity` as before
  </action>
  <verify>
Run `npx tsc --noEmit` to verify no type errors. Grep for "createNotification" in documentActions.ts to confirm it was added. Grep for "gameplan" in notifications-utils.ts to confirm the URL was updated. Verify extractMentionUserIds handles the recursive Plate.js node structure.
  </verify>
  <done>
Saving a gameplan document with new @mentions triggers a `mention` notification to each newly mentioned user (excluding the author). Mention notifications link to `/projects/{id}?tab=gameplan`. Notification delivery is fire-and-forget and never blocks document save.
  </done>
</task>

<task type="auto">
  <name>Task 3: Remove dead Star Wars mention code</name>
  <files>
    components/ui/mention-node.tsx
  </files>
  <action>
Clean up `components/ui/mention-node.tsx`:

1. Delete the entire `MENTIONABLES` array (lines 121-196) containing hardcoded Star Wars character names
2. Delete the `MentionInputElement` component (lines 80-119) that references the deleted MENTIONABLES array — this is the old generic mention input that was replaced by `UserMentionInputElement` and `DeliverableMentionInputElement` in `gameplan-mention-kit.tsx`
3. Delete the `const onSelectItem = getMentionOnSelectItem()` line (line 78) that was only used by the deleted MentionInputElement
4. Remove the now-unused import `getMentionOnSelectItem` from `@platejs/mention`
5. Remove any other imports that become unused after deleting MentionInputElement (check: `InlineCombobox*` imports — if MentionElement doesn't use them, remove them)
6. Keep the `MentionElement` component — it is the rendered mention chip used throughout the editor
7. Check that MentionElement's remaining imports are all still needed: `PlateElement`, `useFocused`, `useReadOnly`, `useSelected`, `useMounted`, `cn`, `IS_APPLE`, `KEYS`

Verify no other files import `MentionInputElement` or `MENTIONABLES` from this file before deleting.
  </action>
  <verify>
Run `npx tsc --noEmit` to verify no type errors from removed exports. Grep for "Star Wars\|Aayla\|Boba Fett\|MENTIONABLES" across the codebase to confirm all dead data is gone. Grep for "MentionInputElement" to confirm nothing imports the deleted component (only `UserMentionInputElement` and `DeliverableMentionInputElement` from gameplan-mention-kit.tsx should remain).
  </verify>
  <done>
The Star Wars hardcoded data and unused MentionInputElement component are removed from mention-node.tsx. Only the MentionElement render component remains. No broken imports elsewhere.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Grep confirms no references to `project_assignments` in mentionables code
3. Grep confirms no Star Wars character names in codebase
4. Grep confirms `createNotification` is called in `updateGameplanContentAction`
5. Grep confirms mention notification URL points to `?tab=gameplan`
6. All three mentionables sources (API route, server action, lib function) query for admin/internal profiles
</verification>

<success_criteria>
- Typing @ in gameplan editor shows all project-accessible users (dfy_partner, assigned_dev, client, all admins/internals) — not just 0-2 users
- Saving a document with a new @mention creates a notification for the mentioned user
- Mention notifications link to the gameplan tab, not the activity tab
- No hardcoded Star Wars data exists in the codebase
- No TypeScript compilation errors
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-broken-mentions-connect-autocomplete/2-SUMMARY.md`
</output>
