# Redundant Code Report

Generated: 2026-05-12

---

## lm_backend

### 1. `formatEPC` + `scoreToGrade` — duplicate EPC grade conversion

**Files:**
- `src/utils/formatters.ts:226-241` — `formatEPC(rating: string): string`
- `src/server/routes/properties.ts:69-77` — `scoreToGrade` (local, inline)

**What:** Both convert numeric EPC scores (0–100) to letter grades A–G using identical thresholds (92/81/69/55/39/21/1).

**Why:** `formatEPC` is exported but never imported anywhere. The properties route has its own inline version doing the exact same conversion.

**Action:** Delete `formatEPC`. Move `scoreToGrade` to `formatters.ts` and export it for use by properties route.

---

### 2. `isValidUrl` — defined twice, never used

**Files:**
- `src/utils/formatters.ts:295-301` — private `isValidUrl` inside `formatUrl`
- `src/utils/validators.ts:193-200` — exported `isValidUrl`

**What:** Both implement URL validation via `new URL()` try/catch.

**Why:** Neither is imported by any consumer. Dead code.

**Action:** Delete both definitions.

---

### 3. `helpers.ts` — 22 exported functions, zero imports from other source files

**File:** `src/utils/helpers.ts`

**What:** The following exported functions are never imported by any source file (only appears in its own test file if at all):

- `generateId` (line 11)
- `deepClone` (line 18)
- `debounce` (line 47)
- `throttle` (line 62)
- `sleep` (line 80)
- `retry` (line 87)
- `isEmpty` (line 106)
- `removeEmptyValues` (line 129)
- `groupBy` (line 144)
- `sortBy` (line 156)
- `unique` (line 174)
- `chunk` (line 181)
- `calculatePagination` (line 194)
- `formatFileSize` (line 224)
- `randomString` (line 237)
- `isDevelopment` (line 251)
- `isProduction` (line 258)
- `getEnv` (line 265)
- `parseJSON` (line 272)
- `stringifyJSON` (line 283)
- `createError` (line 294)
- `logWithTimestamp` (line 304)

**Why:** These were written for potential reuse but never integrated. Entire file is dead code except possibly for tests.

**Action:** Delete or move only the functions that have active consumers.

---

### 4. `ImageProcessor` class — entire file unused

**File:** `src/utils/imageProcessor.ts` (lines 12–321)

**What:** Class with `processBase64Image`, `processImageFile`, `generateSrcSet`, `generateSizes`, `createPlaceholder`, `isImageValid`, `cleanupExpiredImages`, `getImageMetadata`, `processAndUploadImage`, `generateCloudinaryUrl`, `generateCloudinarySrcSet`, `fetchAndCacheImage`.

**Why:** Never imported anywhere. All image handling routes through Cloudinary directly via `cloudinaryService`.

**Action:** Delete entire file.

---

### 5. `cloudinaryHelper.ts` — entire file unused

**File:** `src/utils/cloudinaryHelper.ts`

**What:** 4 exported functions: `processPropertyMediaToCloudinary`, `generateCloudinaryUrls`, `extractPublicIdFromUrl`, `isCloudinaryUrl`. None are imported anywhere.

**Why:** Created but never integrated.

**Action:** Delete entire file.

---

### 6. `RedisCacheKeys` vs `CacheKeys` — duplicate key factories

**Files:**
- `src/utils/redisCache.ts:327-333` — `RedisCacheKeys`
- `src/utils/cache.ts:191-200` — `CacheKeys`

**What:** Both export key factory objects for the same cache operations (`properties`, `property`, `search`, `media`, etc.).

**Why:** `CacheKeys` in cache.ts has some usage; `RedisCacheKeys` is exported but never imported anywhere. They model the same concepts with slightly different structures.

**Action:** Remove `RedisCacheKeys`. Consolidate to single `CacheKeys` in cache.ts.

---

### 7. `validateImageFilename` and 5 other validator functions — exported but unused

