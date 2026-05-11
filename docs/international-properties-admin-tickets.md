# International properties admin + Cloudinary — tickets

Split from [international-properties-admin-plan.md](./international-properties-admin-plan.md). Use these as GitHub Issues, Linear, or Jira items; **dependencies** should be respected in order.

**Epic key:** `INT` (prefix for IDs below — replace with your project prefix).

---

## Epic A — Data & public read path

### INT-1 — Register CMS key and types

**Summary:** Add `international.properties` to the content registry and align TypeScript types.

**Scope:**

- `lm_frontend/src/lib/content-registry.ts`: new entry — key `international.properties`, group `international`, type `json`, `defaultValue` = stringified array from current `public/data/properties.json`.
- `lm_frontend/src/app/international-properties/types.ts`: extend `PropertyData` if needed (e.g. optional `brochureUrl`, optional `imagePublicIds` — can defer `publicId` fields to later epic).

**Acceptance criteria:**

- [ ] Registry entry exists and matches backend-allowed `json` type.
- [ ] Types compile; modal/page still work with extended shape (optional fields backward compatible).

**Depends on:** —

---

### INT-2 — Bootstrap content entry (no chicken-and-egg)

**Summary:** Ensure the international key appears in admin and exists in `site-content.json` for new environments.

**Options (pick one in implementation):**

- **A:** Admin `GET /api/admin/content` merges registry definitions missing from API results, using `defaultValue` as initial draft; or
- **B:** One-time seed script / migration that writes first `international.properties` row to `lm_backend/data/site-content.json`.

**Acceptance criteria:**

- [ ] Fresh clone: admin can load/save international data without manual file edit.
- [ ] Document chosen approach in plan or README snippet.

**Depends on:** INT-1

---

### INT-3 — Public page reads from content API + fallback

**Summary:** Replace primary `fetch('/data/properties.json')` with published content key; keep safe fallback.

**Scope:**

- `lm_frontend/src/app/international-properties/page.tsx`: fetch `/api/content?keys=international.properties`, parse `data[0].value`.
- Fallback: static default (copy of current JSON as module constant or keep `properties.json` as last resort).

**Acceptance criteria:**

- [ ] With valid published content, page matches previous behaviour (list + modal).
- [ ] If API fails or key empty, fallback renders without crash.
- [ ] No regression on `/international-office`.

**Depends on:** INT-1, INT-2 (or seed must exist before QA)

---

## Epic B — Cloudinary upload (backend + Next proxy)

### INT-4 — Cloudinary service: international folder + PDF raw upload

**Summary:** Extend backend Cloudinary layer for admin uploads.

**Scope:**

- Config: optional `CLOUDINARY_FOLDER_INTERNATIONAL` (default `international-properties`).
- `CloudinaryService`: methods e.g. upload image from buffer + upload PDF as `resource_type: 'raw'`; unique `public_id` (UUID suffix).
- Reuse existing env: `CLOUDINARY_*`.

**Acceptance criteria:**

- [ ] Unit or integration test optional; manual test: upload sample JPG and PDF, URLs returned.
- [ ] Files land under agreed folder in Cloudinary console.

**Depends on:** —

---

### INT-5 — Backend: `POST /api/international/media/upload` (internal auth)

**Summary:** Authenticated upload endpoint for Next proxy only.

**Scope:**

- New route on Express, mounted under `/api` (consistent with existing routes).
- Validate header: `Authorization: Bearer <INTERNAL_SECRET>` or `X-Admin-Internal-Token` (match `.env.example` naming).
- `multipart/form-data`: `file`, `kind` = `image` | `pdf`.
- Validate MIME/size (caps documented).
- Return `{ secureUrl, publicId, resourceType }`.

**Acceptance criteria:**

- [ ] Rejects missing/invalid token with 401/403.
- [ ] Rejects wrong `kind`/MIME combinations.
- [ ] Document env var in `lm_backend/.env.example`.

**Depends on:** INT-4

---

### INT-6 — Next.js: `POST /api/admin/international/upload` proxy

**Summary:** Browser uploads only through Next; forwards to backend with internal secret.

**Scope:**

- Route checks `admin-auth` cookie (same pattern as other admin API routes).
- Parse multipart, forward to backend upload URL.
- Map errors to JSON for UI.
- `lm_frontend/.env.example`: `INTERNATIONAL_UPLOAD_SECRET` or shared name aligned with backend.

**Acceptance criteria:**

- [ ] Without admin cookie: 401.
- [ ] With cookie + valid file: returns Cloudinary URL JSON.
- [ ] Secret never exposed to client bundle.

