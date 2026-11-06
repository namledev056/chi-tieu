# Chi tiêu

**English** · [Tiếng Việt](README.vi.md)

A personal expense tracker that runs entirely in your browser. Your data stays on your device (IndexedDB): no server, no account. Amounts are in Vietnamese đồng (VND), and bill splitting uses VietQR bank-transfer codes.

## Features

- **Transactions**: log income and expenses by category, search, browse by month.
- **Overview**: total income, total spending, net balance and a per-category breakdown.
- **Budgets**: set monthly limits per category, or add to an existing limit.
- **Split bill**: split an expense between several people and generate a **VietQR** code for each share; scan a bank QR image to fill in the receiving account.
- **Backup**: CSV export and import.
- **Bilingual**: Vietnamese and English, switchable in Settings. The default follows your browser language.
- **PWA**: install to your home screen and use it offline.

## Privacy

All data lives in your browser's IndexedDB. The app makes no external API calls, including when it creates or reads VietQR codes. Clearing your browser data deletes your data, so export a CSV regularly.

## Tech stack

[Next.js](https://nextjs.org) 16 · React 19 · TypeScript · [Dexie](https://dexie.org) (IndexedDB) · [Lucide](https://lucide.dev) icons · Playwright for end-to-end tests.

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # http://localhost:3100
```

### Use it on your phone (same Wi-Fi)

```bash
npm run build && npm start
```

Open `http://<your-computer-name-or-IP>:3100` on your phone (for example `http://my-laptop.local:3100`), then choose "Add to Home Screen".

> The service worker and camera access (QR scanning) require HTTPS or `localhost`. Over a LAN IP, some browsers block the camera.

## Testing

```bash
npx playwright install chromium   # first time only
npm run lint
npm run test:e2e
```

## Project structure

```
src/app/                 Next.js app router, manifest, service worker registration
src/features/finance/    All features: UI, IndexedDB (db.ts, repo.ts), VietQR (vietqr.ts), translations (i18n.tsx)
public/sw.js             Service worker for offline use
e2e/                     Playwright tests
```

### Adding a language

Translations live in [`src/features/finance/i18n.tsx`](src/features/finance/i18n.tsx). Add a dictionary that satisfies the `Dict` type, register it in `DICTS` and `LANGS`, and TypeScript will flag any missing strings.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Sponsor

If this app is useful to you, you can support it through [GitHub Sponsors](https://github.com/sponsors/namlxuit056).

## License

[MIT](LICENSE)
