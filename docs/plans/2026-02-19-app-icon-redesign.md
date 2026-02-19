# App Icon Redesign — Geometric Inbox Tray

**Date:** 2026-02-19
**Status:** Approved

## Concept

Replace the current envelope + blue-G icon with a **geometric inbox tray** concept on a dark navy background. The design is clean, modern, and app-store-friendly — distinctly different from Gmail's own icon while still communicating "email inbox."

## Visual Design

**Composition:**
- Dark navy background (`#0D1B2A`)
- An open inbox tray rendered as two side walls + a bottom bar, in dark slate
- A cool-white envelope with V-fold flap sitting inside the tray
- A soft blue glow (`#60A5FA`) radiating behind the envelope
- Rounded corners on the background (handled natively by iOS/Android)

**Color Palette:**

| Element | Color |
|---|---|
| Background | `#0D1B2A` (deep navy) |
| Tray body | `#1A2D42` → `#2D4A6A` gradient (top to bottom) |
| Tray edge highlights | `#4A7099` |
| Inner tray floor | `#111E2E` |
| Envelope body | `#F8FAFF` → `#C8D8EE` gradient (top to bottom) |
| Envelope flap | `#C0CEDE` at 75% opacity |
| Fold lines | `#9AAABB` at 55% opacity |
| Glow | `#60A5FA` at 45% opacity, Gaussian blur r=22 |

**Layout (512×512 reference):**
- Tray left wall: x=72, y=172, w=46, h=266
- Tray right wall: x=394, y=172, w=46, h=266
- Tray bottom: x=72, y=392, w=368, h=46
- Envelope body: x=138, y=214, w=236, h=166
- Envelope flap: triangle from (138,214) → (256,304) → (374,214)

## Files to Generate

All assets generated programmatically via a Node.js canvas script:

| File | Size | Notes |
|---|---|---|
| `assets/images/icon.png` | 1024×1024 | Main app icon (iOS + fallback) |
| `assets/images/android-icon-foreground.png` | 432×432 | Tray + envelope on transparent bg |
| `assets/images/android-icon-background.png` | 432×432 | Solid `#0D1B2A` |
| `assets/images/android-icon-monochrome.png` | 432×432 | White shapes on black bg |
| `assets/images/splash-icon.png` | 512×512 | Same icon, used at 200px wide |
| `assets/images/favicon.png` | 64×64 | Simplified: envelope outline only |

## Implementation Approach

Write a single script `scripts/generate-icons.js` using the `canvas` npm package. The script renders all icon variants at their target sizes and writes them to `assets/images/`. A one-time `npm install canvas` (dev dependency) is needed.

The `app.json` config remains unchanged — it already references all the correct file paths.
