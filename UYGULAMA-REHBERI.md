# Couple Chaos - Uygulama Rehberi

## Klasik Sürüm

Bu paket, gönderilen Couple Chaos uygulamasının tasarımı korunarak hazırlanmış yalnızca **Klasik Mod** sürümüdür. Kör Mod, Birlikte Çizim ve Çift vs Çift uygulamadan kaldırılmıştır.

## Mevcut Özellikler

| # | Güncelleme | Durum |
|---|-----------|-------|
| 1 | Google/Apple Login ekranı | ✅ UI hazır (backend entegrasyonu gerekli) |
| 2 | Profesyonel giriş ekranı | ✅ Tam arka plan çift görseli, gradient overlay |
| 4 | Onboarding → Login → Premium akışı | ✅ Profesyonel akış |
| 5 | Profile'da premium satın alma | ✅ Premium butonu eklendi |
| 6 | Ses efektleri (19 farklı ses) | ✅ Web Audio API ile sentezlenmiş |
| 7 | AI Skor sistemi + ses efekti | ✅ Skor bazlı farklı sesler |
| 8 | Giriş sonrası direkt ana sayfa | ✅ Onboarding sadece ilk seferde |
| 9 | Ana sayfada oynama geçmişi | ✅ Son 50 oyun kaydediliyor |
| 10 | Geri tuşu düzeltmesi | ✅ Tüm ekranlarda çalışıyor |
| 11 | "Oyuna Geri Dön" amatör mesajı kaldırıldı | ✅ Sadece back arrow |
| 12 | Onboard 3. kısım AI görseli | ✅ Profesyonel neon AI görseli |
| 14 | AI Roast sistemi | ✅ Acımasız ama eğlenceli yorumlar |
| 16 | Streak, Challenge, Başarımlar | ✅ 15 başarım, günlük challenge, streak |
| 17 | Duvar kağıdı yapma | ✅ Çizimi telefon boyutunda indirme |

---

## SENİN YAPMAN GEREKENLER

### 1. Google/Apple Login Entegrasyonu (ZORUNLU)

