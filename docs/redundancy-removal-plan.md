# Redundancy Removal Plan

Generated: 2026-05-12
Principle: Remove one block, verify tests pass, then proceed. Never batch removes.

---

## Phase 1 — Zero-risk dead code deletion (backend)

### 1.1 — `cloudinaryHelper.ts` entire file
**File:** `src/utils/cloudinaryHelper.ts`
**Verification:** `npm run build` must succeed. If build passes, nothing was using it.

### 1.2 — `ImageProcessor` class
**File:** `src/utils/imageProcessor.ts`
**Verification:** `npm run build` must succeed.

### 1.3 — `helpers.ts` unused exports
**File:** `src/utils/helpers.ts`
**Approach:** Comment out all 22 unused exports one by one. Run `npm run build` after each. Keep only what breaks the build.
**Rationale:** Some may be used in test files — build catches that.

### 1.4 — `basic-usage.ts`
**File:** `src/examples/basic-usage.ts`
**Verification:** `npm run build` must succeed.

### 1.5 — Broken test file
**File:** `tests/framer/dataTransformers.test.ts`
**Verification:** `npm test` must pass without this file. Move or delete.

### 1.6 — Remove unused validator exports
**File:** `src/utils/validators.ts`
**Functions:** `validateImageFilename`, `validatePropertyMediaParams`, `isValidEmail`, `validatePropertyRef`, `validatePriceRange`, `validatePaginationParams`, `sanitizeString`
**Verification:** `npm run build` + `npm run lint` must both succeed.

### 1.7 — Remove unused `cached` decorator
**File:** `src/utils/cache.ts:203-225`
**Verification:** `npm run build` must succeed.

### 1.8 — Remove unused `cleanup` and `evictOldest` methods
**File:** `src/utils/cache.ts:150-184`
**Verification:** `npm run build` + `npm test` must succeed.

### 1.9 — Remove unused `RedisCacheKeys`
**File:** `src/utils/redisCache.ts:327-333`
**Verification:** `npm run build` + `npm test` must succeed.

### 1.10 — Remove unused `CacheKeys` (except `image`)
**File:** `src/utils/cache.ts:191-200`
**Verification:** `npm run build` + search entire codebase for `properties:`, `media:`, `search:`, `suggestions:`, `mediafile:` — none should appear.

### 1.11 — Remove unused `imageLogger`
**File:** `src/utils/logger.ts:181`
**Verification:** `npm run build` must succeed.

### 1.12 — Remove unused `apiLogger`
**File:** `src/utils/logger.ts:177`
**Verification:** `npm run build` must succeed.

---

## Phase 2 — Duplicate logic (backend, requires behavior verification)

### 2.1 — Deduplicate `formatEPC` / `scoreToGrade`
**Files:** `src/utils/formatters.ts:226-241`, `src/server/routes/properties.ts:69-77`
**Approach:**
1. Copy `scoreToGrade` logic to `formatters.ts` as exported function
2. Update `properties.ts` to import from `formatters.ts`
3. Delete the local `scoreToGrade` in `properties.ts`
**Verification:** `npm test` must pass. Manual: call `/api/properties` and check EPC grades in response match expected A-G format.

### 2.2 — Remove duplicate `isValidUrl` definitions
**Files:** `src/utils/formatters.ts:295-301`, `src/utils/validators.ts:193-200`
**Approach:** Delete both. Neither is used.
**Verification:** `npm run build`.

### 2.3 — Remove `sanitizeString`, keep `sanitizeValue`
**Files:** `src/utils/validators.ts:171-180`, `src/server/routes/content.ts:43-48`
**Approach:**
1. Verify `sanitizeValue` handles all cases `sanitizeString` did
2. Delete `sanitizeString`
**Verification:** Test content API — create/update content with whitespace and special chars. Behavior unchanged.

### 2.4 — Deduplicate `matchesSearchType`
**Files:** `src/server/routes/properties.ts:121-133`, `src/server/routes/search.ts:38-40`
**Approach:**
1. Create `src/utils/propertyFilters.ts`
2. Move filter logic there
3. Both routes import from new file
**Verification:** `npm test` + compare search results for `?type=rent` and `?type=sale` between both routes.

### 2.5 — Remove client `formatError`, use middleware error system exclusively
**Files:** `src/client/RentmanApiClient.ts:105-113`, `src/middleware/errorHandler.ts`
**Approach:** Delete `formatError` method from client. Let errors propagate raw to middleware.
**Verification:** Trigger error conditions (invalid token, network failure). Verify error response shape matches middleware's normalized format.

### 2.6 — `validateConfig` — remove unnecessary export
**File:** `src/config/index.ts:122`
**Approach:** Remove `export` keyword.
**Verification:** `npm run build` + app starts normally.