**File:** `src/utils/validators.ts`

**What:** The following are exported but never imported anywhere:
- `validateImageFilename` (lines 156-166)
- `validatePropertyMediaParams` (lines 66-78)
- `isValidEmail` (lines 185-188)
- `validatePropertyRef` (lines 221-228)
- `validatePriceRange` (lines 233-247)
- `validatePaginationParams` (lines 205-216)
- `sanitizeString` (lines 171-180)

**Why:** Created for potential validation needs but never wired up.

**Action:** Delete unused validators, or wire them into actual routes if validation is needed.

---

### 8. `cached` decorator — exported but never used

**File:** `src/utils/cache.ts:203-225`

**What:** `export function cached<T>(keyGenerator, ttl?)` — a decorator for memoizing async functions.

**Why:** Never imported anywhere.

**Action:** Delete.

---

### 9. `cleanup` and `evictOldest` methods on `Cache` class — never called

**File:** `src/utils/cache.ts:150-184`

**What:** `cleanup()` (cleans expired entries) and `evictOldest()` (evicts oldest when full) are defined but never invoked.

**Why:** The cache is used via `get`, `set`, `has`, `delete`, `clear`, `clearPattern`, `getStats`. These maintenance methods are dead code.

**Action:** Remove if no consumer needs manual cache eviction.

---

### 10. Specialized loggers created but not used

**File:** `src/utils/logger.ts:177-181`

**What:**
```typescript
export const apiLogger = new Logger('RentmanAPI');
export const serverLogger = new Logger('Server');
export const cacheLogger = new Logger('Cache');
export const imageLogger = new Logger('ImageProcessor');
```

**Why:** `serverLogger` and `cacheLogger` are used. `apiLogger` and `imageLogger` are created but never imported.

**Action:** Delete unused `apiLogger` and `imageLogger`.

---

### 11. Duplicate error response structures

**Files:**
- `src/client/RentmanApiClient.ts:105-113` — `formatError` method
- `src/middleware/errorHandler.ts:40-113` — `ErrorTypes` + `normalizeError`

**What:** Client has its own error formatting producing `{success: false, error, message, code, timestamp}` but the middleware has a complete `CustomError` / `ErrorTypes` / `normalizeError` system. The client's `formatError` is not consistently used.

**Why:** Inconsistent error handling layers. The middleware normalization exists but the client formats errors independently before they reach middleware.

**Action:** Use middleware error system exclusively. Remove `formatError` from client.

---

### 12. `validateConfig` called internally but exported

**File:** `src/config/index.ts:122`

**What:** `export function validateConfig(): void` — called from `app.ts:32` but the export is not needed externally.

**Why:** The export exists but nothing outside `src/config/` imports it.

**Action:** Remove `export` keyword (make private).

---

### 13. `basic-usage.ts` — unused example file

**File:** `src/examples/basic-usage.ts`

**What:** Example code showing how to use `RentmanApiClient`.

**Why:** Never imported or used anywhere in the application.

**Action:** Delete or move to a README/example location if documentation is desired.

---

### 14. `healthMonitor` — exported but unused

**File:** `src/middleware/healthCheck.ts:400`

**What:** `export { healthMonitor }` — initialized internally but never imported by any other module.

**Why:** Dead export.

**Action:** Remove export.

---

### 15. `RentmanApiConfig` type redefined with split defaults

**Files:**
- `src/types/api.ts:5-11` — interface definition
- `src/client/RentmanApiClient.ts:22-28` — defaults merged in constructor

**What:** Interface lives in types, but constructor re-merges defaults. Default values are not centralized.

**Why:** Interface + constructor initialization are out of sync. Defaults should live in one place.

**Action:** Move defaults into the interface as optional properties with defaults, or use a factory function.

---

### 16. `matchesSearchType` rent/sale filter — duplicated across routes

**Files:**
- `src/server/routes/properties.ts:121-133` — `matchesSearchType` function
- `src/server/routes/search.ts:38-40` — inline rent/sale filter

