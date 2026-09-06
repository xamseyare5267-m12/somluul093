# Hagaha Daabacaadda App-ka ee Google Play Store (SomLuul App)

Hambalyo! App-kaaga **SomLuul** wuxuu hadda u diyaarsan yahay in loo beddelo App Android ah oo la geliyo **Google Play Store**. 

 Maadaama deegaanka daruuriga ah ee **AI Studio** uusan si toos ah u geli karin akoonkaaga gaarka ah ee Google Play Console (oo u baahan lacag bixin dhan $25 iyo aqoonsi gaar ah), waxaan ku diyaarinay hagahan tillaabo-tillaabo ah oo ku tusi doona sida aad app-kaaga ugu beddeli lahayd Android App adigoo isticmaalaya **Capacitor** (oo ah aaladda ugu casrisan ee React loogu beddelo Mobile App).

---

## Tillaabada 1aad: Dejinta Akoonka Google Play Developer
Kahor intaadan app-ka upload-gareyn, waxaad u baahan tahay akoonka horumariyaha ee Google:
1. Booqo [Google Play Console](https://play.google.com/console/signup).
2. Ku gal akoonkaaga Google.
3. Bixi lacagta diiwaangelinta oo ah **$25** (waa hal mar oo kaliya oo aad bixinayso).
4. Dhameystir xaqiijinta aqoonsigaaga (Identity Verification).

---

## Tillaabada 2aad: App-ka React u Beddel Mobile App (Capacitor)
Waxaad ku samayn kartaa tillaabooyinkan kombiyuutarkaaga gaarka ah (Local Machine) markaad app-ka kala soo degto AI Studio adigoo isticmaalaya menu-ka Settings ee kor ku yaal (**Export as ZIP**).

### 1. Ku rakib Capacitor mashruucaaga:
Kombiyuutarkaaga ka furi Terminal-ka mashruuca dhexdiisa, ka dibna ku qor amaradan:
```bash
# Ku rakib Capacitor Core iyo CLI
npm install @capacitor/core @capacitor/cli

# Bilow dejinta Capacitor (Geli magaca App-ka iyo Package ID)
# Tusaale: App Name: SomLuul, App ID: com.somluul.app
npx cap init
```

### 2. Ku dar Barmaamijka Android:
```bash
# Ku rakib barmaamijka Android ee Capacitor
npm install @capacitor/android

# Ku dar galka Android-ka mashruucaaga
npx cap add android
```

### 3. Dhis Mashruuca (Build & Sync):
Mar kasta oo aad isbeddel ku sameyso koodhka React, dhis mashruuca ka dibna u wareeji dhanka Android:
```bash
# U dhis koodhka React-ga sidii wax soo saar (Production)
npm run build

# U wareeji faylasha dhisay galka Android-ka
npx cap sync
```

---

## Tillaabada 3aad: Ku Fur Android Studio si aad u diyaariso APK/AAB
Si aad u soo saarto faylka rasmiga ah ee Play Store la geliyo (oo ah `.aab` ama Android App Bundle), waxaad u baahan tahay **Android Studio** oo ku rakiban kombiyuutarkaaga.

1. Ku fur mashruuca Android Studio adigoo isticmaalaya amarkan:
   ```bash
   npx cap open android
   ```
2. Android Studio wuxuu si toos ah u furi doonaa galka `/android`.
3. Sug inta uu ka dhammaystirmayo dejinta Gradle (Gradle Sync).

---

## Tillaabada 4aad: Sameynta Jidka Saxda ah (Signing Keystore) iyo Soo Saarista `.aab`
Google Play Store wuxuu u baahan yahay in app-ku uu ahaado mid ku saxeexan fure ammaan ah (Signed App Bundle):

1. Gudaha Android Studio, ka dooro menu-ka sare: **Build** > **Generate Signed Bundle / APK**.
2. Dooro **Android App Bundle** ka dibna taabo **Next**.
3. Haddii aadan horey u lahayn fure, taabo **Create new...** oo ku hoos jira *Key store path* si aad u abuurto fure cusub (`key.jks`). Save-gareyso furahaas iyo erayga sirta ah (Password-ka) waayo haddii aad weydo dib uma cusboonaysiin kartid app-kaaga!
4. Geli macluumaadka loo baahan yahay (Password, Name, Organization).
5. Taabo **Next**, ka dibna dooro **Release** (Dhismaha rasmiga ah).
6. Taabo **Finish**.
7. Markuu dhameeyo dhismaha, wuxuu ku siin doonaa fayl la yiraahdo `app-release.aab` oo ku dhex jira galka `android/app/release/`.

---

## Tillaabada 5aad: U Upload-garee Google Play Store
1. Soo gal [Google Play Console](https://play.google.com/console).
2. Taabo **Create app** oo buuxi macluumaadka asaasiga ah:
   - **App name:** SomLuul
   - **Default language:** Somali (so) ama English
   - **App or Game:** App
   - **Free or Paid:** Free (haddii uu bilaash yahay)
3. Aad qeybta **Testing** > **Internal testing** ama **Production** ee ku taal dhinaca bidix.
4. Samee **New Release**.
5. Jiid oo ku tuur (Drag & Drop) faylkaaga `app-release.aab` ee aad ku dhistay Android Studio.
6. Buuxi macluumaadka dukaanka (Store Listing):
   - **Short description:** Barmaamijka rasmiga ah ee SomLuul.
   - **Full description:** Ku soo dhawaada SomLuul Platform, ku xidhnow asxaabtaada, adeegso Messenger-ka gaarka ah, Marketplace-ka, iyo Cloud Storage-ka rasmiga ah.
   - **App Icon:** Soo geli sawirka loogada oo cabirkiisu yahay `512x512` pixels (JPEG ama PNG).
   - **Feature Graphic:** Soo geli sawir cabirkiisu yahay `1024x500` pixels.
   - **Screenshots:** Soo geli ugu yaraan 2 sawir oo shaashadda app-ka ah (Mobile screenshots).
7. Buuxi foomamka siyaasadda asturnaanta (Privacy Policy) iyo qiimeynta da'da (Content Rating).
8. Ugu dambeyntii, u dir Google si ay u eegaan (Submit for Review). Waxay qaadataa inta badan 1 ilaa 3 maalmood in app-ku uu toos u noqdo (Live).

---

*Haddii aad u baahan tahay caawinaad dheeraad ah oo ku saabsan habaynta shaashadaha ama astaamaha kale ee app-ka, fadlan i weydii!*