### 2.7 — `healthMonitor` — remove dead export
**File:** `src/middleware/healthCheck.ts:400`
**Approach:** Remove `export { healthMonitor }`.
**Verification:** `npm run build`.

### 2.8 — `RentmanApiConfig` — centralize defaults
**Files:** `src/types/api.ts`, `src/client/RentmanApiClient.ts:22-28`
**Approach:** Move defaults into interface as optional properties with literal types, or use a factory function.
**Verification:** `npm test` + ensure client still instantiates with and without optional config fields.

---

## Phase 3 — Zero-risk dead code deletion (frontend)

### 3.1 — `formatDate` unused import
**File:** `src/components/PropertyDetails.tsx:6`
**Verification:** `npm run build` must succeed.

### 3.2 — `formatPrice` in `formatters.ts`
**File:** `src/lib/formatters.ts`
**Verification:** `npm run build` + check PropertyCard and PropertyDetails still display prices correctly.

### 3.3 — Debug logging in production
**File:** `src/components/PropertyDetails.tsx:102-121`
**Verification:** `npm run build` + verify component renders without console output.

### 3.4 — Split imports from same module
**File:** `src/app/properties/page.tsx:5-6`
**Verification:** `npm run build` must succeed.

### 3.5 — Remove unused loggers in backend
**Files:** `src/utils/logger.ts`
**Verification:** `npm run build` must succeed.

---

## Phase 4 — Duplicate logic (frontend, requires behavior verification)

### 4.1 — Use `getImageUrl` utility everywhere
**Files:** `src/components/PropertyCard.tsx`, `src/components/TopPropertyCard.tsx`, `src/components/PropertyGallery.tsx`
**Approach:**
1. Update each component to import `getImageUrl` from `utils.ts`
2. Replace manual URL constructions
**Verification:** Load property listing pages. Images must display with correct URLs.

### 4.2 — Extract `useEditableContent` hook
**Files:** `src/app/page.tsx:68-90`, `src/app/about/page.tsx:11-35`, `src/app/services/page.tsx:11-37`
**Approach:**
1. Create `src/hooks/useEditableContent.ts`
2. Replace inline `loadEditableContent` in all 3 pages with hook
**Verification:** Load homepage, about page, services page. Editable content must appear correctly.

### 4.3 — Rename conflicting `ImageSlider` components
**Files:** `src/components/ImageSlideShow.tsx`, `src/components/InterImageSlider.tsx`
**Approach:** Rename to `ImageSlideShow` and `InternationalImageSlider`. Update all imports.
**Verification:** `npm run build` + check all pages using either slider render correctly.

### 4.4 — Centralize `SLIDE_DURATION` constants
**Files:** `src/components/HeroSlider.tsx`, `src/components/InterImageSlider.tsx`, `src/components/TestimonialsSlider.tsx`
**Approach:** Create `src/lib/slider-config.ts`. Update all 3 components to import from it.
**Verification:** Sliders on relevant pages animate with correct timing.

### 4.5 — Extract `usePagination` hook
**Files:** `src/app/properties/page.tsx`, `src/app/sale/page.tsx`
**Approach:**
1. Create `src/hooks/usePagination.ts`
2. Move shared pagination state, cache, and `goToPage` logic into hook
3. Replace in both pages
**Verification:** Navigate through property listings and sale listings. Pagination must work identically.

### 4.6 — `DEFAULT_SEARCH_PARAMS` in `api.ts`
**Files:** `src/app/properties/page.tsx`, `src/app/sale/page.tsx`, `src/components/SearchFilters.tsx`
**Approach:**
1. Define `DEFAULT_SEARCH_PARAMS` in `src/lib/api.ts`
2. Import in all 3 files
**Verification:** Load properties page with no filters applied. Should use defaults. Search with filters still works.

### 4.7 — Extract auth utility
**Files:** `src/middleware.ts`, `src/app/api/admin/check/route.ts`, `src/app/api/admin/content/route.ts`, `src/app/api/admin/content/[key]/route.ts`
**Approach:**
1. Create `src/lib/auth.ts` with `verifyAdminToken`
2. Update all 4 files to import from it
3. Remove duplicate `isAuthenticatedAdmin` from both content routes
**Verification:** Admin routes protected correctly. Unauthenticated requests return 401.

### 4.8 — Upload button component
**File:** `src/app/admin/international-properties/page.tsx`
**Approach:**
1. Create `useCloudinaryUpload` hook
2. Create `UploadButton` component accepting `accept` and `endpoint` props
3. Replace `MapButton`, `BrochureButton`, `UploadButton` with single component
**Verification:** Upload map, brochure, and images via admin page. All three types work.