**What:** Both filter properties by `rentorbuy` field (1=rent, 2=sale) with identical logic.

**Why:** Duplicated filter logic. `matchesSearchType` could be a shared utility.

**Action:** Extract to `src/utils/propertyUtils.ts`.

---

### 17. `sanitizeString` vs `sanitizeValue` — duplicate sanitization

**Files:**
- `src/utils/validators.ts:171-180` — `sanitizeString`
- `src/server/routes/content.ts:43-48` — `sanitizeValue`

**What:** Both trim strings and check types.

**Why:** `sanitizeString` is never used. `sanitizeValue` is used in content routes. Consolidate into one.

**Action:** Delete `sanitizeString`. Use `sanitizeValue` everywhere.

---

### 18. Test file imports non-existent module

**File:** `tests/framer/dataTransformers.test.ts:15`

**What:** Imports from `'../../src/framer/dataTransformers'` which does not exist.

**Why:** Module was deleted or moved but test was not updated.

**Action:** Delete test file or create the module it tests.

---

### 19. `CacheKeys` — most keys never used

**File:** `src/utils/cache.ts:191-200`

**What:**
```typescript
export const CacheKeys = {
  properties: (params) => `properties:${JSON.stringify(params)}`,
  property: (id) => `property:${id}`,
  media: (propertyId) => `media:${propertyId}`,
  mediaFile: (filename) => `mediafile:${filename}`,
  search: (query, params) => `search:${query}:${JSON.stringify(params)}`,
  suggestions: (query) => `suggestions:${query}`,
  image: (filename, size) => `image:${filename}:${size}`,
  health: () => 'health'
};
```

**Why:** Only `image` is actively used (in `app.ts`). Properties, media, search, suggestions, and health keys are defined but never used — the caching layer uses different patterns in practice.

**Action:** Remove unused key factories. Keep only `image`.

---

## lm_frontend

### 1. `formatPrice` — defined twice with different signatures

**Files:**
- `src/lib/utils.ts:8` — `formatPrice(price: number): string`
- `src/lib/formatters.ts:6` — `formatPrice(price: string | number): string`

**What:** Same utility, two definitions with overlapping signatures.

**Why:** `PropertyCard.tsx` and `PropertyDetails.tsx` import from `utils.ts`. The `formatters.ts` copy is dead code.

**Action:** Delete `formatters.ts` copy. Make `utils.ts` version handle both `string | number`.

---

### 2. `formatDate` — imported but never used

**File:** `src/components/PropertyDetails.tsx:6`

**What:** `import { formatPrice, formatDate } from '@/lib/utils'` — `formatDate` not referenced in component.

**Why:** Dead import.

**Action:** Remove `formatDate` from import.

---

### 3. `ImageSlider` — two components with identical export name

**Files:**
- `src/components/ImageSlideShow.tsx:21` — `function ImageSlider()`
- `src/components/InterImageSlider.tsx:36` — `function ImageSlider()`

**What:** Both export `ImageSlider`. One uses static external URLs; the other uses a single local image.

**Why:** Naming conflict. Importers get unpredictable behavior depending on build order.

**Action:** Rename to `ImageSlideShow` and `InternationalImageSlider`.

---

### 4. `SLIDE_DURATION` — three slider components define their own constant

**Files:**
- `src/components/HeroSlider.tsx:28` — `const SLIDE_DURATION = 10000`
- `src/components/InterImageSlider.tsx:34` — `const SLIDE_DURATION = 5000`
- `src/components/TestimonialsSlider.tsx:30` — `const SLIDE_DURATION = 6000`

**What:** Each slider hardcodes its own duration value as an anonymous constant.

**Why:** No shared configuration for slider timing. Values should be centralized.

**Action:** Create `src/lib/slider-config.ts` with exported duration constants per slider type.

---

### 5. JWT verification logic — duplicated across middleware and API routes

