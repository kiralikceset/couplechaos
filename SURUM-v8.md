# Couple Chaos Classic v8 — 6 Ekim 2026

Bu sürüm kullanıcının gönderdiği orijinal uygulamanın v7 kaynağı üzerinde yapılan tanıtım ekranı performans düzeltmesidir. Yeni uygulama değildir. Klasik mod ve 10 saniye ipucu + 10 saniye çizim akışı korunmuştur.

## Bulgu ve değişiklikler

- İncelenen açılış ve üç tanıtım ekranı oyun sunucusundan yanıt beklemiyor. Görseller ve fontlar paket içinde. Dolayısıyla bu ekranların geçiş gecikmesini oyun ping'i olarak açıklamak doğru değildir.
- Önceki AnimatePresence `mode="wait"` geçişi, 180 ms çıkış animasyonunun bitmesini bekliyor, ardından 180 ms giriş animasyonu oynatıyordu. Yeni içerik artık tıklamada doğrudan monte ediliyor; yalnızca 120 ms hafif giriş efekti var. Tanıtım sayfasının ayrı JS dosyasını ilk tıklamada yükleme beklemesi de kaldırıldı.
- Büyük `blur(100px)` arka plan yerine aynı neon renklerde statik radial gradient kullanılıyor. Yerleşim, metinler, ana fotoğraf ve puanlama görseli korunuyor. Görsel dosyaları v7 ile bayt düzeyinde aynı.
- Tekrar tekrar çizilen SVG çizgileri tamamlanmış çizim olarak gösteriliyor. Küçük süs animasyonları CSS transform/opacity kullanıyor ve sınırlı sayıda tekrarlanıyor. Azaltılmış hareket tercihi destekleniyor.
- Açılıştaki başlık ve düğme girişte görünmez başlamıyor. Dönen alt yazı ayrı bileşende; güncellendiğinde fotoğraf/düğmeler yeniden render edilmiyor. Alt yazı zamanlayıcısı arka planda duruyor.
- Tanıtımdaki Geri: 3 → 2 → 1 → açılış. Atla doğrudan girişe gider.
- İlk açılışta gerekmeyen giriş, ana menü ve profil kodu ayrı parçalara ayrıldı; uygun sonraki sayfa önceden yükleniyor.
- Başlangıç JS: v7 481.474 bayt; v8 470.217 bayt. Bu yaklaşık %2,3 paket azalmasıdır, telefonda ölçülmüş hız oranı değildir.
- Tanıtım/giriş ekranlarına görünürlük veya internet geri gelmesi nedeniyle gereksiz oyun bağlantısı başlatılmıyor. Ana menü ve oyun ekranlarında bağlantı etkinleşiyor.
- Ses açma dinleyicisi pasif pointerdown kullanıyor; temizlenebilir, ses kapalıysa AudioContext oluşturmaz. Biten osilatör, gürültü, filtre ve gain düğümleri ayrılıyor; kısa gürültü tamponları yeniden kullanılıyor.

## Doğrulama

- TypeScript `tsc --noEmit`: geçti.
- Vitest: 6 dosya, 28 test geçti. Yeni 3 test ses tamponunun tekrar kullanımı, biten ses kaynaklarının ayrılması, kapalı ses ve olay dinleyicisi yaşam döngüsünü doğruluyor.
- Mobil boyutta Chromium testi: 393×840 CSS px, DPR 2, dokunmatik, CPU 4× yavaşlatılmış. Her iki sürüm aynı yerel HTTP koşulunda ve dış istekler engellenerek çalıştırıldı. Telefon veya iPhone testi değildir.
- Tek karşılaştırmalı örnek, adım 1 → 2:
  - İlk yeni içerik: v7 217,8 ms → v8 8,2 ms.
  - Tam görünür içerik: v7 395,5 ms → v8 122,1 ms.
  - Adım 2'de 5 saniyelik beklemede TaskDuration: 1,064426 sn → 0,014538 sn; LayoutCount: 277 → 0. Bunlar yalnızca bu testteki ilgili ekranın tarayıcı sayaçlarıdır; uygulama genelinde veya gerçek cihazda garanti değildir.
