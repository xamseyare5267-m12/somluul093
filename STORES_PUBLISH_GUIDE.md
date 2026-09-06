# Hagaha Daabacaadda App-ka ee Apple App Store iyo Microsoft Store (SomLuul App)

Hambalyo! App-kaaga **SomLuul** wuxuu hadda si buuxda ugu diyaar yahay in loo beddelo barnaamijyo u gaar ah **iOS (Apple)** iyo **Windows (Microsoft)** si aad u geliso dukaamada rasmiga ah.

Maadaama dukaamadan ay u baahan yihiin xisaabaad horumariye (Developer Accounts) oo ku xiran aqoonsigaaga rasmiga ah iyo lacag-bixin, waxaan ku diyaarinay hagahan tillaabo-tillaabo ah oo ku tusi doona sida aad ugu dhisayo kombiyuutarkaaga gaarka ah (Local Machine) ka dib markaad app-ka kala soo degto AI Studio adigoo isticmaalaya menu-ka Settings (**Export as ZIP**).

---

## QAYBTA 1AAD: DAABACAADDA APPLE APP STORE (iOS)

Si aad app-ka ugu daabacdo aaladaha Apple (iPhone/iPad), waxaad u baahan tahay kombiyuutar **Mac (macOS)** ah iyo barnaamijka **Xcode**.

