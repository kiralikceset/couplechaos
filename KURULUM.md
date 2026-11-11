# Couple Chaos — v11 Kurulum ve Yayın Rehberi

Bu sürüm (v11) şunları içerir: oyunun **kendi sunucusu**, **gerçek yapay zeka yorumu**, **iOS projesi**,
yeni ikon/açılış ekranı, yeni **Ortak Tuval** modu ve **gerçek Apple/Google girişi**. Premium ise ilk sürümde kapalı.

## 0. v11'de yeni olanlar

- **🖌️ Ortak Tuval modu:** İki kişi aynı anda, tek bir tuvale çizer. Kelimeyi ikisi de bilir, konuşmak yok.
  - Oyun 3-2-1 geri sayımla başlar ve 20 saniye sürer.
  - Partnerin çizgileri canlı görünür. Farklı ekran boyutlarında bile iki tuval birebir aynı kalır (testte %0 fark).
  - Çizerken uçan emoji tepkileri gönderilebilir (😂🔥😱😍🤡👏).
  - İkisi de "Bitirdim" derse tur erken biter.
  - Yapay zeka ortak eseri ve ekip uyumunu yorumlar.
  - Ana sayfada "NEW" etiketiyle duruyor. Odayı açan kişinin seçtiği mod geçerli olur, katılan kişi otomatik olarak o moda girer.
- **Gerçek giriş:** iPhone'da Apple + Google, Android'de Google girişi var.
  - Kimlik belgesi sunucuda Apple/Google imzasıyla doğrulanır.
  - Ayarı yapılmamış bir giriş butonu hiç gösterilmez; çalışmayan buton kalmaz.
  - Misafir olarak oynamak her zaman mümkün.
- **Profil:** Hesap bilgisi, çıkış, **"Hesabı ve verileri sil"** (Apple bunu zorunlu tutar), gizlilik politikası ve sürüm numarası eklendi.
- **Gizlilik politikası:** `client/public/privacy.html` (Türkçe + İngilizce). Hem uygulama içinden açılır hem de
  `https://<sunucun>/privacy.html` adresinden yayında olur. Mağaza formlarına bu adresi yazarsın.
  **İçindeki `[İLETİŞİM E-POSTASI]` alanını doldur.**
- **Premium:** Ödeme sistemi kapalıyken (varsayılan) premium ekranına hiçbir yoldan ulaşılamıyor ve herkes her şeyi oynuyor.
  Not: v10 notunda "Satın Al premium'u ücretsiz açıyor" demiştim. Daha dikkatli bakınca bu ekrana zaten ulaşılamadığını
  gördüm; yine de ulaşılmasının ihtimalini de kapattım.


---

## 1. Bu sürümde ne düzeldi?

| Sorun | Durum |
| --- | --- |
| Paketteki sunucu (`server/index.ts`) uygulamayla **uyumsuzdu**: uygulama HTTP "protocol 2" konuşuyor, sunucu eski WebSocket protokolündeydi. Oyun yalnızca başka bir yerde çalışan, kaynağı pakette olmayan bir sunucuyla oynanabiliyordu. | ✅ Sunucu baştan yazıldı, uygulamanın konuştuğu protokolün birebir aynısı. |
| Süreler telefonda tutuluyordu: bir telefon donarsa ya da arka plana geçerse diğer oyuncu ekranda takılı kalıyordu. | ✅ Süreleri artık sunucu yönetiyor. Kimse bir şeye basmasa bile tur sonuca ulaşıyor. |
| Bağlantısı kopan oyuncu fark edilmiyordu. | ✅ 25 saniye sinyal gelmezse partnere "bağlantı koptu" bildirimi gidiyor. Oda bekleme ekranındayken bu süre 10 dakika, böylece kodu WhatsApp'tan gönderirken oda kapanmıyor. |
| İnternet kesilince aynı işlem iki kez uygulanabiliyordu. | ✅ Her işlem tek kez uygulanıyor. |
| "AI yorum" gerçek yapay zeka değildi: hazır espri listesinden rastgele cümle seçiliyor, puan piksel sayılarak veriliyordu. | ✅ Sunucuya gerçek yapay zeka bağlandı (Claude veya OpenAI). Yapay zeka çizime bakıp absürt bir yorum yapıyor. Anahtar yoksa eski yorumlar yedek olarak çalışıyor. |
| Çizimler büyük PNG olarak gönderiliyordu. | ✅ En fazla 768 piksellik JPEG'e çevrildi. 5-10 kat küçük, mobil veride hızlı. |
| iOS projesi yoktu. | ✅ `ios/` klasörü eklendi (Xcode, Swift Package Manager; CocoaPods gerekmez). |
| iPhone çentiği/Dynamic Island ekranın üstünü kapatıyordu. | ✅ Güvenli alan ayarı eklendi. |
| iOS'ta durum çubuğu yazıları siyah zeminde siyah görünüyordu. | ✅ Açık renk yapıldı. |
| İkon ve açılış ekranı Capacitor'ın varsayılan mavi "X" ikonuydu; açılış ekranı beyazdı, açılışta beyaz parlama oluyordu. | ✅ Uygulama renklerinde yeni ikon ve koyu açılış ekranı. |
| Android'de klavye ipucu alanını kapatabiliyordu, ekran yan dönebiliyordu, titreşim izni yoktu. | ✅ `adjustResize`, sadece dikey kullanım ve `VIBRATE` izni eklendi. |
| Bekleme ekranında "WAITING" yazısı çevrilmemişti. | ✅ Dört dile çevrildi. |
| "Başarım açıldı" bildirimi yeni turda gizli kelimenin üstünü kapatıyordu. | ✅ Oyun sırasında bildirim gösterilmiyor. |
| Release imzası için ayar yoktu. | ✅ `android/keystore.properties` desteği eklendi (aşağıda). |

