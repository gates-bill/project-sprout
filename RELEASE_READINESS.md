# Project Sprout release readiness

This repository is prepared for an internal TestFlight build after the backend migrations and Edge Function below are deployed and the manual blockers are resolved. It is not ready for external TestFlight or App Store review until public policy/support URLs, final identifiers/assets, and deployed-device scenarios are verified.

## Required backend deployment

Use a linked Supabase CLI project and review the target project before applying anything:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
supabase functions deploy delete-account
```

The migrations under `supabase/migrations` define the shared-care tables, constraints, indexes, RLS policies, private photo bucket, invite/membership RPCs, durable activity and active-sleep RPCs, date-only birth dates, and account-deletion RPC. The delete function receives Supabase runtime secrets server-side; never add a service-role key to the Expo app.

Before production, run the migrations against a staging clone or backup. The baseline was inferred from app queries because this repository does not contain a database dump. Confirm existing production column types and constraints with `supabase db diff` before applying it to populated production data. The birth-date validation migration intentionally fails if existing future dates exist; correct those records rather than bypassing the check.

Configure Auth URL settings:

- Site URL: the final public product/support site.
- Additional redirect URL: `projectsprout://reset-password`.
- Keep email confirmation enabled for production and customize confirmation/recovery email templates.
- Set appropriate email delivery/SMTP limits; test resend and recovery on a real device.

## EAS and store setup

1. Decide the permanent app name, iOS bundle ID, Android package, and URL scheme. `com.projectsprout.app` and `projectsprout` are release candidates, not confirmed legal/brand decisions; identifiers are difficult to change after store release.
2. Replace/approve every file in `assets/images` at App Store production sizes. Current assets have not been approved as final branding.
3. Run `eas init`, then add the resulting EAS project ID to app config if prompted.
4. Store only the Supabase URL and publishable key in EAS environment variables.
5. Build with `eas build --platform ios --profile preview` for internal testing, then `eas build --platform ios --profile production`.
6. Submit with `eas submit --platform ios --profile production` only after privacy metadata and reviewer material are complete.
7. Verify EAS Update channels and runtime compatibility before publishing an update. Native dependency/config changes require a new binary.

## Public policy and support blockers

`lib/appLinks.ts` intentionally contains blank placeholders. Supply real HTTPS values and expose them in Settings before external TestFlight/App Store review:

- Privacy Policy URL
- Support URL or monitored support contact
- Optional Terms URL

The privacy policy must describe account/profile data, child-related care records, shared caregivers, photos, Supabase processing/storage, local device cache, report/PDF generation, retention, membership removal, and account/data deletion. Explain that shared family history remains when a caregiver deletes their own account and an owner remains.

For App Store Connect privacy answers, review at least identifiers/contact info (email/account ID), user content (baby name, birth date, care notes, photos), health/fitness-adjacent care logs, diagnostics if analytics/crash reporting is later added, and data linked to the account. Project Sprout currently uses Supabase as an authentication/database/storage/Edge Function processor. Re-evaluate answers whenever SDKs are added.

Email/password is the only login method, so Sign in with Apple is not currently required merely because authentication exists. Re-evaluate if Google/Facebook or another third-party social login is added.

## Reviewer access and instructions

Create non-production reviewer accounts with confirmed email and seeded, non-real baby data. Provide:

- owner credentials and a separate caregiver account;
- steps to create/accept a short-lived one-time invite;
- steps showing shared profile/photo and activity refresh;
- steps for caregiver A to start sleep and caregiver B to end it;
- History → Visit Report → Share report;
- caregiver account deletion;
- owner transfer, then deletion; and
- sole-owner deletion.

Do not provide a reusable invite code in review notes because invites expire and are one-time use. Generate one during review or provide both pre-joined accounts.

## Data and conflict behavior

- Local activity creates, edits, and deletes are queued and retried independently. UUID operation IDs make retries idempotent.
- Cloud activity rows have monotonically increasing revisions. Edits/deletes use optimistic revision checks; for this MVP the newer server version wins a detected conflict, and the next download replaces stale local state.
- Active-sleep starts and ends have durable local states. Completion is an atomic server RPC that creates one completed activity and removes the live session once.
- Shared cached data is bound in SecureStore to one account and Care Circle. Sign-out, account switching, or confirmed membership loss clears Sprout caches and generated exports. A matching account may use verified cached shared data while temporarily offline.
- Profile edits are local-first and queued. Failed photo downloads do not erase an existing cached photo. Old cloud photo objects are removed after a successful replacement.
- Birth dates are local calendar dates (`YYYY-MM-DD`), not timestamps.
- Reports are limited to 366 inclusive calendar days and show zero-activity days. A completed sleep is attributed to the local calendar day of its recorded `occurredAt`/completion timestamp, even if it began before midnight. PDF cache files are removed after sharing and during privacy wipe.

## Manual test matrix

Test on at least two physical iPhones plus airplane-mode transitions:

1. Sign up, confirmation-required state, resend, sign in/out, relaunch persistence, forgot/reset password deep link, signed-in password change, expired session, and account switching.
2. Create a Circle/profile with photo; join on phone B; confirm name/date/photo; replace/remove photo; remove B and confirm cached shared data disappears; ensure B cannot read Storage/database rows.
3. Create/edit/delete each activity online and offline; relaunch before reconnect; confirm queued status then convergence without duplicates. Edit the same item on both phones and confirm server-wins conflict messaging/result.
4. Start sleep offline and relaunch; reconnect and observe it on B. End offline and relaunch; confirm stale cloud state cannot resurrect it. End the same sleep nearly simultaneously on both phones and confirm one completed session.
5. Exercise expired/reused/guessed invite codes, caregiver owner-only controls, membership refresh, ownership transfer, sole owner deletion, caregiver deletion, and owner-with-members deletion block.
6. Verify 7/14/30/custom reports, empty and 366-day ranges, rejection beyond 366 days, DST and midnight examples, many/long notes, multi-page PDF, native share cancellation, and no leftover report/export after privacy wipe.
7. Run VoiceOver and larger Dynamic Type through auth, tabs, all activity forms, date/time pickers, destructive confirmations, sync/offline notices, report controls, and empty/error states.

## Remaining engineering verification

The pure calculation tests run locally. RLS authorization, RPC concurrency/idempotency, Storage cleanup, revoked-cache behavior, account deletion, and multi-device offline recovery require a deployed disposable Supabase test project and physical-device integration tests. Do not call those proven until that matrix passes.

No analytics/crash reporter is configured. Decide whether to add a privacy-reviewed production error-reporting service before external testing. Also establish database backups, restore testing, operational alerting, support response ownership, and a data-retention schedule.
