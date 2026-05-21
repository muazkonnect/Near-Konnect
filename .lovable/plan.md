## Done
Recreated `get_promoted_workers`, `get_top_rated_promoted`, `get_promoted_explore` to drop the `owner_user_id = uid OR within radius` gate. Every active campaign now returns for every viewer (auth or guest), ordered by priority then distance.

## Remaining (needs build mode)
`src/hooks/usePromoted.ts` — change the `enabled` flag from `!!coords` to `true` in:
- `usePromotedNearby`
- `usePromotedTopRated`
- `usePromotedExploreInfinite` (`enabled: !!coords` → `enabled: true`)

So guests with no location still fire the RPC and see ads.

Switch to build mode to apply.