**Google Sign-In:**
1. [Firebase Console](https://console.firebase.google.com/) → Yeni proje oluştur
2. Authentication → Sign-in method → Google'ı etkinleştir
3. Android uygulaması ekle (package: `com.couplechaos.app`)
4. `google-services.json` dosyasını indir → `android/app/` klasörüne koy
5. SHA-1 fingerprint'i Firebase'e ekle:
   ```bash
   keytool -list -v -keystore couple-chaos-keystore.jks -alias couple-chaos -storepass <KEYSTORE_ŞİFRESİ>
   ```

**Apple Sign-In:**
1. [Apple Developer](https://developer.apple.com/) → Certificates, Identifiers & Profiles
2. App ID oluştur → Sign In with Apple etkinleştir
3. Service ID oluştur (web redirect için)

**Capacitor Plugin:**
```bash
cd couple-chaos
pnpm add @capacitor-firebase/authentication
npx cap sync android
```

### 2. RevenueCat ile Gerçek Ödeme (ZORUNLU)

1. [RevenueCat](https://www.revenuecat.com/) hesabı aç (ücretsiz)
2. Google Play Console'da uygulama oluştur
3. Abonelik planları tanımla:
   - **Haftalık:** ₺29.99 / $2.99
   - **Aylık:** ₺79.99 / $7.99
   - **Yıllık:** ₺399.99 / $49.99
4. RevenueCat'e Google Play API key'i bağla
5. Capacitor plugin ekle:
   ```bash
   pnpm add @revenuecat/purchases-capacitor
   npx cap sync android
   ```

### 3. Backend Güçlendirme (ÖNEMLİ)

Mevcut Railway sunucusu free tier'da olabilir. Gerçek kullanıcılar için:

1. **Railway Pro'ya geç** ($5/ay) veya
2. **Render.com** kullan (ücretsiz tier daha güçlü) veya
3. **DigitalOcean** ($6/ay, en stabil)

Backend'e eklemen gerekenler:
- Google/Apple token doğrulama
- Kullanıcı veritabanı (Supabase veya Firebase)
- Push notification sunucusu (Firebase Cloud Messaging)

### 4. Firebase Cloud Messaging (Push Notification)

1. Firebase Console → Cloud Messaging
2. Server key'i al
3. `google-services.json` dosyasını güncelle
4. Capacitor plugin:
   ```bash
   pnpm add @capacitor-firebase/messaging
   npx cap sync android
   ```

### 5. AdMob Reklam Entegrasyonu

1. [AdMob](https://admob.google.com/) hesabı aç
2. Uygulama ekle → Ad Unit ID'leri al
3. Capacitor plugin:
   ```bash
   pnpm add @capacitor-community/admob
   npx cap sync android
   ```
4. Reklam stratejisi:
   - Her 3 oyundan sonra → Interstitial reklam
   - "Reklam izle, 1 ekstra oyun kazan" → Rewarded reklam
   - Ana sayfada küçük → Banner reklam

### 6. App Store Optimizasyonu (ASO)

**Başlık:** "Couple Chaos - Çift Oyunu"
**Kısa açıklama:** "Çiz, tahmin et, gül! Çiftler için en eğlenceli oyun."

**Anahtar kelimeler:**
- couple game, çift oyunu, draw and guess
- relationship game, ilişki oyunu
- party game, fun couple app

**Ekran görüntüleri:** 5-8 adet, şunları göster:
1. Onboarding ekranı
2. Oyun modu seçimi (Ana sayfa)
3. Çizim ekranı
4. AI yorum/skor ekranı
5. Başarımlar

### 7. TikTok/Instagram Pazarlama Stratejisi

**İlk 30 gün planı:**
- Haftada 5 video = 20+ video/ay
- İçerik fikirleri:
  1. "Sevgilimle Couple Chaos oynadık 😂" (oyun sonuçları)
  2. "AI çizimimi eleştirdi 💀" (AI Roast)
  3. "Partnerim ipucunu böyle anladı" (Klasik Mod)
  4. "En kötü çizim yarışması" (komik sonuçlar)

**Hashtag'ler:**
#couplechaos #çiftoyunu #couplegame #drawandguess #coupleschallenge

---

## TEKNİK NOTLAR

### Keystore Bilgileri (KAYBET!)
- Dosya: `couple-chaos-keystore.jks`
- Alias: `couple-chaos`
- Store password: `<KEYSTORE_ŞİFRESİ>`
- Key password: `<KEYSTORE_ŞİFRESİ>`
- Geçerlilik: 10.000 gün

### Uygulama Bilgileri
- Package ID: `com.couplechaos.app`
- Min SDK: 24 (Android 7.0+)
- Target SDK: 36
- Boyut: ~3.5 MB

### Dil Desteği
- Türkçe (tr)
- İngilizce (en)
- Almanca (de)
- İspanyolca (es)
- Otomatik algılama: Cihaz diline göre

### Ses Efektleri (19 adet)
- Tap, Send, Word Reveal, Countdown Tick, Urgent Tick
- Success, Confetti, Partner Joined, Stroke, Copy
- Error, Surprise, Achievement, Streak Fire, Slide
- Premium Unlock, Daily Challenge, AI Score High/Low

---

## YAYINLAMA ADIMLARI

1. ✅ APK/AAB oluşturuldu
2. Google Play Console'da hesap aç ($25 tek seferlik)
3. Uygulama oluştur → Store listing doldur
4. `.aab` dosyasını Production track'e yükle
5. İçerik derecelendirme anketini doldur (PEGI 3 veya 7)
6. Fiyatlandırma: Ücretsiz (IAP ile)
7. İncelemeye gönder (genelde 1-3 gün)

---

## GELİR TAHMİNİ

| Kaynak | Aylık (10K kullanıcı) | Aylık (100K kullanıcı) |
|--------|----------------------|------------------------|
| Premium abonelik (%3 dönüşüm) | $900 | $9,000 |
| Rewarded reklam | $200 | $2,000 |
| Interstitial reklam | $300 | $3,000 |
| Banner reklam | $50 | $500 |
| **TOPLAM** | **$1,450** | **$14,500** |

---

## ÖNCELİK SIRASI

1. 🔴 Google Play Console hesabı aç
2. 🔴 Firebase projesi oluştur (Auth + FCM)
3. 🔴 RevenueCat entegrasyonu (para kazanmak için)
4. 🟡 AdMob entegrasyonu
5. 🟡 Backend'i güçlendir
6. 🟢 TikTok pazarlama başla
7. 🟢 Kullanıcı geri bildirimine göre güncelle