### 4.9 — `PropertyData` type and default data co-location
**Files:** `src/app/international-properties/types.ts`, `src/lib/content-registry.ts`
**Approach:** Move `DEFAULT_INTERNATIONAL_PROPERTIES` to `types.ts` next to `PropertyData`.
**Verification:** Admin international properties page loads with correct default data.

### 4.10 — `property-utils.ts` — extract Property parsing
**Files:** `src/components/PropertyCard.tsx`, `src/lib/api.ts`
**Approach:**
1. Create `src/lib/property-utils.ts` with `formatPropertyAddress`, `parsePropertyPrice`, etc.
2. Use in PropertyCard and PropertyDetails
**Verification:** Property listings and property details display addresses and prices correctly.

---

## Phase 5 — Follow-up

After all phases complete:
1. Run full test suite: `npm test` in both repos
2. Run build: `npm run build` in both repos
3. Run lint: `npm run lint` in both repos
4. Manual smoke test: frontend dev server + backend dev server, test property search, admin login, image upload flows

---

## Rollback Protocol

If verification fails at any step:
1. Revert the specific file(s) changed in that step
2. Do not proceed to next step
3. Document which redundancy cannot be removed without behavior change

---

## Summary Table

| Phase | Step | File(s) | Risk | Verification |
|-------|------|---------|------|--------------|
| 1.1 | Delete cloudinaryHelper.ts | `src/utils/cloudinaryHelper.ts` | None | build |
| 1.2 | Delete ImageProcessor | `src/utils/imageProcessor.ts` | None | build |
| 1.3 | Comment out helpers.ts unused exports | `src/utils/helpers.ts` | None | build per comment |
| 1.4 | Delete basic-usage.ts | `src/examples/basic-usage.ts` | None | build |
| 1.5 | Delete/fix broken test | `tests/framer/dataTransformers.test.ts` | None | test |
| 1.6 | Remove unused validators | `src/utils/validators.ts` | None | build+lint |
| 1.7 | Remove `cached` decorator | `src/utils/cache.ts` | None | build |
| 1.8 | Remove cleanup/evictOldest | `src/utils/cache.ts` | None | build+test |
| 1.9 | Remove RedisCacheKeys | `src/utils/redisCache.ts` | None | build+test |
| 1.10 | Remove unused CacheKeys | `src/utils/cache.ts` | None | build+search |
| 1.11 | Remove imageLogger | `src/utils/logger.ts` | None | build |
| 1.12 | Remove apiLogger | `src/utils/logger.ts` | None | build |
| 2.1 | Deduplicate formatEPC/scoreToGrade | `formatters.ts`, `properties.ts` | Low | test + manual API check |
| 2.2 | Remove duplicate isValidUrl | `formatters.ts`, `validators.ts` | None | build |
| 2.3 | Remove sanitizeString | `validators.ts`, `content.ts` | Low | content API test |
| 2.4 | Deduplicate matchesSearchType | `properties.ts`, `search.ts` | Low | test + compare routes |
| 2.5 | Remove client formatError | `RentmanApiClient.ts` | Low | manual error test |
| 2.6 | Remove validateConfig export | `src/config/index.ts` | None | build+start |
| 2.7 | Remove healthMonitor export | `src/middleware/healthCheck.ts` | None | build |
| 2.8 | Centralize RentmanApiConfig defaults | `types/api.ts`, `RentmanApiClient.ts` | Low | test |
| 3.1 | Remove formatDate import | `PropertyDetails.tsx` | None | build |
| 3.2 | Delete formatters.ts formatPrice | `src/lib/formatters.ts` | None | build |
| 3.3 | Remove debug logging | `PropertyDetails.tsx` | None | build |
| 3.4 | Merge split imports | `properties/page.tsx` | None | build |
| 4.1 | Use getImageUrl everywhere | PropertyCard, TopPropertyCard, PropertyGallery | Low | visual check |
| 4.2 | Extract useEditableContent hook | page.tsx, about, services | Low | pages load content |
| 4.3 | Rename ImageSlider components | ImageSlideShow, InterImageSlider | Medium | build+visual |
| 4.4 | Centralize SLIDE_DURATION | HeroSlider, InterImageSlider, TestimonialsSlider | Low | visual check |
| 4.5 | Extract usePagination hook | properties/page, sale/page | Medium | pagination works |
| 4.6 | DEFAULT_SEARCH_PARAMS | api.ts + 3 files | Low | default filters work |
| 4.7 | Extract auth utility | middleware, 3 admin routes | Medium | admin auth works |
| 4.8 | Upload button component | admin/international-properties | Medium | upload works |
| 4.9 | Co-locate PropertyData | types.ts, content-registry | Low | admin page works |
| 4.10 | Extract property-utils | PropertyCard, api.ts | Low | property display |