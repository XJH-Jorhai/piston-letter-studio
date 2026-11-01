# Changelog

## 1.1.3

- Added the user-provided Sam Gellaitry — Assumptions audio with native playback, seeking and volume controls.
- Added a responsive player above the workspace tabs, with metadata preload and user-initiated playback.

## 1.1.2

- Renamed the page to “随时随地，即刻开凿” and the settings section to “参数设置”.
- Replaced GTMC/DDMC editor presets with OOOO; kept the MC original preset and configurable A–Z slots.
- Removed the requested helper captions while retaining controls, curve-handle proxies and texture attribution.

## 1.1.1

- Fixed Minecraft travel to 100% (one block) in the component, editor, imported configurations and exports.
- Disabled Minecraft stroke controls; letter presets retain adjustable travel.
- Replaced whole-face sorting with per-pixel depth testing in both WebGL and CPU renderers, fixing iron/pumpkin overlap around 46% playback.

## 1.1.0

- Added an MC original preset: a carved pumpkin, four iron blocks and three fixed piston housings, with sourced Java Edition 1.21.4 textures.
- The block renderer uses a shared orthographic grid, nearest-neighbor pixels and block-unit travel; piston rods disappear completely on retraction.
- Original and letter presets share speed, stroke, authored curves, JSON configuration, GIF and self-contained offline HTML export.
- Added mode="minecraft" and a direct demo link with ?mode=minecraft.
- Verified geometry, preset switching, transparent GIF, offline HTML, configuration roundtrip and the 320px mobile layout.

## 1.0.1

Improvements after the first deployed GitHub Pages walkthrough:

- Increased curve controls and form text sizes; mobile editable fields use 16px.
- Export filenames now retain the configuration present when export began.
- Cancel is shown only for cancellable GIF encoding.
- Download anchors attach to the document before activation for better browser compatibility.
- Added a minimal two-instance component example with independent speed and playback controls.

The first live walkthrough rendered all 78 glyphs, dragged curve grips, downloaded a GIF, opened an exported HTML offline, and checked 320px mobile layout.

## 1.0.0

- Three generated A–Z libraries and the original outward-facing left D variant.
- Reusable Web Component with fixed piston bases and geometry-aware mounts.
- Complete-cycle Bézier editor, including selectable short-handle proxies.
- Self-contained offline HTML, browser-local GIF and JSON configuration export/import.
- GitHub Pages demo.
