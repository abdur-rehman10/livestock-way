# QA: Individual Hauler Subscription & Free Trip Flow

1. New INDIVIDUAL hauler (free_trip_used=false) can place offers.
2. They can complete exactly one trip for free.
3. After completing the first trip, free_trip_used=true and offer placement is blocked (UI + API).
4. They can still view loadboard loads.
5. Clicking Upgrade → Pay & Activate enables offer placement again.
6. Anti-abuse: a non-subscribed individual cannot start a second trip while one is active.
