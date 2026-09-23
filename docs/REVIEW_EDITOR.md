# Review editor

The four review categories share one editor flow and one field renderer.

- `review-editor.config.ts`: labels, field types, defaults and client validation.
- `review-form-fields.component.*`: accessible native controls, tags, custom options and dates.
- `review-editor-data.service.ts`: adapters to the existing category services and their list caches.
- `add-review.component.*`: route state, edit loading, duplicate checks, upload/save orchestration and feedback.
- `review-photo-picker.component.ts`: compression, uploads, ordering and per-photo captions (unchanged by the form refactor).

Keep API field names unchanged, including `premiered(JP)`, `finished date` and `platForm`.
Dates support both free text (including approximate dates) and a calendar; calendar selections use DD/MM/YYYY in the API.
Category-specific draft fields survive category switches while the editor is open; selected photos are cleared on switching categories.

## Requests and cache

Opening a category fetches its genres and choices (two GET requests). A cold edit link additionally fetches the category list when the record is absent from navigation state and the existing list cache.
Create performs one duplicate-check GET, then the existing upload flow and one POST. Edit sends one PUT after uploads. Existing photos and caption-only edits do not upload image bytes again.
Successful saves update the same in-memory list cache used by the dashboard/review pages. There is no second editor cache or TTL. Unsaved drafts do not persist across reloads.

## CSS and routing

Tailwind 3, the Tailwind forms plugin and component SCSS provide the UI. Bootstrap, ng-bootstrap, Popper, Bootstrap Icons and Prism CSS are no longer declared or loaded.
Legacy collection URLs remain available using native controls and shared search/pagination components.
All page routes use lazy `loadComponent` imports; authentication guards are preserved.

## Backend

The sibling `service-collection/src/review-validation.ts` validates create and partial update payloads before R2 or database access, shared across all four review services.
It checks required fields, string bounds, tiers, tags, HTTP(S) cover URLs, non-negative counts and category-specific fields. Historical score fields remain optional, dates retain their legacy text format, and omitted fields on partial updates are preserved.
Gallery validation and R2 upload verification remain in the Media module. No database migration, new environment variable or R2 setting is needed for this refactor.
