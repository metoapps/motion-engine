# Kupon V3 — Motion Engine tekrar kullanılabilir tören şablonu

**Bu bir geliştirme taslağıdır.** Canlı Kupon değişmedi. Onaylanan V3 akışı esas alındı: 2,4 sn giriş; 4,6 sn şampiyon; 4,6 sn sonuncu; 3,4 sn yazılı final. Posterler ayrı ayrı tam ekrandır, asla yan yana sıkıştırılmaz. 720×1280, 24 fps, 15 saniye.

Görseller ve yüzler **yeniden üretilmez**; onaylanmış PNG'ler doğrudan içeri alınır. Ses dosyası isteğe bağlıdır: verilmezse sessiz video üretilir, uğultu üretilmez. Yüz/isim tutarlılığı otomatik değerlendirilemez: kaynak posterler önceden kontrol edilmelidir.

```bash
# Fork'un kök dizininde:
node integrations/kupon/v3-template/prepare.mjs --winner /path/to/meto.png --loser /path/to/lort.png --winner-name METO --loser-name LORT --out /absolute/path/to/meto-lort-output --audio /path/to/clean-effects.wav

# Motion Engine renderer (Node 22+, Chrome/Chromium, FFmpeg):
node bin/motion-engine.mjs render /absolute/path/to/meto-lort-output/index.html --out /absolute/path/to/meto-lort-output/film.mp4
```

`--audio` isteğe bağlıdır. `prepare` var olan çıktı klasörünün üzerine yazmaz. Video doğrulama raporu ve görüntü karelerini kontrol etmeden canlı Kupon'a birleştirme.

**Doğrulama sınırı:** JavaScript kaynak kontrolü ve yerel hazırlama testi yapıldı. Tarayıcı erişimi bu çalışma ortamında engellendiği için Motion Engine'in gerçek MP4 render testi **henüz geçmedi**. Bu taslak, onaylanan V3 videosunun yerine henüz geçmez.

Referans: [Kupon pilot taslağı](https://github.com/metoapps/Kupon/pull/14).
