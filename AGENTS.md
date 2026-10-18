# motion-engine

This repository is independent of the original motion-kit workspace. Never edit or copy back into that source workspace.

- The bundled demo must work without credentials or network calls after dependencies are installed.
- Paid Raywake generation is a separate explicit action; quoting, tests and rendering do not authorize spending.
- Keep exact quote/input binding, persisted idempotency and safe resume behavior.
- Do not commit `.env`, quote/state files, private job identifiers, customer media or machine-specific paths.
- Do not claim inference was tested when only fixtures or quotes were checked.
- Render changed demo scenes and inspect the actual poster/contact sheet at landscape, portrait and square ratios.
- Preserve THIRD_PARTY_NOTICES.md and bundled font/saas-motion-kit licenses.
- Before release: `npm test`, `npm run check`, a real demo render and full FFmpeg decode.
