## Problem
The `workers` list query is failing with HTTP 400:
> `column profiles_1.profession_override does not exist`

This crashes the entire worker fetch, so **no workers display** anywhere — not on the Home "Nearby Services" section, not on Explore, not on the Map. "Ijaz Ansari" exists in the database (the `get_nearby_workers` RPC even returned him), but the listing query never resolves.

## Root Cause
`src/hooks/useWorkers.ts` selects:
```ts
profiles!workers_user_id_fkey_profiles(full_name, phone, avatar_url, profession_override)
```
The `profession_override` column was never added to the `profiles` table (verified in schema).

## Fix — Pick ONE option

### ✅ Option A (recommended, fastest): Remove `profession_override` from the query
- Edit `src/hooks/useWorkers.ts`:
  - Remove `profession_override` from the `profiles(...)` select.
  - Replace the override fallback with simply: `w.profession || "General Service"`.
- Search the codebase for any other references to `profession_override` and clean them up (likely none in active use).

This restores all worker listings immediately. No DB migration needed.

### Option B: Add the column to the database
- Run a migration to add `profession_override TEXT` to `profiles`.
- Keep the existing query as-is.
- Only worth doing if you actually want workers to override their profession label from their profile (separate from the `workers.profession` column). Based on current UI, this isn't used anywhere meaningful.

## Recommendation
Go with **Option A** — it's a one-file change that immediately unblocks Ijaz Ansari and every other worker from showing up on Home and Explore.

After the fix, "Ijaz Ansari" will appear in Nearby Services (he's ~4km away, well within the 10km default radius).