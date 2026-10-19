# Kupon sinematik törenleri — başlangıç şablonu

Bu klasör, `metoapps/motion-engine` fork'unun **Kupon** projesine özel deneysel kullanım alanıdır. Genel motion-engine kodu değiştirilmez; araç başka projeler için kullanılabilir.

- Kupon tarafında hazırlanan kontrol komutu: [metoapps/Kupon, motion-engine pilotu](https://github.com/metoapps/Kupon/pull/14)
- Orijinal araç: [oguzhankayan/motion-engine](https://github.com/oguzhankayan/motion-engine)
- Kullanılacak medya: haftanın **gerçek şampiyonuna ait özgün kupa posteri** ve **gerçek sonuncusuna ait özgün konteynır posteri**.

## İlk deneme (ücretsiz, yerel)

Bu fork'u bilgisayara klonla, ardından Node.js 22+, FFmpeg, Chrome/Chromium kurulumlarını tamamla:

```bash
npm ci
node bin/motion-engine.mjs doctor
node bin/motion-engine.mjs demo --format portrait --out output/kupon-smoke
```

Bu komutlar **Kupon törenini değil**, motion-engine'in genel 12 saniyelik dikey örnek videosunu oluşturur. Başarılı olursa `output/kupon-smoke/film.mp4` ve QA raporu çıkar.

Kupon posterini içeren ilk medya denemesi için Kupon deposundaki `tools/ceremony-motion/make-pilot.mjs` dosyasını çalıştır. Bu da henüz gerçek şampiyon/sonuncu kurgusu değil, hazır posterin videoya taşındığı bir teknoloji testidir.

## İleri aşama

1. Onaylı özgün şampiyon ve sonuncu posterlerini sağla; **isim/yüz/forma/etiket** eşleşmesini kontrol et.
2. Posterleri 9:16 dikey filmde kamera hareketi, anons ve kısa finalle birleştiren ayrı bir `scene.js` uygula.
3. Gerçek MP4, ses, mobil görüntü ve zamanlama testlerinden sonra Kupon'un haftalık verisine otomatik bağla.

**Koruma:** Deneysel değişiklikler canlı Kupon'da değildir. Fork kaynak kodunun telif/lisans bildirimlerini koru. Yapay zekâ servislerinin ücretli `generate` komutunu kullanma.
