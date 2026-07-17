# 📒 Arisano — Bot Arisan WhatsApp

> Otomatisasi pengundian, tagihan, dan rekap arisan warga langsung di WhatsApp.

## What is Arisano?
Arisano is an automated arisan (rotating savings) bot designed for WhatsApp groups. Arisan is a form of rotating savings and credit association (ROSCA) common in Indonesia.
The bot helps groups manage their arisan automatically through WhatsApp messages, handling member registration, monthly random draws, payment tracking, and status summaries.

### Arisan Rules
- **Random Draw**: Each month, a winner is drawn randomly from the eligible members.
- **No Repeat**: A member can only win once per rotation. The bot ensures that past winners cannot be drawn again until everyone has won. Once everyone has won, the rotation resets.
- **Payment Tracking**: Members' monthly payments can be marked and tracked, making it easy to know who has and hasn't paid.

## Tech Stack
- **Node.js** + **Express** for the core application and API.
- **PostgreSQL** for the database.
- **Fonnte API** for the WhatsApp gateway integration.
- **Docker** & **Docker Compose** for containerization and easy deployment.

## Command Reference

| Command | Description | Example | Expected Response |
|---------|-------------|---------|-------------------|
| `/mulai_arisan` | Creates a new arisan in the group. Sets the contribution amount and draw day. | `/mulai_arisan 100000 1` | "✅ *Arisan dibuat!* ..." with group info and next steps. |
| `/tambah_anggota` or `/add` | Adds one or more members to the arisan. | `/tambah_anggota Budi Andi` | "✅ *2 anggota ditambahkan:* ..." |
| `/hapus_anggota` or `/remove` | Removes a member from the arisan. | `/hapus_anggota Budi` | "✅ *Budi* dihapus dari arisan." |
| `/kocok` or `/undi` | Randomly draws a monthly winner among those who haven't won yet. | `/kocok` | "🎲 *KOCAK ARISAN* 🎲 ... 🎉🎉🎉 *PEMENANG BULAN...*" |
| `/bayar` | Marks a specific member as having paid for the current month. | `/bayar Andi` | "✅ *Andi* sudah ditandai bayar..." |
| `/rekap` | Displays a summary of who has and hasn't paid for the current month. | `/rekap` | "📊 *REKAP ARISAN...* ✅ *Sudah bayar...* ❌ *Belum bayar...*" |
| `/status` | Shows the current status of the arisan (members, contribution, recent winners). | `/status` | "ℹ️ *STATUS ARISAN* ..." |
| `/help` or `/bantuan` | Shows the help menu with available commands. | `/help` | "📒 *Arisano — Bot Arisan WhatsApp* ..." |

## Sample WhatsApp Conversations

**Starting a new arisan and adding members:**
```
User: /mulai_arisan 50000 5
Bot: ✅ *Arisan dibuat!*
📋 Grup: Arisan Keluarga
💰 Iuran: Rp 50.000/bulan
📅 Hari kocok: Tanggal 5

Langkah selanjutnya:
1. Tambah anggota: /tambah_anggota Budi Andi Citra
2. Lihat status: /status
3. Mulai kocok: /kocok

User: /tambah_anggota Budi Citra Doni
Bot: ✅ *3 anggota ditambahkan:*
• Budi
• Citra
• Doni

Total anggota: 3
```

**Drawing a winner:**
```
User: /kocok
Bot: 🎲 *KOCAK ARISAN* 🎲

Mengundi dari 3 nama...
Yang belum menang: Budi, Citra, Doni

Bot: ⏳ *Mengocok...* 🎰

Bot: 🎉🎉🎉 *PEMENANG BULAN JULI 2024* 🎉🎉🎉

🏆 *Citra* 🏆

Selamat! Kamu mendapatkan Rp 150.000!

📊 Total anggota: 3
💰 Total kumpulan: Rp 150.000
```

**Tracking Payments:**
```
User: /bayar Budi
Bot: ✅ *Budi* sudah ditandai bayar Juli 2024.

User: /rekap
Bot: 📊 *REKAP ARISAN Juli 2024*

✅ *Sudah bayar (1/3):*
  ✓ Budi

❌ *Belum bayar (2):*
  ✗ Citra
  ✗ Doni

💰 Total kumpulan: Rp 150.000
💵 Sudah masuk: Rp 50.000
📋 Belum masuk: Rp 100.000
```

## Setup & Run

### Manual Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials and Fonnte API token
   ```
3. Run database migrations:
   ```bash
   npm run db:migrate
   ```
4. Start the application:
   ```bash
   npm run dev # for development with auto-restart
   # OR
   npm start # for production
   ```

### Docker Setup
1. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
2. Build and run using Docker Compose:
   ```bash
   docker-compose up --build -d
   ```
3. (If not run automatically) Run database migrations inside the container:
   ```bash
   docker-compose exec app npm run db:migrate
   ```

## License
MIT
