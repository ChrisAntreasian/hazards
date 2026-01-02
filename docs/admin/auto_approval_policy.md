---
title: Auto-Approval & Moderation Policy
---

# Auto-Approval & Moderation Policy

This note explains the automated pre-screening thresholds and how the system treats submissions from high-trust users.

## Key thresholds and behavior
- **auto_approve_threshold** (default: 500)
  - Users with trust score >= this value are eligible for *auto-approval* when their *adjusted risk* is low.
- **auto_reject_threshold** (default: 0.9 confidence)
  - When the pre-screening confidence is very high and the adjusted risk is high (>= 0.8), the system may auto-reject the submission.
- **Risk calculation**
  - Raw risk is computed from content, images, and location checks.
  - The system applies a trust multiplier based on the user's trust score (e.g., >=500 -> 0.3, >=200 -> 0.5, >=50 -> 0.8). This reduces the effective risk for trusted users.
- **Decision rules** (summary)
  - Auto-approve: user trust >= auto_approve_threshold AND adjusted risk < 0.2
  - Auto-reject: confidence >= auto_reject_threshold AND adjusted risk >= 0.8
  - Flag for review: adjusted risk >= 0.6 (and flagging enabled)
  - Queue for review: default when none of the above conditions apply

## High-risk submissions
- High raw risk submissions are *not* auto-approved regardless of trust. Trusted users reduce risk via multiplier, but if the adjusted risk remains above thresholds the submission will be flagged or queued for human review.

## Configuration & admin controls
- The admin UI exposes toggles and fields under **System Configuration → Moderation**:
  - `Require Moderator Approval for High-Risk Submissions` (boolean)
  - `Allow Trusted Users to Bypass Moderation` (boolean)
  - `auto_approve_threshold` and other pre-screening settings are configurable in the system config (see `System Configuration` API).
- Admins can tune thresholds depending on community maturity and volume of submissions.

## UX & recommended behavior
- Display clear status messages to submitters: `Auto-approved`, `Queued for review`, `Flagged for priority review`, `Auto-rejected` with estimated review times where applicable.
- Show a `Trusted` badge on user profiles and hazard submissions when bypass or auto-approval applied, with a short tooltip: “Auto-approval eligibility: trust ≥ 500; high-risk content still requires review.”

## Example scenarios
- Example 1: Raw risk 0.90, trust 600 → adjusted risk 0.27 → queued (not auto-approved) because adjusted risk > 0.2
- Example 2: Raw risk 0.15, trust 600 → adjusted risk 0.045 → auto-approved
- Example 3: Confidence 0.95, adjusted risk 0.85 → auto-reject

## Acceptance criteria for testing
- Tests confirm that users with trust >= `auto_approve_threshold` and adjusted risk < 0.2 are auto-approved.
- Tests confirm that high-confidence, high-risk submissions are auto-rejected even for trusted users.
- Tests confirm that flagged submissions generate moderation queue items and that flags can be created by any authenticated user.

---


If you'd like, I can add this note as an in-app help popup or a linked admin documentation page. The admin UI already has toggles for `trusted_user_bypass` and related options; this doc explains their interaction with automated screening.

---

**Post-MVP Feature Ideas:**
See [Post-MVP Feature Ideas](../planning/post_mvp_features.md) for a list of features and enhancements under consideration for future releases.