**Depends on:** INT-5

---

## Epic C — Admin UI

### INT-7 — Admin home: link to International properties

**Summary:** Discoverability.

**Scope:** `lm_frontend/src/app/admin/page.tsx` — new card linking to `/admin/international-properties`.

**Acceptance criteria:**

- [ ] Link visible only when logged in (same as other admin sections).
- [ ] Styling consistent with Blog / Site Content cards.

**Depends on:** — (can ship early)

---

### INT-8 — Page `/admin/international-properties`: list + delete

**Summary:** List all developments; delete with confirm.

**Scope:**

- Load array from content API (published + draft as needed).
- Table/cards: thumbnail, title, actions.
- Delete: remove item from array, `PUT` content key.

**Acceptance criteria:**

- [ ] List reflects `site-content.json` after refresh.
- [ ] Delete persists and public page updates after revalidate/reload.

**Depends on:** INT-2, INT-3 (INT-3 for E2E verification)

---

### INT-9 — Editor: create / edit + JSON validation

**Summary:** Form for all `PropertyData` fields; save merges into array and PUTs.

**Scope:**

- Add/Edit modal or `/admin/international-properties/[id]` pattern (slug or index).
- Fields: title, cardDescription, modalDescription[] (add/remove paragraphs), images[] (URLs + reorder optional), ctas[], optional brochureUrl.
- Pre-save: `JSON.stringify` array; validate with zod or minimal checks; surface errors.

**Acceptance criteria:**

- [ ] Create new record appears on public site after save.
- [ ] Edit existing persists.
- [ ] Invalid JSON / missing required fields blocked with clear message.

**Depends on:** INT-8

---

### INT-10 — Wire upload buttons in editor

**Summary:** Card image, gallery add, brochure PDF → INT-6.

**Scope:**

- File inputs call `POST /api/admin/international/upload` with `kind`.
- On success, push `secureUrl` into form state (hero, gallery append, brochure field).

**Acceptance criteria:**

- [ ] Uploaded image displays in preview.
- [ ] PDF URL stored and opens from modal CTA or brochure link on public page.

**Depends on:** INT-6, INT-9

---

### INT-11 — Site Content page: avoid double-edit (optional)

**Summary:** Reduce confusion.

**Scope:** On `/admin/content`, if key is `international.properties`, show banner “Managed under International properties” and hide raw textarea **or** deep link only.

**Acceptance criteria:**

- [ ] Editors are not encouraged to hand-edit huge JSON in two places.

**Depends on:** INT-1, INT-8

---

## Epic D — Hardening & cleanup

### INT-12 — Validation + error handling polish

**Summary:** Shared validation, consistent API errors.

**Scope:** Zod schema (frontend + optional backend on content PUT); upload size user-facing messages.

**Acceptance criteria:**

- [ ] Malformed save never corrupts `site-content.json`.
- [ ] Upload failures show retry-safe UI state.

**Depends on:** INT-9, INT-10

---

### INT-13 — Deprecate static primary path (optional)

**Summary:** After stable period, document that `public/data/properties.json` is fallback-only or remove.

**Acceptance criteria:**

- [ ] README or plan notes source of truth = CMS key.
- [ ] Fallback kept or removed per team decision.

**Depends on:** INT-3 live in production

---

### INT-14 — Orphan Cloudinary cleanup (optional / phase 2)

**Summary:** Store `publicId` on replace/delete; call Cloudinary destroy.

**Acceptance criteria:**

- [ ] Deleting a listing or replacing media removes or documents orphan policy.

**Depends on:** INT-10

---

## Dependency graph (summary)

```
INT-1 ─┬─► INT-2 ─► INT-3
       │
INT-4 ─► INT-5 ─► INT-6 ─► INT-10
                           ▲
INT-7 ────────────────────┼── INT-8 ─► INT-9 ─► INT-10
                           │
                           └── INT-11, INT-12

INT-3 + production stability ─► INT-13
INT-10 ─► INT-14 (optional)
```

---

## Suggested sprint grouping

| Sprint | Tickets |
|--------|---------|
| **1 — Foundation** | INT-1, INT-2, INT-3, INT-7 |
| **2 — Upload** | INT-4, INT-5, INT-6 |
| **3 — Admin CRUD** | INT-8, INT-9, INT-10, INT-11 |
| **4 — Polish** | INT-12, INT-13, INT-14 |

---

*Tickets version: 1.0 — aligned with international-properties-admin-plan.md.*
