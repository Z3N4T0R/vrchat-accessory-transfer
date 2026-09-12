# VRChat Accessory Transfer

Unofficial community Chrome/Edge Manifest V3 extension. Not affiliated with or endorsed by VRChat. Copies one or more accessory placements from a saved Avatar Look into a **new** Avatar Look. Existing looks are never overwritten or deleted. This is not an avatar uploader and does not modify asset bundles. Use at your own risk; these unofficial/undocumented API behaviors may change.

## Install

No build or dependencies are needed. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge), enable **Developer mode**, choose **Load unpacked**, and select this project folder containing manifest.json. If using the release ZIP, extract it first and select the extracted folder. Pin the toolbar action if desired; clicking it opens the full extension page.

## Use and live test

1. In the same browser profile, open https://vrchat.com/home and log in normally. Keep that tab open. The extension never asks for passwords, cookies, tokens, or 2FA codes.
2. Click the extension toolbar icon, then **Load Avatars and Looks**. Confirm your account, avatar count and look count. If you have multiple VRChat tabs, the most recently accessed one is used until the next reload.
3. Choose a source look, then select one or more accessories. The source look shows its avatar name and preview when available. Accessories show their inventory name and preview icon when VRChat returns matching metadata. Up to VRChat's avatar-look accessory limit can be transferred in one new look.
4. Choose a target avatar, then optionally choose an existing look on that avatar as the starting point. The avatar list is loaded from your own avatars endpoint and falls back to avatar IDs found in saved looks if that call fails. Selected source and target avatars show their preview image when VRChat returns one.
5. Select which transform fields to copy: path, position, rotation, and scale. Checked fields can be edited before review. Unchecked fields keep the matching target accessory's values when replacing or keeping an existing duplicate; if no target duplicate exists, the source value is still used because a valid attachment needs all transform fields.
6. Choose how duplicate part IDs are handled (replace by default, keep both, or cancel), enter a new name, and click **Review transfer**. Review the exact JSON and different-upload warning.
7. **Create new Avatar Look** performs one real POST to your account. Use a recognizable test name. Reload afterward and inspect the new look in VRChat. Confirm the original source and target still exist and the copied transform matches.
8. For duplicate testing, use a target with the same part ID and check replacement, then keep-both with a different new name. Keep-both server acceptance is not yet verified.

These are different avatar uploads. The numeric transform will be copied exactly, but visual placement may differ if the rigs, bone lengths, proportions, or orientations are different. Multiple uploads of the identical model should usually match closely; verify in VRChat.

## Privacy and permissions

Only `scripting` plus host access to `https://vrchat.com/*`. Fetch runs in an isolated context in the selected VRChat tab with browser-managed credentials. No cookies permission, credential reading or storage, analytics, backend, external scripts, or persistent extension data. The extension keeps loaded looks and safe operation/status diagnostics in memory while its page is open. Close the page to clear them. All processing is local; API requests go directly to VRChat.

## Technical notes

- GET `/api/1/auth/user`: login check; returns only user ID/display name to the extension page. Endpoint assumption awaiting live verification.
- GET `/api/1/avatars?n=100&offset=0&sort=updated&order=descending&releaseStatus=all&user=me`: loads your own avatars for names and preview images. If this fails, the UI falls back to avatar IDs discovered in Avatar Looks.
- GET `/api/1/inventory?n=100&offset=0&order=newest&types=avatarlook`: user-reported verified inventory listing. Sequential pagination increments offset by 100; deduplicates IDs; stops at empty response or totalCount. Repeated pages and the 100-page safety limit fail explicitly, without offering incomplete targets.
- GET `/api/1/inventory?n=100&offset=0&order=newest&types=accessory`: loads accessory inventory metadata for names and preview icons. Matching uses the accessory inventory `metadata.avatarPartId` field against look attachment `partId`. If a matching record or image is missing, the UI falls back to the attachment part ID.
- POST `/api/1/avatar-look`: user-reported verified new look creation using `{name, metadata: {avatarId, attachments}}`.
- Never calls PUT inventory (reported to reject metadata), DELETE, upload APIs, or asset endpoints.
- Only documented attachment fields are sent: partId, isEnabled, path, position, rotation, scale, variables. Inventory IDs and unknown fields are removed from both source and preserved target attachments. UI-only accessory display names are never serialized into the create payload. Numeric values are not rounded, converted to Euler angles, or normalized.
- Requests are paced, never automatically retried, and time out after 25 seconds. HTTP 429 imposes a cooldown of at least 60 seconds, respecting longer Retry-After values. Duplicate concurrent requests in the same VRChat tab reject.

See ARCHITECTURE.md for the design. Run `npm test` (Node 20+) for dependency-free tests. Run `npm run package` in Windows to create `dist/vrchat-accessory-transfer-0.1.0.zip`.

## Troubleshooting

- **401 / login**: log in normally on vrchat.com in this browser profile, complete any challenge on the website, then reload looks.
- **Cannot reach tab**: keep the VRChat tab open on HTTPS vrchat.com; allow the extension site access and reload the extension page.
- **403**: account permissions, website protection or API access may be blocking requests. Do not repeatedly retry.
- **400**: check the displayed validation message and payload. No existing look was edited.
- **404**: resource or endpoint may have changed.
- **429**: wait at least a minute, or longer if requested. No automatic retries.
- **5xx / network failure**: wait for recovery. After any failed create, first reload and inspect looks: the server might have created it even if the response was lost. The form requires reload after every POST.
- **Missing transforms / malformed look**: creation or loading stops explicitly rather than inventing values or dropping target accessories. Save the look again in VRChat and reload.
- **No looks**: save an Avatar Look with accessories in VRChat first. You can pick any loaded own avatar as the target, but the source still needs a saved look containing accessories.

## Scope and unverified TODOs

Phases 1–2 implemented, plus safety validation, pagination, duplicate handling, tests and packaging. This is an initial implementation, not a claim of live production certification.

- TODO: verify real authenticated GET and POST in Chrome and Edge, including website protection, account entitlements, API response shape and in-game appearance. Automated tests use simulated responses; no real account request was made during development.
- TODO: verify keep-both acceptance, disabled accessories, variable types, any server attachment/name limits, and replacement of multiple matches. The client preserves values and surfaces server errors.
- TODO: verify the own-avatar list endpoint live in Chrome and Edge. The UI falls back to look-derived avatar IDs if it fails.
- TODO: verify accessory inventory response shape for all accessory sources. If inventory metadata cannot be matched to an attachment partId, partId remains the reliable fallback.
- TODO: custom icons and browser-store packaging/review (Phase 4).
- Concurrent website inventory changes can affect offset pagination. Avoid editing looks elsewhere while loading or reviewing. Review is based on the loaded snapshot; reload for fresh targets.
- Unknown attachment metadata is intentionally not carried over; if VRChat introduces required fields, the whitelist must be updated. No account switching detection between GET and POST beyond the browser's active session: keep the account unchanged until creation finishes.

## Created file inventory

```
.gitignore
ARCHITECTURE.md
LICENSE
README.md
manifest.json
package.json
scripts/package.ps1
src/background.js
src/api/sessionRequest.js
src/api/vrchatApi.js
src/models/attachment.js
src/models/accessory.js
src/models/avatar.js
src/models/avatarLook.js
src/services/transferService.js
src/ui/popup.html
src/ui/popup.css
src/ui/popup.js
src/utils/validation.js
tests/api.test.js
tests/transferService.test.js
dist/vrchat-accessory-transfer-0.1.0.zip (generated package)
```
