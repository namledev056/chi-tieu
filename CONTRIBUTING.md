# Contributing to Chi tiêu

Thanks for your interest! A few short guidelines:

## Reporting bugs and suggesting features

Open an [issue](https://github.com/namledev056/chi-tieu/issues) and describe what you did, what you expected, what actually happened, and which browser and device you used. Screenshots help a lot.

**Don't** attach CSV files with real spending data or real bank account numbers.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Run `npm install`, then `npm run dev` to try it out.
3. Keep changes small and focused on one thing.
4. Add or update Playwright tests in `e2e/` when you change behavior.
5. Make sure `npm run lint` and `npm run test:e2e` both pass.
6. Open a PR describing what changed and why.

## Principles

- **Data stays on the device.** Don't add anything that sends user data elsewhere (analytics, third-party APIs, ...) without discussing it in an issue first.
- Mobile first: check your change at narrow screen widths.
- All user-facing text goes through `src/features/finance/i18n.tsx`, with both Vietnamese and English strings. Code and comments are in English.
