---
title: Roles & Behaviors
---

# Roles & Behaviors

This document summarizes the application roles found in the live schema and describes typical responsibilities, expected UI interactions, and acceptance criteria that we can use to drive personas and Playwright tests.

> Note: The live DB includes these roles (from `user_role` enum): `new_user`, `contributor`, `trusted_user`, `content_editor`, `moderator`, `admin`, `banned`.

---

## Role summaries

### `new_user` ✅
- Typical responsibilities: Create hazards and basic contributions while earning trust.
- UI interactions: Access to hazard creation form, image uploads, and submitting reports; can edit/delete their own hazards.
- Permissions: Cannot access moderation tools; limited trust-based operations (e.g., needs approval in some workflows).
- Test ideas: Create hazard, confirm it's created and owned by the user, confirm it appears in moderation queue (if expected) and is not editable by other users.

### `contributor` ✅
- Typical responsibilities: Active reporters who submit and maintain hazards.
- UI interactions: All `new_user` actions plus ability to re-open or update own hazards and flag others' hazards.
- Permissions: No moderation powers; may have higher content-rate limits.
- Test ideas: Create + update hazard; attempt moderation actions and confirm denial.

### `trusted_user` ✅
- Typical responsibilities: Long-standing contributors with higher trust for minor edits.
- UI interactions: Can edit hazard content more freely, faster submission workflows.
- Permissions: Still not a moderator; may bypass some soft checks (config dependent).
- Test ideas: Edit hazard of another minor category (if policy allows) and confirm behavior.

### `content_editor` ✏️
- Typical responsibilities: Edit content site-wide (typos, categorization, non-moderation edits).
- UI interactions: Editorial interface for hazard text, categories, and images (not necessarily moderation decisions).
- Permissions: Elevated read/edit rights on hazards; included in some RLS policies (see notes).
- Test ideas: Edit a hazard content not owned by the editor; ensure the change persists and is reflected in detail pages.

### `moderator` 🛡️
- Typical responsibilities: Review pending hazards, resolve disputes, handle flags, and move hazards through statuses (approve/reject/resolve/require edits).
- UI interactions: Full moderation queue, hazard detail moderation panel, flag management, quick actions (approve/reject/assign priority).
- Permissions: Read access to pending hazards (RLS policy required — applied during recent fix), ability to modify hazard status and moderation records.
- Test ideas: Visit moderation queue, open a pending hazard, view its details (no 'Unknown Hazard'), perform approve/reject actions and confirm DB state changes & notifications.

### `admin` 🏁
- Typical responsibilities: Full system administration — user role management, system settings, and emergency actions.
- UI interactions: Admin dashboard, user management, and access to advanced tooling and logs.
- Permissions: Full access including user role changes and higher-risk operations.
- Test ideas: Create a user, promote to `moderator`, confirm moderator can now perform moderation actions and read pending hazards.

### `banned` ⛔
- Typical responsibilities: N/A — user is restricted.
- UI interactions: Minimal or blocked; cannot create or edit hazards; often prevented from logging in or from taking actions.
- Permissions: Restricted; specific RLS/endpoint checks enforce bans.
- Test ideas: Attempt hazard creation and confirm rejection; ensure ban prevents critical interactions.

---

## Implementation notes & RLS considerations 🔧
- RLS: Tests and persona-driven scripts must assume RLS is enabled for hazards and moderation tables. Our recent change added a policy to allow `moderator`/`admin` read access to pending hazards — tests should verify moderators see hazard details instead of `Unknown Hazard`.
- Testing setup: Playwright scripts should use distinct test users per role. Where possible, create test users and assign roles via an admin or a test setup script; avoid relying on service-role in end-to-end assertions unless explicitly part of the test.
- Edge cases: `content_editor` and `trusted_user` privileges vary by policy; confirm behavior in acceptance tests and update doc if policies change.

---

## Suggested Playwright scenarios (high-level) 🎯
- New user: Sign up → Create hazard → Upload image → Confirm hazard appears for owner and is visible in their dashboard but appears pending in moderation.
- Contributor / Trusted: Sign in → Edit own hazard → Confirm changes persist → Attempt moderation action and assert it's rejected.
- Moderator: Sign in as moderator → Open moderation queue → Open a pending hazard (should show full details) → Approve hazard → Confirm status and that the hazard is now visible publicly per app rules.
- Admin: Sign in as admin → Promote test user to moderator → Confirm role change and moderator privileges in subsequent sessions.

---

## Acceptance criteria (for persona work)
- A roles doc exists and is based on live DB enums and RLS behavior. ✅
- For each role we have 1–3 Playwright test scripts that exercise core flows and permission boundaries. ✅
- Tests confirm that moderators can view pending hazards (no `Unknown Hazard`) and that role-restricted actions are blocked when appropriate. ✅

---

If you'd like, next I can draft specific persona cards (name, goals, pain points) and convert the suggested scenarios into concrete Playwright test files under `test/e2e/personas/`.

File created: `docs/personas/roles_and_behaviors.md` ✅