**Testler (v11):** 44 otomatik test geçiyor. Aşağıdaki v10 notları da hâlâ geçerli.
**v10 testleri:** 38 otomatik test geçiyordu. Bunların 7'si gerçek sunucu ile uygulamanın gerçek bağlantı
kodunu birlikte çalıştırıyor. Ayrıca tarayıcıda iki ayrı "telefonla" baştan sona maç oynatıldı:
oda kodu, ipucu, çizim, sonuç, ikinci tur ve rol değişimi. İpucu karşıya yaklaşık 0,4 saniyede
ulaşıyor. Sonuç, çizim gönderildikten yaklaşık 0,8 saniye sonra iki ekranda birden açılıyor
(yapay zeka kapalıyken).

---

## 2. Sunucuyu yayına al (bir kere yapılır)

Oyunun çalışması için sunucunun internette açık olması gerekir. En kolay yol **Render.com**:

1. Projeyi GitHub'a yükle. `.gitignore` gizli dosyaları zaten dışarıda bırakıyor.
2. Render → **New → Blueprint** → repoyu seç. `render.yaml` ayarları otomatik okunur.
3. **Environment** sekmesine yapay zeka anahtarını ekle (hangisine sahipsen):
   - `ANTHROPIC_API_KEY` = Claude anahtarı, **veya**
   - `OPENAI_API_KEY` = OpenAI anahtarı
4. Yayına alınınca `https://<adın>.onrender.com/api/health` adresini aç. Şunu görmelisin:
   `{"status":"ok","protocol":2,...,"ai":true}`

> ⚠️ Sunucu odaları hafızada tutar. **Tek kopya (1 instance)** çalıştır, otomatik ölçeklemeyi açma.
> Ücretsiz planda sunucu uykuya geçer ve ilk bağlantı 30-60 sn sürer; gerçek kullanıcılar için ücretli
> "Starter" plan öner. Railway, Fly.io veya bir VPS'te de `Dockerfile` ile aynı şekilde çalışır.

**Maliyet kontrolü:** `AI_DAILY_LIMIT` (varsayılan 3000) günlük yapay zeka çağrısını sınırlar.
Limit dolunca oyun durmaz, hazır yorumlara geçer. Varsayılan modeller ucuz/hızlı olanlardır
(`claude-haiku-5-5` / `gpt-4o-mini`); değiştirmek için `AI_MODEL`.

**API anahtarını neden uygulamaya koymuyoruz?** APK açılıp içi okunabilir. Uygulamaya konan anahtar
çalınır ve fatura sana çıkar. Anahtar sadece sunucuda durur.

---

## 3. Uygulamayı yeni sunucuya bağla

`.env.production` şu adresle hazır: `https://couple-chaos-server.onrender.com`. Bu, `render.yaml` ile
kurduğunda Render'ın vereceği varsayılan adres. Render farklı bir adres verirse (isim doluysa sonuna ek koyar)
dosyadaki adresi değiştir.

> ⚠️ Eski sunucu (`...chatgpt.site`) Ortak Tuval'i, girişi ve yapay zekayı bilmez. Uygulama artık yeni sunucuyla çalışmalı.

Ardından:

