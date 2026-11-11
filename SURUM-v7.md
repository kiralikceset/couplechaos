# Couple Chaos Classic v7 — 18 Eylül 2026

Orijinal uygulama ve klasik mod korunarak hazırlandı.

## Oyun akışı

- 10 saniye ipucu verme ve okuma. Çizen oyuncu gizli kelimeyi göremez.
- Ardından ipuçları kapanır ve 10 saniyelik çizim başlar.
- Süre dolunca çizim otomatik gönderilir. Gönderim sırasında tuval kilitlenir.
- Sunucu aşama sürelerini ve otomatik geçişleri yönetir. Çizim gönderimi ulaşmazsa sınırlı beklemeden sonra tur kapanır.
- Tur numarası, son 3 saniyede belirgin uyarı, rövanşta rol değişimi.
- Oyun ekranı yüklenirken gelen ilk ipucu artık üst denetleyicide saklanır.

## Performans ve bağlantı

- Başlangıç JavaScript dosyası v6'da 520.724 baytken v7'de 481.474 bayt: yaklaşık %7,5 daha az başlangıç kodu. Bu, telefonda ölçülen hız artışı değildir.
- Kullanılmayan hareket özellikleri paketten çıkarıldı; geçiş gecikmeleri kısaltıldı.
- Sonuçtaki rastgele konfeti parametreleri her puan güncellemesinde yeniden üretilmiyor. Konfeti ve arka plan parçacıkları CSS transform/opacity animasyonları kullanıyor.
- Puan ve yorum için yapay beklemeler azaltıldı.
- Ana ekranda oturum önceden hazırlanıyor, arka planda sorgulama duruyor.
- Ağ istekleri zaman aşımı ve iptal desteğine sahip; geç gelen eski yanıtlar bağlantıyı yeniden açamaz.
- İşlem yanıtları olayları da taşır; aynı olay tekrar teslim edilmez.
- Sunucu her sorguda temizlik ve oturum yazması yapmaz. Oturumsuz odada boş sorgu normalde iki okuma kullanır; etkin odalarda süre denetimi de yapılır. Oda dışındaki sorgular 2,5 saniye aralıkla yapılır.

## Sunucu

Canlı adres: https://couple-chaos-realtime.byusuf2233123.chatgpt.site
Sağlık kontrolü: /api/health — release: classic-v7
Sunucu sürümü: 2
Sunucu kaynak revizyonu: 9b162a85f5ff351a5bdeaed80ee95d150a962191

Sunucu kaynak kodu ayrı, kalıcı Sites projesinde tutulur. Bu arşiv Android/istemci projesidir. Buradaki eski server/ dizini canlı Sites servisini temsil etmez.

Bir odada iki oyuncu bulunur. Üçüncü kişi başka bir oda açabilir veya sırayla test edebilir. APK'da sunucu adresi hazırdır; kullanıcının sunucu kurması gerekmez.

## Doğrulama ve sınırlar

- TypeScript denetimi ve 25 birim testi geçti.
- Sunucu entegrasyonu: kimlik doğrulama, ipucu gizliliği, 10+10 süreleri, erken/geç işlemler, kayıp gönderim, rövanş, dolu oda, eşzamanlı odalar geçti.
- Canlı sunucuda üç bağımsız oturumla oda, ipucu, otomatik aşama geçişi, çizim süresinin dolması, ortak sonuç, rövanş, rol değişimi ve çıkış geçti (21 HTTP isteği).
- Canlı test otomatik API testi olup üç gerçek telefonda yapılan test değildir. Bu çalışma ortamındaki HTTP istekleri medyan 7.506 ms, en yüksek 12.529 ms sürdü; bu değer telefon ağına veya uygulama FPS'ine eşitlenemez. Tek sağlık isteğinde sunucu içi işleme süresi 49 ms olarak görüldü; bu bir genel performans garantisi değildir.
- Tarayıcı bileşeni indirilemediği için etkileşimli tarayıcı testi tamamlanamadı. Gerçek Android cihazında açılış süresi ve akıcılık ölçülmedi.
- APK ZIP bütünlüğü, paket dosyaları, hizalama ve v1/v2/v3 imzaları doğrulandı. v6 ile aynı imza sertifikası kullanıldı.
- Puanlama mevcut cihaz içi çizim ölçümlerini kullanır; bir görüntü anlama AI servisine bağlanıldığı iddia edilmez.

## Test etme

Her iki telefona v7 APK'yı yükleyin. Bir oyuncu klasik modda oda açsın, diğeri altı karakterli kodla katılsın. İlk 10 saniyede ipucu gönderin; sonraki 10 saniyede çizim yapın. Sonuçtan sonra yeniden oynayarak rollerin değiştiğini kontrol edin.

## Derleme

VITE_GAME_SERVER_URL=https://couple-chaos-realtime.byusuf2233123.chatgpt.site pnpm exec vite build
pnpm exec cap copy android

APK mevcut Android kabuğu ve güncel web dosyalarıyla tools/repack_apk.py üzerinden hazırlanıp imzalandı. Tekrar paketlerken assets klasöründe sadece index.html ve onun bağlı olduğu güncel JS/CSS dosyalarını bulundurun.
