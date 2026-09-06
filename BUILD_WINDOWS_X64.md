# SomLuul Windows x64 — dhis EXE dhab ah

## Shuruudaha
- Windows 10/11 **64-bit (x64)**
- Node.js 20+ (https://nodejs.org)
- ~2 GB disk free (Electron download)

## Amarrada (PowerShell)

```powershell
cd C:\Users\Maxamed\Desktop\m888

# 1) Ku rakib Electron + electron-builder
npm install

# 2) Dhiso web app + server, kadib Windows x64 installer
npm run build:exe
```

## Natiijada
Folder: `dist_electron\`

| Fayl | Waa maxay |
|------|-----------|
| `SomLuul-Setup-1.0.0-x64.exe` | NSIS installer (x64) — desktop + Start Menu |
| `SomLuul-Portable-1.0.0-x64.exe` | Portable — ma rakibto, toos u orod |

Ku dar `dist_electron\*.exe` server-ka (ama `public/downloads/`) si Download button-ku u soo dejiyo EXE dhab ah.

## Xaqiiji inuu yahay x64
PowerShell:
```powershell
(Get-Item .\dist_electron\SomLuul-Setup-1.0.0-x64.exe).VersionInfo
# ama
dumpbin /headers .\dist_electron\SomLuul-Setup-1.0.0-x64.exe | findstr machine
```
Waa inay muujiso **x64** / **8664**.

## Dev (ikhtiyaar)
```powershell
npm run build
$env:NODE_ENV="development"
npx electron .
```
