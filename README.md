# VRChat Accessory Transfer

VRChat Accessory Transfer is an unofficial Chrome and Microsoft Edge extension for copying accessory placements between VRChat Avatar Looks.

It helps you take one or more accessories from a saved look, copy their placement values, and create a new Avatar Look for another avatar or another saved look. Existing looks are left unchanged.

This extension has been verified with a logged-in VRChat browser session.

## Features

- Copy one or more accessories from a saved Avatar Look
- Create a new Avatar Look for any avatar in your account
- Start from an existing target look and keep its current accessories
- Show avatar names and preview images when available
- Show accessory names and preview icons when available
- Edit accessory path, position, rotation, and scale before creating the new look
- Choose which placement fields to copy
- Replace duplicate accessories, keep both, or cancel when a duplicate is found
- Review the exact new look payload before creating it

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Microsoft Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the project folder that contains `manifest.json`.

You can also use the packaged build in `dist/vrchat-accessory-transfer-0.1.0.zip`. Extract the ZIP first, then load the extracted folder with **Load unpacked**.

## Use

1. Open `https://vrchat.com/home` in the same browser profile and log in normally.
2. Keep the VRChat tab open.
3. Click the extension icon.
4. Select **Load Avatars and Looks**.
5. Under **Copy from**, choose the saved Avatar Look that contains the accessory placement you want.
6. Select one or more accessories from that look.
7. Under **Create for**, choose the target avatar.
8. Optionally choose an existing target look as the starting point.
9. Choose which fields to copy: path, position, rotation, and scale.
10. Edit any copied values if needed.
11. Choose how duplicates should be handled.
12. Enter a name for the new Avatar Look.
13. Select **Review transfer**.
14. Review the values.
15. Select **Create new Avatar Look**.

The extension creates a new Avatar Look in your VRChat account. It does not overwrite the source look or the target look.

## Placement Notes

Accessory placement values are copied exactly. Rotation is kept as a quaternion in X, Y, Z, W order.

When copying between different avatar uploads, the same numeric values can look different if the rigs, proportions, bone lengths, or bone orientations are different. Copying between looks on the same avatar upload usually gives the most predictable result.

## Privacy

The extension uses your existing browser login session on `vrchat.com`.

It does not ask for, read, store, or transmit:

- VRChat passwords
- 2FA codes
- cookies
- auth tokens
- analytics
- telemetry

All requests go directly from your browser to VRChat. There is no backend server.

## Permissions

The extension uses:

- `scripting`
- access to `https://vrchat.com/*`

These permissions are used to make VRChat API requests from your already logged-in VRChat tab.

## Troubleshooting

If loading fails, make sure you are logged in on `https://vrchat.com/home` in the same browser profile and that the tab is still open.

If an avatar or accessory name is missing, the extension falls back to the saved VRChat ID. This can happen when VRChat does not return matching display metadata for that item.

If creating a look fails after pressing **Create new Avatar Look**, reload your Avatar Looks in VRChat before trying again. The request may have reached VRChat even if the response was interrupted.

## Disclaimer

This is an unofficial community tool and is not affiliated with, endorsed by, or supported by VRChat.
