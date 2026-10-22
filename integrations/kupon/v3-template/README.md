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


## V7 ses güvenlik kapısı (zorunlu)

Onaylı METO–LORT V7 üretiminde `prepare.mjs` artık **--audio** olmadan çalışmaz. Ses dosyasının SHA-256 değeri `V7-LOCK.json` ile eşleşmelidir. Böylece yanlış veya kayıp V7 kaynak müziği hazırlama aşamasında reddedilir.

Gerçek render için doğrudan `motion-engine render` yerine korumalı komutu kullan:

```bash
node integrations/kupon/v3-template/render-and-check.mjs \
  --engine /path/to/motion-engine \
  --scene /path/to/prepared-scene \
  --audio /path/to/METO-LORT-MUZIK-V7.wav
```

Bu komut önce `film-unverified.mp4` üretir, ardından çıkışın ses akışını, 15 saniyelik süreyi, 720×1280/24 FPS biçimini ve METO (2,6–6,4) ile LORT (7,3–11) bölümlerinin sessiz olmadığını kontrol eder. **Yalnızca tüm kontroller geçince** dosyayı `film-verified.mp4` olarak adlandırır. Kontrol başarısızsa doğrulanmış çıktı sunulmaz.

Sınırlama: Seviye kontrolü çıkışın doğru melodiyi taşıdığını tek başına kanıtlamaz; bu yüzden onaylı ses hash'i de zorunlu tutulur. Bu geliştirme dalındaki yeni `render-and-check` komutunun temiz bir Motion Engine kurulumunda uçtan uca testi henüz yapılmadı; gerçek V7 MP4'üyle ses denetleyicisinin PASS, sessiz MP4'le FAIL verdiği yerel testler yapıldı.