**Files:**
- `src/middleware.ts:4` — `verifyToken(token: string): Promise<boolean>`
- `src/app/api/admin/check/route.ts:5` — `verifyToken(cookieValue?: string): Promise<boolean>`

**What:** Both implement JWT verification with identical patterns: check existence → encode secret → `jwtVerify` → check expiry.

**Why:** Copy-pasted auth logic. Should be in one shared auth utility.

**Action:** Create `src/lib/auth.ts` with a single `verifyAdminToken` function. Import everywhere.

---

### 6. `isAuthenticatedAdmin` — copy-pasted into two admin API routes

**Files:**
- `src/app/api/admin/content/route.ts:7`
- `src/app/api/admin/content/[key]/route.ts:7`

**What:** Identical function definition in both files.

**Why:** Code duplication. Should be shared.

**Action:** Move to `src/lib/auth.ts`. Import in both routes.

---

### 7. Three near-identical upload button components in admin page

**File:** `src/app/admin/international-properties/page.tsx`

**What:** `MapButton` (lines 35-123), `BrochureButton` (lines 125-213), `UploadButton` (lines 215-333) share:
- Same `uploading`, `progress`, `error` state
- Same `handleClick` file input logic
- Same file size validation
- Same Cloudinary XHR upload logic
- Same error handling

Only differences: file type accepted, upload endpoint, button label.

**Why:** ~80% identical code. Should be one reusable component.

**Action:** Create `useCloudinaryUpload` hook and `UploadButton` component accepting `accept` and `endpoint` props.

---

### 8. `PropertyData` type and default data split across files

**Files:**
- `src/app/international-properties/types.ts:3-11` — type definition
- `src/lib/content-registry.ts:13-85` — `DEFAULT_INTERNATIONAL_PROPERTIES` (array of `PropertyData`)

**What:** Type defined in `types.ts` but the default data lives in `content-registry.ts`. Page imports type from one and data from another.

**Why:** Inconsistent locality. Type and default data are tightly coupled but separated.

**Action:** Move `DEFAULT_INTERNATIONAL_PROPERTIES` to `types.ts` next to `PropertyData`.

---

### 9. Image URL construction repeated across components

**Files:**
- `src/components/PropertyCard.tsx:87`
- `src/components/TopPropertyCard.tsx:33`
- `src/components/PropertyGallery.tsx:57-60,65,73`

**What:** All manually construct `${getBaseUrl()}/api/images/${photo}`.

**Why:** `getImageUrl(filename)` utility exists in `utils.ts:30-33` but is not used by these components.

**Action:** Use existing `getImageUrl` utility everywhere.

---

### 10. Editable content loading pattern — repeated in 3 pages

**Files:**
- `src/app/page.tsx:68-90`
- `src/app/about/page.tsx:11-35`
- `src/app/services/page.tsx:11-37`

**What:** All use identical `loadEditableContent` async function: fetch `/api/content?keys=...`, check response, find entry by key, set state.

**Why:** 25+ line pattern copy-pasted 3 times. Should be a custom hook.

**Action:** Create `useEditableContent(key)` hook in `src/hooks/useEditableContent.ts`.

---

### 11. Split imports from same module

**File:** `src/app/properties/page.tsx:5-6`

**What:**
```typescript
import { Property, SearchParams } from '@/lib/api';
import { rentmanApi } from '@/lib/api';
```

**Why:** Two import statements from same file.

**Action:** Combine into one: `import { Property, SearchParams, rentmanApi } from '@/lib/api'`.

---

### 12. Debug logging left in production

**File:** `src/components/PropertyDetails.tsx:102-121`

