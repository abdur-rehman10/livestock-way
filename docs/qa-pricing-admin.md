## QA: Super Admin Pricing

Use these steps to manually verify the admin pricing experience.

1) Super admin can open Pricing tab
- Log in as a super admin (use `/admin/login` if logged out).
- Navigate to `/admin/pricing` and confirm the Pricing tab appears in the admin sidebar.

2) Update individual hauler monthly price
- On the “Individual Hauler Pricing” tab, load current price.
- Enter a positive number (e.g., `89.99`) and click **Save**.
- Expect a success toast and the input retains the new value.
- Try an invalid value (`0` or blank) and confirm save is blocked with an inline error.

3) Add/edit/remove company tiers (max 4)
- Switch to “Company Hauler Tiers”.
- Add a tier with name, min/max vehicles, and monthly price. Save the tier, then **Save company tiers** to persist.
- Edit an existing tier and save; confirm changes display in the table.
- Remove a tier and confirm it disappears after saving company tiers.
- Confirm the **Add Tier** button disables once 4 tiers exist.

4) Enterprise tier requires sales link and no price
- Add or edit a tier, toggle “Enterprise” (or name it “Enterprise”).
- Confirm monthly price/min/max are disabled/optional.
- Enter a valid https URL in Sales Form Link; without a link, save is blocked with an error.
- Save and persist the enterprise tier.

5) Overlapping tiers rejected with clear message
- Create two non-enterprise tiers whose ranges overlap (e.g., Tier A 1–5, Tier B 4–10).
- Try to save the tier or the company tiers; expect a clear inline error about overlapping ranges and no save.

Notes
- All pricing endpoints are admin-only; verify you are authenticated as super admin.
- Server also enforces these rules; client should surface inline errors and toasts on failures.
