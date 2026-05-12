# 17 — Admin and Staff Spec

Admin surface does not exist in source — the mobile app has no admin role. This is a **new build** specced from `ModerationConfig`, `FraudHold`, `AuditLog`, `Staff`, `Inspection`, and the `tokens` flow that all imply an admin/staff side.

## Roles (Postgres enum `staff_role`)

| Role | Scope | Capabilities |
|---|---|---|
| `super_admin` | platform | everything; only role that can release fraud holds, change `moderation_config`, manage staff |
| `admin` | platform | review queue, approve/reject listings, resolve reports, edit stores/cities, view audit log, view fraud holds (cannot resolve) |
| `store_manager` | one store | manage appointments, run inspections, view store metrics, supervise front_office at that store |
| `inspector` | one store | run inspections, grade listings, view appointments |
| `front_office` | one store | scan tokens at check-in, mark appointments completed, view today's schedule |
| `moderator` | platform | review chat reports, hide messages, add user strikes |

Role assignment via `staff` table. A user can have multiple `staff` rows (e.g., store_manager at iRepair Rhodes AND inspector at iRepair Spot).

## Route map

All admin routes live under `/[locale]/admin`. Server-guarded via a layout that runs:

```tsx
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/auth/login');
const { data: staff } = await supabase
  .from('staff')
  .select('role, store_id')
  .eq('user_id', user.id)
  .eq('is_active', true);
if (!staff?.length) redirect('/');
```

| Route | Min role | Purpose |
|---|---|---|
| `/admin` | any staff | Dashboard with role-specific tiles |
| `/admin/queue` | admin, moderator | All pending listings; approve/reject/hold inline |
| `/admin/listings` | admin | Full listings table with filters and admin actions |
| `/admin/listings/[id]` | admin | Listing detail + audit log + actions (approve/reject/hide/unhide/edit) |
| `/admin/users` | admin | Users table with fraud_score, strikes, restricted_mode |
| `/admin/users/[id]` | admin | User detail; super_admin can release holds and disable tokens |
| `/admin/reports/chat` | moderator | Chat reports queue |
| `/admin/reports/listings` | admin | Listing reports queue |
| `/admin/fraud-holds` | admin (read), super_admin (resolve) | All open fraud holds |
| `/admin/appointments` | store_manager, front_office | Today's schedule + week view at the staff member's store |
| `/admin/appointments/[id]` | store_manager, front_office | Single appointment with token redemption scanner |
| `/admin/inspections/new` | inspector | Run an inspection on a listing or walk-in |
| `/admin/inspections/[id]` | inspector, store_manager | Inspection record (immutable) |
| `/admin/waitlist` | admin | Waitlist signups by city with referral tree |
| `/admin/audit-log` | admin | Filterable audit trail |
| `/admin/settings` | super_admin | `moderation_config`, `grade_config`, store hours/services |
| `/admin/staff` | super_admin | Manage staff assignments |

## Admin queue UI (the main workflow)

Single page listing all entities needing review, ordered by oldest first:

- Listings with `status='pending'` AND `is_held=false`
- Listings with `is_held=true` (fraud holds)
- Chat reports with unresolved status
- Listing reports with `report_count_24h >= threshold`

Each row shows: thumbnail, title, seller (handle + trust_event_count), category, condition, grade, fraud_score, age, and inline actions (Approve, Reject + reason, View). Approve transitions `status='approved'`, writes audit log; reject prompts for `rejection_reason` and writes both audit log and a notification email to the seller.

Approve action shortcuts: `J` next, `A` approve, `R` reject. Keyboard-driven moderation is critical at scale.

## Audit log writes

Every admin action writes to `audit_log`:

```ts
async function audit(action: string, entityType: string, entityId: string, diff?: object) {
  await supabase.from('audit_log').insert({
    actor_type: 'staff',
    actor_id: currentUser.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    diff_json: diff ?? null,
  });
}
```

