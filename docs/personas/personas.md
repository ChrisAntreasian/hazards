---
title: User Personas
---

# User Personas

These persona cards capture representative users and their goals, motivations, technical comfort, constraints, and acceptance criteria. Use these to drive UI decisions, user stories, and test scenarios.

---

## 1) Newcomer Nora (Role: `new_user`) 👋
- Tech comfort: Low — mobile-first, expects simple guided flows.
- Goals: Report a hazard quickly and confirm it was received.
- Constraints: Short on time, limited knowledge of the app.
- Behavior: Follows prompts, expects status feedback and small, friendly guidance.
- Acceptance criteria:
  - Can submit a report with title, photo, and location in three steps or fewer.
  - Receives a clear message: Auto-approved / Queued / Flagged / Auto-rejected.
  - If queued/flagged, sees estimated review time and an option to edit or provide more info.

---

## 2) Regular Contributor Raj (Role: `contributor`) 📝
- Tech comfort: Medium — uses web & mobile regularly.
- Goals: Keep hazard info accurate; learn how to avoid rejections.
- Behavior: Edits and revisits own hazards, watches trust score progress.
- Acceptance criteria:
  - Inline prescreen suggestions appear when submitting (e.g., improve image clarity).
  - Resubmissions are faster and provide actionable feedback on why previous submission failed.

---

## 3) Trusted Tara (Role: `trusted_user`) ⭐
- Tech comfort: Medium–High — active community member; mentors others.
- Goals: Make low-risk contributions fast and reliably; file provisional categories when needed.
- Behavior: Expects some bypass for trusted content, but accepts that high-risk items still need review.
- Acceptance criteria:
  - Low-risk submissions auto-approve when trust ≥ `auto_approve_threshold` and adjusted risk < 0.2.
  - Can create provisional categories (requires trust threshold, default 500) and see their provisional status.

---

## 4) Moderator Mia (Role: `moderator`) 🛡️
- Tech comfort: High — uses moderation dashboard often.
- Goals: Triage urgent items, maintain content quality, respond to flags quickly.
- Behavior: Works through a queue, assigns items, and communicates decisions.
- Acceptance criteria:
  - Moderation queue surfaces urgent/high-confidence issues first.
  - Moderators can view full hazard details (no `Unknown Hazard`) and perform approve/reject actions that update status and trust points.

---

## 5) Admin Alex (Role: `admin`) 🧭
- Tech comfort: High — configures thresholds, audits logs, manages users.
- Goals: Tune system behavior to balance safety and friction.
- Behavior: Changes thresholds, reviews audit logs, promotes/demotes users as needed.
- Acceptance criteria:
  - Admin UI shows policy notes and links to docs (like the auto-approval policy).
  - Changes to thresholds are persisted and affect subsequent submissions as expected.

---

## 6) Jessica the Runner (Role: `new_user` / `contributor`) 🏃‍♀️
- Tech comfort: Medium — smartphone-first, wants minimal friction when reporting during runs.
- Goals: Capture a hazard quickly (photo + coordinates) with minimal stopping.
- Constraints: Short time, possibly running on a narrow path, limited attention.
- Behavior: Uses a fast-capture flow; expects GPS auto-fill and the ability to add details later.
- UX implications / recommendations:
  - Provide a “Quick Report” button that captures photo + GPS and optionally short auto-filled title (based on category suggestions or quick tags), then lets user submit with a tap.
  - Allow users to edit the report later in their “My Reports” view and add more photos/details.
  - Show immediate confirmation and a status line (Queued / Auto-approved / Flagged).
- Acceptance criteria:
  - Quick Report flow takes ≤ 15 seconds to complete (photo + submit).
  - GPS coordinates are attached automatically and visible on the hazard detail.
  - User can add more details later; the hazard is listed in user's account immediately after submission.

---

## 7) Wendel the Hiker (Role: `contributor` / `trusted_user`) 🥾
- Tech comfort: Medium — likes maps and route planning, sometimes offline.
- Goals: Scout a hiking route for family trip—document hazards along the route and compile a route-safe checklist.
- Constraints: May be offline in parts of hikes; prefers bulk capture and route export.
- Behavior: Captures multiple hazards per outing, tags them to a route, and reviews them later for planning.
- UX implications / recommendations:
  - Support a “Trip Mode” that allows local buffering of hazard reports offline and batch upload when online.
  - Allow marking hazards as part of a named route/trip and basic export/print of the route and hazards.
  - Provide map-based route view where hazards are annotated with notes and images.
- Acceptance criteria:
  - Trip Mode accepts captures offline and syncs when an internet connection is restored.
  - User can tag hazards to a route and export a simple route+hazard list (CSV/printable view).

---

## 8) Jackie the Planner (Role: `new_user` / `contributor`) 🧳
- Tech comfort: Low–Medium — planning-oriented; may be offline on vacation.
- Goals: Plan family activities safely and identify potential hazards at planned locations before travel.
- Constraints: Intermittent connectivity, needs to assemble activities and risk notes for family.
- Behavior: Uses the app to save locations, review hazard details offline, and make simple notes for the itinerary.
- UX implications / recommendations:
  - Provide a “Save for trip” / bookmark feature that allows saving hazard details and maps for offline viewing.
  - Offer an itinerary export that includes hazard summaries, severity, and any travel notes.
- Acceptance criteria:
  - The user can save and view hazards offline for a planned trip.
  - The itinerary export contains hazard name, short description, photos (or thumbnails), and severity tags.

---

## Notes on role mapping and policies
- Jessica, Wendel, and Jackie are primarily contributors but may progress to `trusted_user` over time. Their flows emphasize *fast capture*, *offline support*, and *route/planning tools*, which will guide UI changes and tests.

---

If you'd like, I can now convert one or more of these personas into detailed user stories and acceptance tests — I recommend starting with **Jessica (quick report)** and **Wendel (trip/offline)** because they drive clear UX changes (quick-capture and offline/batch sync) that we can implement and test. Which would you like me to tackle first?
