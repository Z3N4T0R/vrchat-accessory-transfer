# Proposed architecture (before implementation)

Use dependency-free JavaScript ES modules and a Manifest V3 extension page opened by the toolbar button. The source column selects a saved look and accessories. The target column selects an avatar and optional existing look. A review area shows the exact outgoing payload before an explicit Create action. Users can select several source accessories, edit path/position/rotation/scale values, and choose which transform fields are copied.

## Permissions

`scripting` and `https://vrchat.com/*` only. The API layer selects an existing HTTPS vrchat.com tab and executes an isolated-world function there. Same-origin fetch uses `credentials: include`; no cookie APIs, storage, broad tabs permission, external messages, or remote code. Chrome documents that content-script requests use the page origin: https://developer.chrome.com/docs/extensions/develop/concepts/network-requests .

## Files and responsibilities

- manifest.json, src/background.js: toolbar opens a single extension page.
- src/api/vrchatApi.js: session-tab selection, wrapper functions, avatar/look pagination, safe error mapping.
- src/api/sessionRequest.js: constrained same-origin request function injected in an isolated world; timeout, pacing, cooldown, no automatic retry.
- src/models/{attachment,accessory,avatar,avatarLook}.js: clone and normalize only documented fields. Avatar and accessory display fields are used for UI only.
- src/utils/validation.js: strict finite numeric vectors and payload validation.
- src/services/transferService.js: pure, immutable transfer algorithm.
- src/ui/{popup.html,popup.css,popup.js}: selectors, details, review and create states.
- tests/: Node built-in tests; scripts/package.ps1: dependency-free ZIP packaging.

## Models

Avatar: `{id, name, imageUrl?, thumbnailImageUrl?}`.
AccessoryInventoryItem: `{id?, partId?, name, imageUrl?, thumbnailImageUrl?}`.
AvatarLook: `{id, name, metadata: {avatarId, attachments: Attachment[]}}`.
Attachment: `{partId, path, position: [x,y,z], rotation: [x,y,z,w], scale: [x,y,z], isEnabled?, variables?}`. Missing transforms remain missing and block creation; never invent transforms. Inventory IDs are omitted from all outgoing attachments. Incoming numeric precision is preserved without rounding or quaternion normalization.

## API wrapper

`getCurrentUser()` calls GET /api/1/auth/user and returns only id/displayName. This login endpoint is an assumption to verify live. `getAvatars(offset)` calls GET /api/1/avatars with `user=me`, `releaseStatus=all`, sorted by updated date, then `getAllAvatars()` fetches sequential 100-item pages. `getAvatarLooks(offset)` calls the user-verified avatar-look inventory endpoint. `getAccessories(offset)` calls the user-provided accessory inventory endpoint for UI labels and icons. `getAllAvatarLooks()` and `getAllAccessories()` fetch sequential 100-item pages, deduplicate IDs, stop on empty data or total count, and error on repeated pages or a 100-page safety bound instead of presenting incomplete results. `createAvatarLook(payload)` validates then POSTs once. Errors expose only a bounded validation message and status; no response dumps or credentials.

## Transfer algorithm

Validate name and selected sources. Clone the target attachment list (or start empty for an avatar). Use the target avatar ID. For matching part IDs, default to replacing all matches with selected accessories; keep-both appends; cancel rejects. For path, position, rotation and scale, copy only the selected fields and apply user edits before validation. Whitelist accessory fields, recursively clone variables, validate every outgoing attachment, and return a new payload. Never PUT or DELETE. A separate review step freezes the payload until the user confirms creation.

## Security and privacy

Browser-managed session credentials never enter extension data. Requests accept named operations, not arbitrary URLs; redirects fail closed. Only the chosen VRChat tab handles requests. Local in-memory diagnostics contain operation/status only. No analytics, backend, persistence, or page DOM bridge. Request pacing and cooldown live in the isolated tab context; concurrent requests reject. Failed or interrupted POSTs are ambiguous: instruct the user to refresh and inspect looks before another creation. Different-avatar warning appears before creation. Render server strings via textContent.