**What:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Property Description Debug:', { ... });
}
```

**Why:** Debug code remains in production JSX. `NODE_ENV` check in component render is unusual for Next.js.

**Action:** Remove debug block or move to a proper logging utility with debug level.

---

### 13. Pagination logic — duplicated across properties and sale pages

**Files:**
- `src/app/properties/page.tsx`
- `src/app/sale/page.tsx`

**What:** Both define identical: `page`, `totalPages`, `hasNext`, `hasPrev` state; `pageCache` Map; `goToPage` with caching logic; identical JSX pagination controls. ~150 lines each.

**Why:** Copy-pasted pagination.

**Action:** Create `usePagination` hook with cache support.

---

### 14. Default filter state repeated in 3 places

**Files:**
- `src/app/properties/page.tsx:18-28`
- `src/app/sale/page.tsx:18-29`
- `src/components/SearchFilters.tsx:22-32`

**What:** Each defines identical default `SearchParams`:
```typescript
{ page: 1, limit: 12, q: '', area: '', type: '', beds: undefined, minPrice: undefined, maxPrice: undefined, featured: false }
```

**Why:** Defaults defined in 3 places. Change in one doesn't propagate.

**Action:** Define `DEFAULT_SEARCH_PARAMS` in `src/lib/api.ts` and import everywhere.

---

### 15. `Property` type parsing/destructuring duplicated in `PropertyCard`

**Files:**
- `src/lib/api.ts:42-146` — `Property` interface with ~50 fields
- `src/components/PropertyCard.tsx:38-81` — destructuring/parsing logic

**What:** `PropertyCard` re-computes `lineOne`, `lineTwo`, `totalBeds`, `parsedSalePrice`, `parsedRent`, `formattedAvailableDate`, `furnishedLabel` from `Property` fields.

**Why:** This transformation logic belongs with the `Property` type or in a dedicated transformer utility.

**Action:** Create `src/lib/property-utils.ts` with functions like `formatPropertyAddress`, `parsePropertyPrice`, etc.

---

## Summary

| Repo | Finding | Type |
|------|---------|------|
| backend | `formatEPC` vs `scoreToGrade` | duplicate logic |
| backend | `isValidUrl` x2 | duplicate logic |
| backend | `helpers.ts` — 22 unused exports | dead code |
| backend | `ImageProcessor` class | dead code |
| backend | `cloudinaryHelper.ts` entire file | dead code |
| backend | `RedisCacheKeys` vs `CacheKeys` | duplicate key factories |
| backend | 7 unused validators | dead code |
| backend | `cached` decorator | dead code |
| backend | `cleanup`/`evictOldest` methods | dead code |
| backend | `apiLogger`/`imageLogger` | unused loggers |
| backend | client `formatError` vs middleware error system | inconsistent error handling |
| backend | `validateConfig` exported unnecessarily | unnecessary export |
| backend | `basic-usage.ts` example file | dead code |
| backend | `healthMonitor` exported but unused | dead export |
| backend | `RentmanApiConfig` split defaults | interface/implementation mismatch |
| backend | `matchesSearchType` duplicated | duplicate logic |
| backend | `sanitizeString` vs `sanitizeValue` | duplicate sanitization |
| backend | test imports non-existent module | broken test |
| backend | `CacheKeys` — most keys unused | dead code |
| frontend | `formatPrice` x2 | duplicate function |
| frontend | `formatDate` unused import | dead import |
| frontend | `ImageSlider` naming conflict | naming conflict |
| frontend | `SLIDE_DURATION` x3 | repeated constants |
| frontend | JWT verification duplicated | duplicate logic |
| frontend | `isAuthenticatedAdmin` duplicated | duplicate function |
| frontend | 3 upload buttons with 80% overlap | code duplication |
| frontend | `PropertyData` type/data split | poor locality |
| frontend | image URL construction repeated | repeated logic |
| frontend | editable content loading x3 | copy-pasted pattern |
| frontend | split imports | style issue |
| frontend | debug logging in production | dead code |
| frontend | pagination duplicated x2 | copy-pasted code |
| frontend | default filter state x3 | repeated constants |
| frontend | Property parsing in `PropertyCard` | poor locality |

**Total: 35 findings (19 backend, 16 frontend)**