Standard actions: `listing.approve`, `listing.reject`, `listing.unhide`, `listing.edit`, `user.release_hold`, `user.disable_tokens`, `user.enable_tokens`, `appointment.approve`, `appointment.complete`, `token.redeem`, `inspection.create`, `fraud_hold.resolve`, `staff.create`, `staff.deactivate`, `moderation_config.update`, `grade_config.update`.

## Token redemption flow (front_office)

Staff member opens `/admin/appointments/[id]`. Sees the customer's name, listing (if any), date, time slot, current 6-digit token. Two confirmation steps:

1. Visual match: front_office reads the code on the customer's screen and compares to the displayed code (rotates every 60s).
2. Press "Redeem" — server-side double-checks `token.code` matches, then transitions:

```sql
update public.tokens set is_redeemed = true, redeemed_at = now(), redeemed_by_id = $staff
  where id = $token_id and is_active = true and is_redeemed = false and expires_at > now();
update public.appointments set status = 'checked_in', updated_at = now() where id = $appt_id;
insert into audit_log (...);
```

If the user is `is_held=true` or `tokens_disabled=true`, redemption returns 403 with copy "Account under review — contact super_admin."

## Inspection flow

`/admin/inspections/new` form fields match `checklistJson` schema (see `06_…`). On submit:

1. Insert `inspections` row (immutable after this).
2. Update `listings`: `grade`, `checklist_complete=true`, `inspection_date=now()`, `status='approved'`.
3. Insert `trust_events(user_id=listing.seller_id, event_type='completed_grade', source_entity_id=listing.id)`. Trigger bumps `trust_event_count`.
4. Audit log.
5. Email seller via Resend: "Your listing is verified — grade X" with the i18n template.

## Moderator workflow

Chat reports queue (`/admin/reports/chat`):

- Sortable by reason, age, reporter_handle
- Each row expands to show the conversation context (last 10 messages in that conversation, sender on top)
- Actions: `Confirm violation` → adds strike to sender + hides message permanently; `Dismiss` → unhide message, mark report as `false_positive`
- Moderator cannot see PII beyond handles; emails redacted.

## Settings (super_admin)

`/admin/settings` — single page with three forms:

1. **Moderation thresholds** — edit `moderation_config` (the single row)
2. **Grade multipliers** — edit `grade_config` global row + per-store overrides (table of stores)
3. **Stores** — list of stores; edit hours_json, services, lat/lng, store_page_url

Every save writes to `audit_log` with `diff_json` capturing before/after.

## Staff management (super_admin)

`/admin/staff` — table of `staff` rows. Add: pick a user (email lookup against `auth.users` via admin RPC), pick role, pick store (if role is store-scoped), set `is_active=true`. Deactivate: toggle `is_active=false` (don't delete — preserve audit trail).

## Permissions matrix (server-enforced)

The RLS helper `is_staff(role)` and `is_store_staff(store_id)` enforce reads at the DB level. Mutations are gated by route-handler-level checks AND the service-role client only writes after explicit role check:

```ts
async function requireStaff(allowedRoles: StaffRole[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Response(null, { status: 401 });
  const { data } = await supabase.from('staff').select('role').eq('user_id', user.id).eq('is_active', true);
  if (!data?.length || !data.some((s) => allowedRoles.includes(s.role))) {
    throw new Response(null, { status: 403 });
  }
  return { user, roles: data.map((s) => s.role) };
}
```

## Notifications

Admin actions trigger notifications:

- **Approve listing** → email seller (i18n template `listing_approved.tsx`)
- **Reject listing** → email seller with `rejection_reason`
- **Fraud hold raised** → Missive draft (already wired) + email super_admin group
- **Strike added** → in-app notification (V1.1)
- **Account near-limit (2 active strikes)** → email warning user

All emails go through Resend. Templates live in `emails/` as React Email components.
