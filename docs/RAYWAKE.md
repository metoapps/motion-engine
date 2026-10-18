# Raywake: image, video and audio

Motion-engine uses the public developer API at `https://api.raywake.com`, following the [current Raywake documentation](https://raywake.si/docs). The client is [lib/raywake.mjs](../lib/raywake.mjs).

## Set up

Copy `.env.example` to `.env` in the directory where you run the CLI, then add a customer API key from [Raywake](https://raywake.si/api-keys?utm_source=github&utm_medium=motion-engine&utm_campaign=oss&utm_content=integration-guide).

Permissions: `models:read`, `generate`, `jobs:read`. The wallet command also needs `wallet:read`. Keep the key in the local CLI environment; the generated HTML project and demo viewer never contain it.

## Discover, quote, generate

```bash
node bin/motion-engine.mjs models --category text-to-image
node bin/motion-engine.mjs models --category text-to-video
node bin/motion-engine.mjs models --category text-to-speech
node bin/motion-engine.mjs model nano-banana-pro
```

Model details include `openapi`, with the exact input contract. Use the model IDs returned by your live catalog; availability and fields can change. Model IDs containing `/` are supported. No provider-specific credentials are needed.

Save the exact request in a JSON file:

```json
{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "A red ceramic cup on a wooden table, soft morning light",
    "aspect_ratio": "1:1",
    "resolution": "1K",
    "num_images": 1,
    "output_format": "png"
  }
}
```

This image example was accepted by Raywake's live quote endpoint on 19 October 2026 (Europe/Istanbul). It is an example, not a guarantee of future availability or price. A [5-second video request](../examples/requests/video.json) was also accepted by the live Wan 3.0 Prime quote endpoint. For other video or audio models, build a request from that model's schema; do not copy image-only fields.

```bash
node bin/motion-engine.mjs quote request.json --out output/hero.quote.json
node bin/motion-engine.mjs generate request.json --quote output/hero.quote.json \
  --out output/hero --max-usd 1.00 --yes
```

- `quote` is free. It does not reserve funds or start a generation.
- `generate` requires the same request, a valid quote, an explicit USD cap and `--yes`.
- USD amounts are compared as exact decimal values. Legacy credit fields are not interpreted as dollars.
- The server validates the input and quote again. A budget cap cannot make an expired quote valid.
- Output filenames use their actual content type; inspect the printed path rather than assuming `.png` or `.mp4`.
- The CLI checks that downloaded files contain decodable media using FFmpeg.

## Interrupted work and held jobs

Before submission, `output/hero.state.json` records the exact body and a stable idempotency key. A transient network or server error retries with that identity. A concurrent invocation is blocked by a state lock.

```bash
node bin/motion-engine.mjs resume output/hero.state.json
```

If the job ID is known, resume polls it. If submission was interrupted before the ID arrived, it resends the same body and key. It never re-quotes or silently creates a fresh paid job. `submission_unknown`, `needs_review`, `needs_reconciliation` and failed jobs stop the automatic workflow. Check the job in Raywake; resume later if it has been reconciled.

A successful job whose download failed can be resumed without generating again. You can also retrieve an existing job explicitly:

```bash
node bin/motion-engine.mjs download JOB_ID --out output/existing
```

If a process was force-killed and left a `.lock`, verify it is no longer running before deleting that **lock file only** and resuming. Keep its `.state.json`; deleting the state loses the saved job identity.

## File inputs

Use publicly reachable HTTPS URLs in the file fields defined by the model, such as `image_url`. Keep them reachable until the job finishes. Models priced from uploaded media duration may require a Studio upload so Raywake can measure the file. This kit does not expose an upload API or guess durations. See [Inputs and files](https://raywake.si/docs/inputs).

Signed output links are temporary. Download the result into the local project, then reference the local copy. The client sends authorization only to the API; it does not forward your key to output hosts. Downloads are limited to 512 MiB per output.

## Compose the result

Create a manifest with one or more files, relative to the manifest itself:

```json
{
  "image": "output/hero.png",
  "video": "output/clip.mp4",
  "audio": "output/voice.mp3"
}
```

```bash
node bin/motion-engine.mjs demo --assets media.json --out output/custom-launch
```

Images replace the image tile, video replaces the video tile and is sought deterministically, and audio is mixed from time zero with the local effects. Adjust the scene and audio cues in `scene.js` for a full custom edit. The waveform graphic is illustrative; it is not an analysis of an imported audio file.

## What was verified

Local tests cover the image/video/audio response paths, USD caps, quote binding and expiry, idempotent retries, held jobs, download recovery and concurrent access. The demo render is real. The live API quote was checked separately through the connected Raywake account. A paid image/video/audio generation through this CLI was **not** performed for the release. See [VERIFICATION.md](VERIFICATION.md).
