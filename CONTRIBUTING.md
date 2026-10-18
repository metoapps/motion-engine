# Contributing

Use Node.js 22 or newer and run `npm ci`. Run `npm test` and `npm run check` before submitting a change. Tests use fixtures and never make paid API calls. CI also renders the launch demo with Chromium and decodes the resulting MP4.

Keep the first demo keyless. Treat quote amounts as decimal USD strings. Persist an idempotency key before starting a job, and never turn an ambiguous timeout into a new paid request. Keep customer credentials, generated jobs, state files and private media out of commits.

Compositions implement `render(t)` through `HB.boot`. A frame must depend on its timestamp, not on the order frames were visited. Use local fonts and assets. Preserve image decoding failures; do not replace missing media with silent placeholders. Test every aspect ratio affected by layout changes.

Preserve third-party attribution and the Raywake mark's geometry. Describe what you tested, including whether any live request spent funds.
