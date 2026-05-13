# Impact of Removing Redundancies

Generated: 2026-05-12

---

## lm_backend

### `helpers.ts` — 22 unused exported functions

**Impact if removed:** ~300 lines deleted. Smaller bundle. Faster cold starts. Less cognitive load for new developers who might try to "use what's already there" and end up with dead code paths.

**What doesn't change:** Production behavior. These functions have no active consumers.

---

### `ImageProcessor` class + `cloudinaryHelper.ts` — entirely dead code

**Impact if removed:** ~500 lines deleted across two files. No behavioral change — image processing already routes through `cloudinaryService` directly.

**What doesn't change:** Existing image pipeline. Both files were never integrated.

---

### `formatEPC` + `scoreToGrade` duplicate EPC logic

**Impact if removed:** Single source of truth for EPC grade conversion. When the conversion thresholds change (they won't, but if), only one place needs updating instead of two. Reduces future bug surface.

**What doesn't change:** Current behavior — both produce identical output.

---

### `isValidUrl` defined twice, never used

**Impact if removed:** ~15 lines deleted. Clean signal that URL validation is not part of the current contract.

**What doesn't change:** Nothing uses it.

---

### `RedisCacheKeys` vs `CacheKeys` — duplicate key factories

**Impact if removed:** Single key factory eliminates confusion about which to use. Less surface for key mismatch bugs (wrong cache key = cache miss / stale data).

**What doesn't change:** Cache behavior — only one set of keys is actually used in practice.

---

### 7 unused validator functions

**Impact if removed:** Clean interface. New developers won't waste time discovering these exist but aren't connected. Removes false affordance.

**What doesn't change:** Validation that actually runs.

---

### `cached` decorator, `cleanup`/`evictOldest` methods, specialized loggers

**Impact if removed:** Removed code is debugged code. Fewer code paths to understand. Smaller surface for future bugs when someone tries to "reuse" these.

**What doesn't change:** Nothing calls them.

---

### Duplicate error formatting (client `formatError` vs middleware `normalizeError`)

**Impact if removed:** Unified error contracts. Middleware becomes single source of truth for error shape. Easier to trace errors across the stack. Fewer "which error format does X return?" questions.

**What doesn't change:** Error messages delivered to clients.

---

### `matchesSearchType` duplicated in `properties.ts` and `search.ts`

**Impact if removed:** Single filter function. Changing rent/sale filter logic requires edit in one place. Reduced risk of drift where one route filters differently than the other.

**What doesn't change:** Current search results.

---

### `sanitizeString` vs `sanitizeValue` duplicate sanitization

**Impact if removed:** One sanitization function. Less surface for inconsistencies (e.g., one handles edge cases the other doesn't).

**What doesn't change:** Content route sanitization behavior.

---

### `CacheKeys` — most keys unused

**Impact if removed:** Removes false promise that these keys are used. Eliminates misleading documentation in code.

**What doesn't change:** Actual caching — `image` key is the only one used.

---

### `basic-usage.ts` + test importing non-existent module

**Impact if removed:** Fewer misleading artifacts. No confusion about whether example code is canonical. Deleted test file eliminates CI noise from broken imports.

**What doesn't change:** Nothing runs these.

---

## lm_frontend

### `formatPrice` duplicate function

**Impact if removed:** Single source of truth. `string | number` handling in one place. No risk of two implementations diverging when prices change format.

**What doesn't change:** PropertyCard and PropertyDetails price display.

---

### 3 near-identical upload buttons in admin page

**Impact if removed:** ~260 lines deleted from one page. Single component means Cloudinary upload logic changes in one place. New file types only require props, not copy-paste.

**What doesn't change:** Admin upload behavior — feature works identically.

---

### Editable content loading pattern repeated in 3 pages

**Impact if removed:** Custom hook = testable in isolation. Loading state, error state, and key lookup logic tested once. Changes to content API only require one edit.

**What doesn't change:** Pages that load editable content.

---

### JWT verification duplicated (middleware + 2 admin routes)

**Impact if removed:** Single auth utility = single place to fix auth bugs. `verifyAdminToken` callable from middleware and routes. Eliminates risk of auth logic drift between middleware enforcement and route-level checks.

**What doesn't change:** Admin route protection.

---

### `isAuthenticatedAdmin` duplicated in 2 admin routes

**Impact if removed:** Combined with above: one `verifyAdminToken` replaces all three definitions. ~40 lines removed. Bug fixes propagate automatically.

**What doesn't change:** Auth checks.

---

### `SLIDE_DURATION` repeated in 3 slider components

**Impact if removed:** Centralized slider config. Changing animation speed requires edit in one place. Enables future: user-preference-driven timing, accessibility "reduce motion" overrides.

**What doesn't change:** Slider animations.

---

### `getImageUrl` utility unused while components build URLs manually

**Impact if removed:** Utility becomes used. If Cloudinary URL format changes (new CDN, new URL structure), only `utils.ts` needs updating — not every component that builds URLs by hand.

**What doesn't change:** Currently displayed image URLs.

---

### Pagination duplicated in `properties/page.tsx` and `sale/page.tsx`

**Impact if removed:** `usePagination` hook = ~150 lines removed from each page. Cache invalidation logic changes in one place. New pagination UI only needs to update hook.

**What doesn't change:** Page counts, navigation behavior.

---

### Default filter state repeated in 3 places

**Impact if removed:** `DEFAULT_SEARCH_PARAMS` in `api.ts` means changing page size from 12 to 24 propagates everywhere. Currently, changing it requires 3 edits with risk of drift.

**What doesn't change:** Default search behavior seen by users.

---

### `PropertyCard` duplicating `Property` type parsing logic

**Impact if removed:** `property-utils.ts` with `formatPropertyAddress`, `parsePropertyPrice` gives reusability across PropertyCard, PropertyDetails, TopPropertyCard. Address formatting consistency guaranteed.

**What doesn't change:** How property data is displayed.

---

### Debug logging left in production

**Impact if removed:** Cleaner component render path. No conditional `console.log` calls in hot render paths. Slight performance benefit if NODE_ENV checks disappear.

**What doesn't change:** Production output — debug block doesn't run.

---

### `ImageSlider` naming conflict

**Impact if removed:** Clear component names = predictable imports. No risk of importing the wrong slider and getting invisible runtime mismatches.

**What doesn't change:** Slider UI or behavior.

---

### `PropertyData` type and default data split across files

**Impact if removed:** Type and default value live together. Adding a new `PropertyData` field only requires editing `types.ts` — no need to find where `DEFAULT_INTERNATIONAL_PROPERTIES` is and update it too.

**What doesn't change:** Admin page behavior.

---

## Aggregate Impact

| Category | Lines Removed (est.) | Risk of Removal |
|----------|----------------------|-----------------|
| Backend dead code | ~800 | Near-zero — no active consumers |
| Backend duplicate logic | ~50 | Low — identical outputs, single source of truth benefit |
| Frontend dead code/imports | ~100 | Near-zero |
| Frontend duplicate logic | ~600 | Low — hook/component extraction preserves behavior |
| Frontend naming conflicts | 0 | Medium — renames require import updates everywhere |

**Total estimated reduction: ~1,500 lines removed across both repos.**

**Primary gains:** Maintainability (single source of truth), smaller bundles, fewer places to update when something changes, reduced bug surface from inconsistent copies. Zero production behavior change on day one — all gains are long-term code quality and reduced future bug probability.

**Risk of not removing:** Drift between copies (bug in one, fix not applied to other), dead code misleading developers, bundle bloat, confusion about which version is canonical.