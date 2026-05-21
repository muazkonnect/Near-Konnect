# NearKonnect Categories Integration Plan

## Goal
Replace the current limited taxonomy (6 main / ~50 sub) with the full uploaded taxonomy: **23 main categories, 960 sub-categories, ~10 expertise skills per sub**, used for:
- Worker selection during signup / upgrade-to-worker / profile edit
- Discover/search filtering
- Admin category management

---

## 1. Data preparation (one-time script)
Generate a clean JSON dataset from `NearKonnect_Categories_Clean.xlsx` (sheet *Flat Data (App Ready)*):

```json
{
  "main": [{ "name": "Home Services", "icon": "🏠", "sort_order": 1 }, ...],
  "sub":  [{ "main": "Home Services", "name": "Electrician", "icon": "⚡", "sort_order": 1,
             "expertise": ["House Wiring","Fault Finding", ... up to 10] }, ...]
}
```

Saved to `src/data/nearkonnect-taxonomy.json` (bundled, also used as fallback when DB empty).

---

## 2. Database changes (migration)

### 2.1 Extend `service_categories`
Already has `name, icon, parent_id, sort_order`. Add:
- `slug TEXT` (unique, for URLs/filters)
- `is_active BOOLEAN DEFAULT true`

### 2.2 New table `category_expertise`
```
id uuid pk
sub_category_id uuid → service_categories(id) on delete cascade
name text
sort_order int
unique(sub_category_id, name)
```
RLS: public select, admin manage.

### 2.3 Seed
- Wipe existing `service_categories` rows (currently 56, none referenced by FK).
- Insert 23 main rows, then 960 sub rows (with `parent_id`), then ~9,000 expertise rows.
- Done via `supabase--insert` calls in batches.

### 2.4 Existing workers backfill
For each worker, fuzzy-match current `main_category`/`sub_category`/`profession` against new taxonomy:
- exact case-insensitive match wins
- otherwise set `main_category = 'Daily Labour & Workers'`, `sub_category = 'Other'`
- `expertise_tags` left untouched

---

## 3. Frontend changes

### 3.1 Taxonomy source
- `src/data/serviceCategories.ts` → replaced by generated `nearkonnect-taxonomy.json` + thin TS wrapper exporting `MAIN_SERVICE_CATEGORIES`, `SUBCATEGORIES_BY_MAIN`, `EXPERTISE_BY_SUB`.
- `src/hooks/useCategories.ts` → also returns `getExpertise(subName)` reading from DB first, falling back to bundled JSON.
- `src/lib/categoryExpertise.ts` → rewritten to use the new map (keeps current API for compatibility).

### 3.2 Worker signup / onboarding / profile edit
Files: `src/components/WorkerOnboardingDialog.tsx`, `src/components/UpgradeToWorker.tsx`, `src/pages/Register.tsx`, `src/components/admin/EditWorkerDialog.tsx`, `src/pages/WorkerDashboard.tsx` (edit profile).

Replace current selectors with **cascading**:
1. Main Category (searchable Select, with icon)
2. Sub-Category (searchable Select, filtered by main)
3. Expertise chips (multi-select, **max 5**, picked from top-10 of chosen sub + free-text "Add custom" input)

Stored in: `workers.main_category`, `workers.sub_category`, `workers.expertise_tags[]`.

### 3.3 Discover / Search filter
File: `src/pages/Discover.tsx` (+ `useWorkers.ts`).
- Cascading filter bar: Main → Sub → Expertise (each clearable).
- Sub appears only after Main is chosen; Expertise only after Sub.
- Query: filter by `main_category`, `sub_category`, and `expertise_tags && {selected}`.

### 3.4 Admin
File: `src/components/admin/CategoriesManagementTab.tsx`.
- Already manages main/sub via `service_categories`; extend with expertise CRUD per sub-category.

---

## 4. UX / i18n
- Add new category & sub-category names to i18n keys (English source; translations stay English until user requests otherwise — too many strings to auto-translate).
- Icons: use the emoji included in the sheet (already in main/sub names) — strip emoji into `icon` column.

---

## 5. Files touched (summary)

**New**
- `src/data/nearkonnect-taxonomy.json`
- `supabase/migrations/<ts>_categories_full_taxonomy.sql`
- (one-off) `scripts/build-taxonomy.mjs` to regenerate JSON from xlsx

**Edited**
- `src/data/serviceCategories.ts`
- `src/lib/categoryExpertise.ts`
- `src/hooks/useCategories.ts`
- `src/components/WorkerOnboardingDialog.tsx`
- `src/components/UpgradeToWorker.tsx`
- `src/components/admin/EditWorkerDialog.tsx`
- `src/components/admin/CategoriesManagementTab.tsx`
- `src/pages/Register.tsx`
- `src/pages/Discover.tsx`
- `src/pages/WorkerDashboard.tsx`
- `src/hooks/useWorkers.ts`

---

## 6. Out of scope
- Translating 15k expertise strings into all 6 supported languages.
- Reworking how `profession` (legacy free-text) field is displayed — kept in sync from chosen sub-category.
- Paid boost/featured pricing per new category (existing rules continue).
