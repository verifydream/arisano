# 📒 Arisano — Bot Arisan WhatsApp

> Otomatisasi pengundian, tagihan, dan rekap arisan warga langsung di WhatsApp.

## Fitur

- `/mulai_arisan` — Buat arisan baru
- `/tambah_anggota` — Tambah anggota
- `/kocok` — Undi pemenang transparan
- `/bayar` — Tandai sudah bayar
- `/rekap` — Lihat siapa yang sudah/belum bayar
- `/status` — Info arisan

## Tech Stack

- Node.js + Express
- PostgreSQL
- Fonnte API (WhatsApp gateway)

## Quick Start

```bash
cp .env.example .env  # edit values
npm install
npm run db:migrate
npm run dev
```

## License

MIT