- Açılış → üç adım → geri geri açılış → atla → giriş → isim formu → geri → isim kaydı → ana menü akışı geçti.
- Tanıtım ekranlarında dış ağ isteği: 0. Görsel yükleme hatası ve JS çalışma zamanı hatası: 0. 393×840 testinde sayfa taşması yok.
- Öncesi/sonrası ekran görüntüleri `verification/` içinde. Test ortamının emoji fontları telefonunkinden farklı/eksik; Android'in kendi emojileri değiştirilmedi.
- APK ZIP bütünlüğü, dosya hizalaması, v1/v2/v3 imzaları ve içindeki web dosyalarının test edilen derlemeyle bayt eşitliği doğrulandı. v7 ile aynı sertifika ve Android kabuğu kullanıldı. Android'in dahili versionName/versionCode değerleri kabuktaki eski değerlerdir; v8 bu teslimatın adıdır.

## Ağ ve iOS sınırları

Canlı sunucu mevcut v7 hizmetidir:
https://couple-chaos-realtime.byusuf2233123.chatgpt.site

Sağlık kontrolü başarılı (`classic-v7`, protocol 2). Bu ortamda tek HTTP kontrolü 4,55 saniye, yanıtın bildirdiği sunucu işleme süresi 105 ms idi. Bu ölçüm telefonun ping'ini veya oyun gecikmesini temsil etmez. Sunucu bu çalışmada yeniden yayımlanmadı; ağ gecikmesinin çözüldüğü iddia edilmiyor. Eski `server/` dizini canlı Sites sunucusunun güncel kaynağı değildir (v7 notlarına bakın).

Gerçek Android/iPhone cihazında FPS, dokunma gecikmesi ve APK kurulum testi yapılmadı. Yeni iki telefonlu canlı oyun testi yapılmadı; oyun protokolü değişmedi ve mevcut taşıma testleri geçti. iOS derlemesi/IPA/TestFlight paketi oluşturulmadı. İstemcideki bu düzeltmeler daha sonra iOS'a taşınabilecek ortak kodda bulunur.

## Kullanıcı testi

v8 APK mevcut Android sürümünün üzerine güncelleme olarak kurulabilir; v7 ile aynı imza sertifikası kullanıldı. Önceden tamamlanmış tanıtım güncellemede yeniden açılmaz; kayıtlı profil silinmez. Tanıtımın ilk açılış akışı bu çalışmada temiz tarayıcı oturumunda doğrulandı.

Tanıtımda ileri/geri ve Atla düğmelerini deneyin; ardından iki cihazda oda kurma ve tam bir turu kontrol edin. Ekran geçişini uçak modunda da deneyebilirsiniz; çevrimiçi oyun ise internet gerektirir.

## Geliştirici komutları

Projedeki pnpm 10 kilit dosyası kullanılmalı:

```sh
npx --yes pnpm@10.4.1 install --frozen-lockfile
pnpm check
pnpm test
VITE_GAME_SERVER_URL=https://couple-chaos-realtime.byusuf2233123.chatgpt.site pnpm exec vite build
pnpm exec cap copy android
```

Tarayıcı ölçüm aracı `tools/ui-perf-check.cjs` içindedir. Playwright kurulu bir ortamda `PLAYWRIGHT_MODULE` ve gerekiyorsa `CHROMIUM_PATH` vererek çalıştırın; ilk argüman derlenmiş web dizininin tam yolu, ikinci argüman `v8` olmalıdır. Araç yalnızca yerel test sunucusu açar ve dış istekleri engeller. Sonuç JSON'unu stdout'a, ekran görüntülerini `/tmp/` altına yazar.
