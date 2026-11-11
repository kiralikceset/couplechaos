# Couple Chaos Classic v9 — Kaliteyi koruyan açılış optimizasyonu

2026-10-07. v8 üzerine uygulanmıştır. Yeni oyun veya yeni tasarım değildir.

## Değişiklikler

- Başlangıç ekranı ile oyun motorunun yüklenmesi ayrıldı. İlk açılışın JavaScript giriş dosyası 470,217 bayttan 284,694 bayta düştü (%39.5 azalma). Toplam oyun kodu silinmedi; gerektiğinde yüklenir.
- Kayıtlı kullanıcıda oyun motoru ve ilk ekran paralel hazırlanır. İlk React çiziminde gereksiz Suspense bekleme ekranı oluşmaz.
- Giriş, profil ve ana ekranın hazırlığı ortak önbelleği kullanır. Hazırlanmış ekran doğrudan çizilir. Düzenleme sırasında bileşen türü değiştirilmez; form/çizim durumu korunur.
- Bağlantı ekranında oyun, oyun sırasında sonuç, sonuçta paylaşım ekranı önden hazırlanır.
- Özgün yerel fontların indirilmesi daha erken başlatılır. Font dosyaları, resim dosyaları, CSS, animasyon süreleri ve ekran bileşenlerinin görünümü değişmedi.
- Hızlı Atla/profil dokunuşlarında ilk ekran ve oyun motoru birlikte hazır olana kadar mevcut ekran görünür kalır. Yükleme sırasında geri gidilirse bekleyen geçiş iptal edilir.

## Karşılaştırma

Chromium 138, 393×840 CSS piksel, DPR 2, 4 kat CPU yavaşlatma. Her sürüm için 8 ayrı soğuk tarayıcı bağlamı; sürümler dönüşümlü ölçüldü. Aşağıdaki değerler medyandır. Yerel HTTP sunucusu kullanıldı; Android/iPhone ölçümü veya sunucu pingi değildir. Sonraki ekranların tasarlanmış animasyon süreleri kısaltılmadı.

| Ölçüm | v8 | v9 |
| --- | ---: | ---: |
| Yeni kullanıcı: İlk ekran öğesinin DOM içinde hazır olması | 136.4 ms | 167.3 ms |
| Yeni kullanıcı: Ekran + özgün fontlar + resim çözme hazır | 269.3 ms | 207.8 ms |
| Yeni kullanıcı: İlk içerik boyaması (FCP) | 188.0 ms | 212.0 ms |
| Kayıtlı kullanıcı: İlk ekran öğesinin DOM içinde hazır olması | 510.6 ms | 220.7 ms |
| Kayıtlı kullanıcı: Ekran + özgün fontlar + resim çözme hazır | 595.0 ms | 358.4 ms |
| Kayıtlı kullanıcı: İlk içerik boyaması (FCP) | 570.0 ms | 278.0 ms |

Kayıtlı kullanıcıda font ve resim hazır süresi yaklaşık %40 düştü. Yeni kullanıcıda aynı ölçüm yaklaşık %23 düştü. İlk içerik boyaması yeni kullanıcı senaryosunda daha erken çıkmadı; erken font hazırlığı nedeniyle bu örneklemde v8'den daha geç çıktı. Bu yüzden bütün ölçümlerin hızlandığı iddia edilmiyor. Yeni kullanıcı ilk dokunma medyanı 25.8 → 21.8 ms; bu küçük fark fiziksel cihazda doğrulanmalıdır.

Ham ölçümler: verification/startup-v8-v9.json ve verification/returning-v8-v9.json. qualityReadyMs, gerekli fontlar ve resimler hazır olduktan sonraki animation-frame zamanıdır; fiziksel ekrana sunum zamanı veya animasyon bitişi değildir.

## Doğrulama

- TypeScript kontrolü geçti. 6 test dosyasında 28 test geçti.
- Açılış ve 3 tanıtım ekranı: animasyonlar aynı noktada sabitlenerek alınan v8/v9 PNG ekran görüntüleri birebir aynı.
- client/public/images içindeki 3 dosya, client/public/fonts içindeki 19 dosya ve client/src/index.css byte düzeyinde aynı.
- Geri tuşu, profil açma/geri dönme, isim yazarken durumun korunması, giriş atlama, kayıtlı kullanıcının ana ekrana dönmesi ve oyun ekranının önceden hazırlanması tarayıcıda geçti.
- Oyun/giriş modüllerine yapay 500 ms yükleme gecikmesi eklendiğinde hızlı Atla geçişinde boş ekran karesi görülmedi.
- Tam tanıtım → giriş → isim → ana ekran akışında JavaScript hatası yok. Tanıtımda dış ağ isteği yok.
- APK v1/v2/v3 imzaları, ZIP bütünlüğü, hizalama ve paket içindeki web dosyalarının test edilen derlemeyle eşitliği doğrulandı. Ayrıntı: verification/apk-v9.json.

## Sınırlar

Fiziksel Android veya iPhone'da çalıştırılmadı; APK kurulum testi yapılmadı. Bu teslim Android test APK'sı ve ortak web kaynak kodudur; iOS IPA değildir. iPhone için ayrı Xcode derlemesi ve cihaz testi gerekir. Yerel oyun kuralları, 10 saniye ipucu + 10 saniye çizim, Classic modu ve canlı sunucu protokolü değişmedi. Sunucu yeniden yayınlanmadı; bu sürüm için iki telefonlu canlı maç testi yapılmadı. Google/Apple kimlik doğrulama kurulumu değişmedi.

APK, v8'in yerel Android kabuğunu ve aynı imza kimliğini kullanır. Dosya adı v9'dur; yerel versionCode=1 / versionName=1.0 değerleri mevcut kabuktaki gibi kalır. Mağazaya yayınlanacak sürümde Android/iOS sürüm numaraları yerel derleme sırasında artırılmalıdır.

## Tekrarlama

pnpm 10.4.1 ile bağımlılıkları kurun. `pnpm check`, `pnpm test`, ardından `VITE_GAME_SERVER_URL=https://couple-chaos-realtime.byusuf2233123.chatgpt.site pnpm exec vite build` çalıştırın. Ölçüm betikleri tools/ altında; PLAYWRIGHT_MODULE ve CHROMIUM_PATH ortam değişkenleri test tarayıcısını seçer. Karşılaştırma betiklerine v8 ve v9 dist/public dizinlerini verin. `pnpm exec cap copy android` test edilen web derlemesini Android projesine kopyalar.
