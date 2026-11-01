# Letter asset library

This library contains 78 independent RGBA PNG sprites: 26 compact ivory metal letters, 26 elongated ivory metal letters, and 26 pumpkin letters. The six source atlases were generated with the built-in image_gen tool using the approved sticker assets as references. Prompts are recorded in prompts.md.

## Files

- `letters/compact/A.png` … `Z.png`: fixed 242 × 270 canvases.
- `letters/tall/A.png` … `Z.png`: fixed 348 × 437 canvases.
- `letters/pumpkin/A.png` … `Z.png`: fixed 348 × 359 canvases.
- `piston-base.png`: original 140 × 139 piston housing; socket is [57, 70].
- `variants/D-left.png`: the original outward-facing mirrored left D, adapted to 242 × 270. This variant is additional to the standard 78 glyphs.
- `manifest.json`: paths, fixed canvas sizes and per-letter attachment coordinates. All standard attachments lie on opaque upper letter strokes. Original G, T, M mount points are retained.
- `*-contact.png`: visual A–Z contact sheets used for review.
- `atlases/`: six generation source images.
- `prepare_letters.py`: reproducible connected-component atlas extraction, white-rim preservation, fixed-canvas assembly, original-asset reuse and attachment preparation.

The original G/T compact art, original normal D, original tall M and original pumpkin C are reused instead of substituting their newly generated atlas counterparts. The remaining glyphs were visually checked for letter identity. Small differences in individual glyph width and side-face geometry are intentional; the fixed canvas, metadata and mount points keep replacement stable.

All source letter images use the same raised front-right three-quarter view, dark navy contours and a narrow white sticker edge. No raster font or programmatically invented glyph was substituted for missing generated letters.