```bash
pnpm install
pnpm check && pnpm test          # tip kontrolü + 44 test
pnpm run mobile:sync             # web derlemesi + iOS ayarı + android/ ve ios/ içine kopyalama
```

> **Android Studio veya Xcode'u açmadan önce her zaman `pnpm install` ve `pnpm run mobile:sync` çalıştır.**
> Native projeler giriş eklentisini `node_modules` içinden okur. Bu adım atlanırsa derleme "dosya bulunamadı" hatası verir.

---

## 3b. Apple ve Google girişini aç

**Apple ile giriş (iPhone):** Kod hazır.
1. Apple Developer → Identifiers → `com.couplechaos.app` → **Sign in with Apple** kutusunu işaretle.
2. Xcode'da Signing & Capabilities altında "Sign in with Apple" görünmeli (`App.entitlements` hazır).

Başka bir şey gerekmiyor. Sunucu Apple belgelerini varsayılan olarak `com.couplechaos.app` için kabul eder.

**Google ile giriş:** [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials:
1. **OAuth consent screen** oluştur (uygulama adı, destek e-postası, gizlilik politikası adresi).
2. **Web application** tipi bir Client ID oluştur. Bu `VITE_GOOGLE_WEB_CLIENT_ID` olur.
3. **Android** tipi bir Client ID oluştur. Paket adı `com.couplechaos.app`, SHA-1 değerini
   `cd android && ./gradlew signingReport` komutu verir. Debug ve release için ayrı ayrı ekle.
   Play App Signing kullanıyorsan Play Console'daki SHA-1'i de ekle.
4. **iOS** tipi bir Client ID oluştur, Bundle ID `com.couplechaos.app`. Bu `VITE_GOOGLE_IOS_CLIENT_ID` olur.
5. `.env.production` dosyasına iki ID'yi yaz.
6. Sunucuda (Render → Environment) `GOOGLE_CLIENT_IDS=<web id>,<ios id>` ayarını yap.
7. `pnpm run mobile:sync` çalıştır. Bu komut iOS için gereken Google URL şemasını `Info.plist`'e kendisi yazar.

Sunucuda ayar yapıldı mı diye `https://<sunucun>/api/health` adresine bak: `"auth":{"apple":true,"google":true}`.

---

## 4. Android (APK / AAB)

Gerekenler: Android Studio (veya JDK 21 + Android SDK 36).

1. `android/keystore.properties.example` dosyasını `android/keystore.properties` adıyla kopyala ve
   şifreleri yaz. **Bu dosyayı asla GitHub'a koyma.**
2. Derle:
   ```bash
   cd android
   ./gradlew assembleDebug      # test APK:  app/build/outputs/apk/debug/app-debug.apk
   ./gradlew bundleRelease      # Play Store: app/build/outputs/bundle/release/app-release.aab
   ```
3. Her yeni mağaza sürümünde `android/app/build.gradle` içindeki `versionCode` sayısını 1 artır.

> 🔑 Keystore şifresi (`<KEYSTORE_ŞİFRESİ>`) eski rehberlerde düz yazı olarak duruyor ve zayıf.
> Play Store'a **ilk kez** yüklemeden önce yeni, güçlü şifreli bir keystore oluşturmanı öneririm.
> Play App Signing'i açarsan Google da yedeğini tutar.

---

## 5. iOS (iPhone)

Gerekenler: Mac, **Xcode 16 veya üstü**, Apple Developer hesabı (yıllık 99 $).

1. `ios/App/App.xcodeproj` dosyasını Xcode ile aç. Swift paketleri ilk açılışta otomatik iner.
2. Sol tarafta **App** hedefi → **Signing & Capabilities** → **Team** olarak kendi hesabını seç.
   Bundle ID: `com.couplechaos.app`.
3. iPhone'u kabloyla bağla → ▶︎ Run. Telefonda çalışır.
4. Mağaza için: **Product → Archive → Distribute App → App Store Connect**.

Hazır ayarlar: sadece iPhone, sadece dikey, koyu açılış ekranı, açık renk durum çubuğu,
şifreleme beyanı (`ITSAppUsesNonExemptEncryption = false`, App Store yükleme sorusunu atlar).

---

## 5b. iPhone'da test (Mac olmadan)

iPhone'a APK gibi doğrudan kurulan bir dosya yok: Apple her uygulamanın kendi hesabıyla imzalanmasını şart koşuyor.
Mac olmadan iki yol var:

**Yol 1 — Hemen, ücretsiz: Safari'den uygulama gibi (sunucu kurulduktan sonra)**
1. iPhone'da Safari ile `https://couple-chaos-server.onrender.com` adresini aç.
2. Paylaş düğmesi → **Ana Ekrana Ekle**.
3. Ana ekranda Couple Chaos ikonu çıkar ve tam ekran açılır. Klasik ve Ortak Tuval oynanır.
   Partner Android APK'dan da girebilir, aynı sunucuyu kullanırlar.
   Fark: Apple girişi ve titreşim yalnızca gerçek iOS uygulamasında var; burada misafir olarak oynanır.

**Yol 2 — Gerçek iOS uygulaması: TestFlight (Apple Developer hesabı, yıllık 99 $)**
Derlemeyi GitHub'ın bulutta çalışan Mac'i yapar (`.github/workflows/ios-testflight.yml`):
1. Projeyi GitHub'a yükle.
2. App Store Connect → **Apps → +** → yeni uygulama oluştur, Bundle ID `com.couplechaos.app`.
3. App Store Connect → Users and Access → **Integrations → App Store Connect API** → anahtar oluştur
   (rol: **Admin**). Key ID, Issuer ID ve `.p8` dosyasını al.
4. GitHub repo → Settings → Secrets and variables → Actions → şu 4 secret'ı ekle:
   `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (`.p8` dosyasının tüm metni).
5. GitHub → **Actions → iOS TestFlight → Run workflow**. Yaklaşık 15-20 dakika sürer.
6. App Store Connect → TestFlight bölümünde derleme görünür. Kendini ve arkadaşlarını test kullanıcısı olarak ekle.
7. iPhone'a **TestFlight** uygulamasını kur. Davet gelince Couple Chaos'u oradan kur.

Her çalıştırmada build numarası otomatik artar. Mac'in varsa 5. bölümdeki Xcode yolu da aynı sonucu verir.

---

## 6. Mağaza kontrol listesi

- [ ] Sunucu yayında, `/api/health` → `"ai":true`
- [ ] `privacy.html` içindeki iletişim e-postası dolduruldu, adres mağaza formlarına yazıldı
- [ ] Apple: "Sign in with Apple" açık. App Privacy formunda "Name, Email: App Functionality, not linked to tracking"
      ve "User Content (drawings): App Functionality" işaretlendi
- [ ] Google Play: Data safety formu aynı şekilde dolduruldu
- [ ] Google girişi için 3b'deki adımlar yapıldı (yapılmazsa Google butonu görünmez, bu da sorun değil)
- [ ] Gerçek iki telefonla bir Klasik, bir Ortak Tuval turu oynandı

Notlar:
- **Çift vs çift (4 kişilik) mod** hâlâ yok. Klasik ve Ortak Tuval ikişer kişilik.
- **Premium'u açmak istediğinde:** RevenueCat ile gerçek satın alma eklenip `VITE_GOOGLE_PLAY_BILLING_ENABLED=true` yapılmalı.
- Süreler sunucu ayarıyla değişir: `DESCRIBE_SECONDS`, `DRAW_SECONDS` (10 + 10), `CO_DRAW_SECONDS` (20).

---

## 7. Dosya haritası

```
server/index.ts      Oyun sunucusu (protocol 2, uzun sorgulama, süreler, odalar)
server/aiJudge.ts    Yapay zeka hakemi (Claude / OpenAI, zaman aşımı, günlük limit, yedek yorumlar)
server/auth.ts       Apple/Google kimlik belgesi doğrulama
client/src/components/screens/CoDrawScreen.tsx   Ortak Tuval ekranı
client/src/lib/auth.ts                           Uygulamadaki giriş / çıkış / hesap silme
client/public/privacy.html                       Gizlilik politikası (TR + EN)
scripts/configure-ios.mjs                        Google girişi için iOS URL şeması
client/src/          Uygulama (React + Vite)
android/             Android projesi (Capacitor 8)
ios/                 iOS projesi (Capacitor 8, Swift Package Manager)
Dockerfile           Sunucuyu her yerde çalıştırmak için
render.yaml          Render.com tek tık kurulum
.env.example         Tüm ayarların açıklaması
.github/workflows/ios-testflight.yml   Mac olmadan iOS derleyip TestFlight'a yükler
client/src/lib/server.integration.test.ts   Sunucu + uygulama uçtan uca testleri
```

## 8. Güvenlik notu

Orijinal zip'teki `.project-config.json` dosyasında Manus API anahtarları, JWT secret ve AWS erişim
bilgileri düz yazıyla duruyordu. Bu teslimattan çıkarıldı. Zip'i başkasıyla paylaştıysan o anahtarları
Manus panelinden yenile.
