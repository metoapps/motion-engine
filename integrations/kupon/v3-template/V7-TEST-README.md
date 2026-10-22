# METO–LORT V7 video lock

Locked winner: **METO**. Locked loser: **LORT**. Duration: **15 seconds**. Original full-screen image quality and V7 sound are preserved.

The originals are NOT committed into the repository; use the approved local MP4 and WAV matching the hashes in [V7-LOCK.json](V7-LOCK.json).

```bash
node integrations/kupon/v3-template/verify-v7.mjs \
  --video /path/to/METO-LORT-KOMEDI-ORKESTRA-V7.mp4 \
  --audio /path/to/METO-LORT-MUZIK-V7.wav \
  --out /path/to/METO-LORT-V7-verified.mp4
```

This copies the source video bitstream and encodes an AAC audio track. It verifies **all 360 decoded video frames** are identical before publishing, and rejects mismatched input hashes. Requires Node.js 22, FFmpeg and ffprobe.

**Status:** Verified via a parallel local Python/FFmpeg test: 15 seconds, 720×1280, 24 fps, 360 original frames matching. This Node wrapper was added to the draft branch but has not been run from a clean checkout. Separately, Motion Engine's own `render` CLI has NOT been verified in this environment because the fork could not be cloned and `playwright-core` was unavailable. This is not yet automated weekly Kupon integration. Do not merge into live Kupon.
