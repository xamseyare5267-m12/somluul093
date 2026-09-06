# Hagaha Maamulka iyo Wax-ka-beddelka App-ka SomLuul 🚀

SomLuul waa platform social media ah (sida Facebook) oo loogu talagalay bulshada Soomaaliyeed. Wuxuu leeyahay Feed, Messenger, Marketplace, Profiles, Admin/Owner dashboards, iyo in badan oo luuqado ah.

## Isbeddelladii Ugu Dambeeyay

- Laga saaray dhammaan xogta fake/sample (kooxaha iyo communities-ka been-abuurka ah ee Layout-ka).
- README-ga waa la cusbooneysiiyay si uu ugu habboonaado app-ka dhabta ah (social network, ma ahan file-manager kaliya).
- Messenger dropdown-ka wuxuu hadda isticmaalaa kaliya isticmaalayaasha dhabta ah. Kooxaha dhabta ah waxaa laga abuurayaa gudaha Messenger Section.

## Sida loo kiciyo (Local)

```bash
cp .env.example .env
# Deji JWT_SECRET iyo OWNER_PASSWORD
npm install
npm run dev
```

Fur: http://localhost:3000

## Folder Structure (muhiim)

- `server.ts` – Backend Express
- `src/components/FeedSection.tsx`, `MessengerSection.tsx`, `MarketplaceSection.tsx`, `ProfileSection.tsx`, `Layout.tsx`, `AuthPages.tsx`
- `src/server/db.ts` – Database-ka local JSON
- `public/locales/` – Luuqadaha (so.json, en.json, ...)
- `supabase_schema.sql` – Optional Supabase

## Database

Default: `data/db.json` (local).  
Optional: Supabase (deji keys-ka `.env`).

Haddii aad u baahato sifooyin dheeraad ah ama hagaajin kale, nala soo xiriir.
