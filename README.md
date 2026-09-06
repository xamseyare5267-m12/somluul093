# SomLuul – Social Platform (Facebook-style)

SomLuul is a modern full-stack social networking web application inspired by Facebook. It is designed primarily for the Somali community and supports multiple languages. Users can create posts, share stories, message friends, browse a marketplace, manage profiles, and more.

## Core Features

- **Authentication**: Login / Sign Up (email & phone OTP), forgot/reset password, session restore, device management, OAuth hooks.
- **Feed**: Create posts (text, images, video), multi-reactions, nested comments, share, report, stories (24h + viewers), infinite scroll.
- **Groups & Communities**: Create/join groups, posts with media, invites, moderators, member roles.
- **Reels**: Short vertical video feed from real video posts.
- **Content safety**: Blocks nude/sex/porn text and filenames (client + server).
- **Messenger**: Chat rooms, DMs, SSE realtime + typing indicators, voice notes, polls, broadcast, contacts sync, block users.
- **Marketplace**: Buy/sell listings.
- **Profiles**: Public profiles, follow/unfollow, bio, avatar, work, location, etc.
- **Monetization**: Creator tools and subscription-related UI.
- **Admin & Owner dashboards**: User management, moderation, stats, system notices, backup/restore, feature flags.
- **File / Media**: Drag-and-drop uploads, previews (image, video, PDF), storage metrics.
- **PWA & Desktop**: Progressive Web App support + Electron desktop builds.
- **Multi-language**: Full i18n (Somali, English, Arabic, and many others).
- **Theme**: Dark / Light mode.

## Technical Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Axios, Motion.
- **Backend**: Node.js + Express (single `server.ts`), JWT auth, Multer, local JSON database (default) with optional Supabase / GCS sync.
- **Database**: Supabase Postgres is required for production. Local `data/db.json` is retained only for development/legacy migration; it is not a production source of truth.
- **Other**: Nodemailer (email), bcryptjs, Zod validation.

## Quick Start (Local)

1. Install Node.js 18+.
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at least:
   ```env
   JWT_SECRET=your-long-random-secret-here
   OWNER_USERNAME=MXDdeeq207
   OWNER_PASSWORD=your-strong-owner-password
   ```
3. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000

The app starts with an empty database. Create an account via Sign Up. The owner account is created automatically from the `OWNER_*` variables on first run (or can be restored from backup).

## Production Notes

- See `PRODUCTION_DEPLOYMENT.md` and `STORES_PUBLISH_GUIDE.md` for deployment, PWA, and store publishing.
- Optional cloud: set Supabase / GCS variables in `.env` for persistent storage across deploys.
- Default storage is local filesystem + JSON DB (suitable for single-server or development).

## Project Structure (key parts)

```
├── server.ts                 # Express backend (API + static serve)
├── src/
│   ├── App.tsx               # Main React app & session
│   ├── components/
│   │   ├── FeedSection.tsx
│   │   ├── MessengerSection.tsx
│   │   ├── MarketplaceSection.tsx
│   │   ├── ProfileSection.tsx
│   │   ├── Layout.tsx
│   │   ├── AuthPages.tsx
│   │   ├── LandingPage.tsx
│   │   └── ...dashboards
│   ├── server/db.ts          # Local JSON DB + helpers
│   └── types.ts
├── public/locales/           # i18n JSON files
├── supabase_schema.sql       # Optional Supabase schema
└── package.json
```

## Removing Fake / Demo Data

All hardcoded sample groups, demo communities and placeholder chat entries have been removed. The messenger dropdown and full Messenger section now rely only on real users and chat rooms created through the API.

## License / Ownership

Private project – SomLuul. All rights reserved by the owner.
