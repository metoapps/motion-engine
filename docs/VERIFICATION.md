# Release verification

Release candidate 0.1.0, 19 October 2026 (Europe/Istanbul).

## Confirmed locally

- Installed the locked dependency in an independent working directory.
- Built and fully decoded a real 12-second launch film, 30 fps, H.264 video and AAC audio, at 1280×720, 720×1280 and 1080×1080.
- Generated posters, contact sheets and a README GIF from the rendered media.
- Rendered and decoded a separate film importing an existing image, MP4 and WAV through the local media manifest; no AI calls.
- API fixture tests cover image, video and audio outputs, exact USD comparisons, quote expiry and binding, missing approval, idempotent retries, held/failed jobs, download recovery (including corrupt or missing local media), secret redaction and concurrent state locking.
- A local HTTP preview test verifies that environment and job-state files are not served.
- The real demo viewer played and decoded all three MP4 formats at desktop (1440 px) and mobile (390 px) widths with no browser errors or horizontal overflow.

The MP4s and posters under `docs/assets/` are actual generated render artifacts, not mock screenshots.

## Live API evidence, without spending

Read the current first-party Raywake API documentation and compared the client with the gateway's public contract. Quotes for the bundled image and video requests were accepted through the connected Raywake account on this release date: Nano Banana Pro at $0.24 USD and a 5-second, 720p Wan 3.0 Prime video without audio at $0.45 USD at the time of the check. The response supplied `quote_id`, `price_usd`, `expires_at` and normalized input. No generation was started, no balance was reserved, and the expiring quote itself is not committed.

This validates current quote availability. It does not claim that the CLI made a paid end-to-end generation. Image/video/audio job lifecycles were exercised with local fixtures. A production developer-key inference run remains an explicit paid operation for the operator.

## Source preservation

Only selected runtime, synthesized sound, font and brand files were copied into this independent repository. Source-file hashes are checked outside the release package; the original motion-kit working directory is not modified. No `.env`, client archive, job-state data, provider key or machine-specific work path is shipped.

## Reproduce

```bash
npm ci
npm test
npm run check
npm run demo
node bin/motion-engine.mjs demo --format portrait --out output/portrait
node bin/motion-engine.mjs demo --format square --out output/square
```

See each output's `film-qa.json`. Verification of one operating system does not establish all-platform support: macOS was checked locally; the repository includes a Linux CI render job. Windows installation is documented but was not run on a Windows machine.
