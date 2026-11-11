# Couple Chaos Classic v6 — 17 Eylül 2026

Orijinal uygulama üzerinde onboarding görseli ve performans düzeltmesi.

- Ana onboarding fotoğrafı ve giriş arka planının orijinalleri APK içine eklendi. Bu görsellerin yüklenmesi artık uzak sunucuya bağlı değil.
- Üçüncü tanıtım slaytının eski görsel adresi 403 yanıtı verdiği için, aynı çerçeve içinde yerel neon puanlama robotu SVG kullanıldı. Diğer yerleşimler korundu.
- Orijinal yazı tipleri lisanslarıyla birlikte yerel WOFF dosyalarına taşındı.
- İkincil ekranlar gerektiğinde yükleniyor. İlk JavaScript paketi 631.922 bayttan 520.724 bayta indi (%17,6). Bu değer telefonda ölçülen hız artışı değildir.
- Çizim sırasında gereksiz React güncellemeleri ve geometri hesapları azaltıldı, çizim çözünürlüğü en fazla 2x piksel yoğunluğuna sınırlandı. Tek dokunuşla nokta çizimi eklendi.
- Sayaç güncelleme sıklığı azaltıldı. Çalışan bağlantının yeniden kurulması önlendi. Tanıtım slaytı geçişleri kısaltıldı.
- Klasik oyun modu korundu.

## Doğrulama

TypeScript denetimi, 21 birim testi ve üretim derlemesi geçti. APK içindeki görsel, font, ekran dosyaları, ZIP bütünlüğü, hizalama ve v1/v2/v3 imzalar doğrulandı. Önceki v5 ile aynı imza sertifikası kullanıldı. Ana CSS dosyası v5 ile birebir aynı.

Tarayıcı test bileşeninin indirilmesi ağ hatasıyla başarısız oldu. Bu sürüm gerçek Android cihazda veya tarayıcıda etkileşimli olarak denenmedi; cihaz üzerindeki açılış süresi ölçülmedi.

## Web derlemesi

VITE_GAME_SERVER_URL=https://couple-chaos-realtime.byusuf2233123.chatgpt.site pnpm exec vite build
pnpm exec cap copy android

APK, mevcut orijinal Android kabuğundaki web dosyaları tools/repack_apk.py ile yenilenerek üretildi. Android yerel kodu değişmedi. İmzalama ve hizalama araçları tools/ altında bulunur. Yeniden paketlerken yalnızca güncel dist/public dosyalarının Android assets/public klasörüne kopyalandığından emin olun.
