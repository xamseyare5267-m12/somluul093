# SomLuul — Real installers (Windows x64 / Android / iOS)

## 1) Windows x64 EXE (full installer + portable)

**Sharci:** Adiga ayaa owner-ka app-ka — waxaad sii deyn kartaa EXE website-kaaga (SmartScreen wuu digni karaa ilaa code-signing certificate la iibsado).

### Build (Windows PC x64 — lama sameeyo Linux-ka Vercel)

```bash
cd somluul_prod
npm install
npm run build:exe
```

Natiijo:
- `dist_electron/SomLuul-Setup-1.0.0-x64.exe` — NSIS installer (desktop + Start Menu)
- `dist_electron/SomLuul-Portable-1.0.0-x64.exe` — portable

### Upload si web-ka looga soo dejiyo

1. Geli labada `.exe` folder: `public/downloads/`  
   **ama** `dist_electron/` (server wuu ka akhriyaa)
2. Redeploy Vercel / server
3. Link:
   - `/api/downloads/file?name=SomLuul-Setup-1.0.0-x64.exe`
   - `/api/downloads/file?name=SomLuul-Portable-1.0.0-x64.exe`

### Code signing (ikhtiyaari laakiin SmartScreen u fiican)

- Certificate: Sectigo / DigiCert / SSL.com (Windows Authenticode)
- electron-builder: `certificateFile` + `certificatePassword` env

---

## 2) Android (APK dhab ah)

**Sharci (sideload):** Waxaad ka soo dejin kartaa website-kaaga APK aad adigu dhistay.  
**Google Play:** Wuxuu u baahan yahay Play Console account + policy compliance (ma aha isla sideload).

### Hab A — PWA (degdeg, 0 store)

Chrome Android → menu → **Install app** / Add to Home Screen.  
Website-ku weli wuu online yahay.

### Hab B — Capacitor APK (native shell)

Windows/Mac + Android Studio:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init SomLuul com.somluul.app --web-dir=dist
npm run build
npx cap add android
# Set server URL in capacitor.config:
# server: { url: 'https://somluul-00021.vercel.app', cleartext: false }
npx cap sync android
npx cap open android
```

Android Studio → Build → Generate Signed Bundle / APK  
→ keystore **adiga ayaa abuurtaa** (ha gelin GitHub).

Soo geli APK: `public/downloads/SomLuul.apk` → web download shaqeeya.

---

## 3) iPhone / iPad (IPA)

**Sharci Apple:**  
- **Ma** bixin kartid IPA “download website” dadweynaha adiga oo aan **Apple Developer Program** ($99/sanad) haysan.  
- Distribution: **App Store**, **TestFlight**, ama Enterprise (shirkad keliya).  
- Sideload (AltStore / TrollStore) waa xaddidan oo sii kala duwan yahay — ma aha “download rasmi ah” dadka oo dhan.

### Waxa **sharci** ah oo hadda shaqeeya

1. **Safari → Share → Add to Home Screen** (PWA) — ogolaansho browser, website ma xirmo.  
2. Marka aad leedahay Apple Developer:
   - Capacitor iOS ama React Native
   - Xcode archive → TestFlight / App Store
   - Users: TestFlight link ama App Store page (ma aha file .ipa website random)

---

## Ogolaansho / permissions (installed app)

| Platform | Permissions |
|----------|-------------|
| PWA | Browser prompts: camera, mic, notifications — user waa ogolaadaa |
| Electron Windows | Camera/mic: OS permission dialogs; notifications: Windows settings |
| Android APK | AndroidManifest permissions + runtime prompts |
| iOS | Info.plist usage strings + runtime prompts |

WebRTC calls (voice/video) always require **user permission** for microphone/camera — that is required by browsers and stores.

---

## Summary

| Target | Available now from repo | Full store-grade |
|--------|-------------------------|------------------|
| Windows x64 EXE | `npm run build:exe` on Windows → upload `dist_electron/*.exe` | + Authenticode cert |
| Android | PWA now; Capacitor APK after Android Studio sign | Play Console |
| iPhone | PWA (Add to Home Screen) only without Apple Developer | Apple Developer + TestFlight/App Store |