### Tillaabada 1aad: Dejinta Akoonka Apple Developer
1. Booqo [Apple Developer Program](https://developer.apple.com/programs/).
2. Ku gal **Apple ID**-gaaga.
3. Iska diiwaangeli adigoo bixinaya lacagta sanadlaha ah oo ah **$99**.
4. Soo degso app-ka **Apple Developer** ee iPhone-kaaga si aad u xaqiijiso aqoonsigaaga (Identity Verification).

### Tillaabada 2aad: App-ka u beddel iOS adigoo isticmaalaya Capacitor
Kombiyuutarkaaga Mac-da ah ka furi Terminal-ka dhexdiisa galka mashruuca, ka dibna ku qor amaradan:

1. Ku rakib barmaamijka iOS ee Capacitor:
   ```bash
   npm install @capacitor/ios
   ```
2. Ku dar galka iOS-ka mashruucaaga:
   ```bash
   npx cap add ios
   ```
3. Samee dhismaha rasmiga ah ee React oo u wareeji iOS:
   ```bash
   npm run build
   npx cap sync
   ```

### Tillaabada 3aad: Ku Fur Xcode oo ku Habee App-ka
1. Ku furi Xcode adigoo isticmaalaya amarkan:
   ```bash
   npx cap open ios
   ```
2. Gudaha Xcode, ka dooro dhanka bidix galka sare ee **App**.
3. Tag qeybta **Signing & Capabilities**:
   - Dooro **Automatically manage signing**.
   - Qeybta **Team**, ka dooro magacaaga ama shirkaddaada (Akoonkaaga Apple Developer).
   - Qeybta **Bundle Identifier**, hubi inuu yahay mid gaar ah, tusaale: `com.somluul.app`.

### Tillaabada 4aad: Archive iyo u Dirista App Store Connect
1. Dooro aaladda dhismaha oo ka dhig **Any iOS Device (arm64)** (halkii ay ka ahaan lahayd Simulator).
2. Menu-ka sare ee Xcode ka dooro: **Product** > **Archive**.
3. Markuu dhameeyo dhismaha, waxaa kuu soo bixi doona daaqad cusub (Organizer window).
4. Taabo badhanka **Distribute App** ee midigta ku yaal.
5. Dooro **App Store Connect** > **Upload** ka dibna raac tillaabooyinka ilaa uu ka dhameeyo Upload-ka.

### Tillaabada 5aad: Dhameystirka App Store Connect
1. Booqo [App Store Connect](https://appstoreconnect.apple.com/).
2. Samee App cusub adigoo dooranaya **My Apps** > **+** > **New App**.
3. Buuxi macluumaadka dukaanka (Astaanta App-ka, Screenshots, iyo Sharraxaadda).
4. Qeybta **Build**, ka dooro dhismihii (Build-kii) aad ka soo dirtay Xcode.
5. Soo gudbi Siyaasadda Asturnaanta (Privacy Policy URL).
6. Taabo badhanka **Submit for Review** ee ku yaal geeska sare. Apple waxay qaadataa 24 ilaa 48 saacadood si ay u ansixiyaan app-kaaga.

---

## QAYBTA 2AAD: DAABACAADDA MICROSOFT STORE (WINDOWS)

Maadaama SomLuul uu yahay barnaamij si buuxda u taageeraya **PWA (Progressive Web App)** oo leh Service Worker iyo Manifest, habka ugu fudud ee Windows loogu daabaco waa adeegsiga **PWABuilder** oo ay maamusho Microsoft.

### Tillaabada 1aad: Dejinta Akoonka Microsoft Partner Center
1. Booqo [Microsoft Partner Center](https://partner.microsoft.com/dashboard/registration).
2. Ku gal akoonkaaga Microsoft (Outlook/Hotmail).
3. Iska diiwaangeli sidii **Developer** (Lacagtu waa qiyaastii **$19** hal mar oo kaliya oo loogu talagalay shaqsiyaadka, ama **$99** haddii ay shirkad tahay).

### Tillaabada 2aad: Xirxirida App-ka adigoo isticmaalaya PWABuilder (Aad u Fudud)
Microsoft waxay abuuray aalad si toos ah PWA-ga ugu beddeleysa faylka rasmiga ah ee Windows dukaankeeda la geliyo (**MSIX**):

1. Booqo mareegta rasmiga ah ee Microsoft: [PWABuilder](https://www.pwabuilder.com/).
2. Geli URL-ka app-kaaga SomLuul ee Live-ka ah (Shared App URL-kaaga: `https://ais-pre-5o7ij2oswlzow44frp4ipk-469462149617.europe-west3.run.app`).
3. Taabo **Start**. PWABuilder wuxuu baari doonaa Manifest-ka iyo astaamaha app-ka si uu u hubiyo inay u diyaarsan yihiin Windows.
4. Markay baaritaanku dhammaato oo ay wada cagaar noqdaan, taabo badhanka **Generate**.
5. Dooro qeybta **Windows** oo taabo **Generate Package**.
6. Halkan waxaa lagaa rabaa inaad geliso macluumaadka lagugu siiyay akoonkaaga **Microsoft Partner Center** markaad App-ka diiwaangelisay:
   - **Package Identity Name**
   - **Publisher Identity (CN)**
   - **Publisher Display Name**
7. Markaad geliso, PWABuilder wuxuu kuu soo saari doonaa fayl ZIP ah oo ka kooban faylka rasmiga ah ee dukaanka la geliyo oo ku dhammaanaya `.msixbundle` ama `.appx`.

### Tillaabada 3aad: U Upload-garee Microsoft Partner Center
1. Soo gal [Microsoft Partner Center Dashboard](https://partner.microsoft.com/dashboard).
2. Dooro **Windows & Xbox** > **Submit a new app**.
3. Geli magaca rasmiga ah ee app-ka: **SomLuul**.
4. Buuxi qaybaha loo baahan yahay:
   - **Pricing and availability:** Dooro inuu yahay Bilaash (Free) iyo wadamada la rabo in laga soo dego.
   - **Properties:** Dooro qeybta uu ka tirsan yahay (Tusaale: Social/Communication).
   - **Age ratings:** Buuxi foomka si loo go'aamiyo da'da ku habboon app-ka.
5. Qeybta **Packages**, u jiid oo ku tuur (Drag & Drop) faylka `.msixbundle` ee aad ka soo dejisay PWABuilder.
6. Qeybta **Store listings**, ku qor sharraxaadda app-ka, astaamaha gaarka ah, iyo screenshots-ka shaashadda Windows-ka.
7. Taabo **Submit to the Store**. Microsoft waxay qaadataa inta badan 1 ilaa 3 maalmood inay dib u eegaan oo ay toos u geliyaan dukaanka Microsoft Store ee kombiyuutarada oo dhan.

---

*Haddii aad u baahan tahay caawinaad kasta oo ku saabsan habaynta summadaha, beddelidda faylasha, ama xallinta khaladaadka dhismaha, fadlan i weydii si aan kuu caawiyo!*
