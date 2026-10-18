# motion-engine

**Düzenlenebilir kaynak dosyalarıyla ürün ve lansman videoları hazırla. Görsel, video ve ses gerektiğinde Raywake'i kullan; filmi kendi bilgisayarında oluştur.**

[![Raywake lansman demosu](docs/assets/launch.gif)](docs/assets/launch.mp4)

[İngilizce rehber](README.md) · [MP4'ü izle](docs/assets/launch.mp4) · [Raywake bağlantısı](docs/RAYWAKE.md)

Raywake ekibi tarafından geliştirildi. Kod MIT lisanslıdır. **Hazır demo API anahtarı istemez ve bakiye harcamaz.** Demodaki görseller kodla çizilir, efekt sesleri sentezlenir. Kendi yapay zekâ varlıklarını üretmek istersen Raywake hesabını bağlayabilirsin.

## İlk videonu oluştur

Node.js 22+, FFmpeg ve Chrome/Chromium gerekir. macOS'ta FFmpeg kurulumu: `brew install ffmpeg`.

```bash
git clone https://github.com/oguzhankayan/motion-engine.git
cd motion-engine
npm ci
# Bilgisayarında Chrome/Chromium yoksa:
npm run browser:install
node bin/motion-engine.mjs doctor
npm run demo
```

`output/launch/` içinde 12 saniyelik MP4, poster, kare dökümü, doğrulama raporu ve düzenlenebilir kaynak dosyaları oluşur.

```bash
node bin/motion-engine.mjs preview output/launch
```

Yazdırılan yerel adresi tarayıcıda aç. `scene.js` dosyasında metinleri ve zamanlamayı düzenledikten sonra:

```bash
node bin/motion-engine.mjs render output/launch/index.html --scale 2 --gif
```

Tarayıcı önizlemesi sessizdir; MP4 ses karışımını içerir. Yeniden render almak yapay zekâ çağrısı yapmaz.

## Dikey, kare ve farklı başlangıçlar

```bash
node bin/motion-engine.mjs demo --format portrait --out output/dikey
node bin/motion-engine.mjs demo --format square --out output/kare
node bin/motion-engine.mjs demo --preset product --out output/urun
node bin/motion-engine.mjs demo --preset story --out output/hikaye
```

Dikey çıktı 720×1280, yatay 1280×720, kare 1080×1080'dir. Düzen seçilen orana göre değişir. Üç başlangıç aynı hareket sistemini kullanır; metinlerini ve sahnelerini kaynak dosyadan düzenlersin.

## Raywake ile varlık üret

[API anahtarı oluştur](https://raywake.si/api-keys?utm_source=github&utm_medium=motion-engine&utm_campaign=oss&utm_content=readme-tr). `models:read`, `generate`, `jobs:read` izinlerini seç. Bakiye sorgusu için `wallet:read` de gerekir.

```bash
cp .env.example .env
# RAYWAKE_API_KEY değerini .env dosyasına ekle.
node bin/motion-engine.mjs quote examples/requests/image.json --out output/gorsel.quote.json
```

**Teklif almak ücretsizdir.** Gösterilen dolar tutarını ve son geçerlilik zamanını kontrol et. Aşağıdaki komut ücretli üretim başlatır; `--max-usd` kabul ettiğin üst sınırdır:

```bash
node bin/motion-engine.mjs generate examples/requests/image.json \
  --quote output/gorsel.quote.json --out output/gorsel --max-usd 1.00 --yes
```

Bağlantı kesilirse aynı işi sürdür:

```bash
node bin/motion-engine.mjs resume output/gorsel.state.json
```

İndirilen dosyayı filme eklemek için proje kökünde `media.json` oluştur:

```json
{ "image": "output/gorsel.png" }
```

```bash
node bin/motion-engine.mjs demo --assets media.json --out output/benim-lansmanim
```

Aynı dosyaya `video` ve `audio` yolları da eklenebilir. Model alanları birbirinden farklıdır; video veya ses üretmeden önce `models` ve `model` komutlarıyla güncel şemayı incele. [Ayrıntılı rehber](docs/RAYWAKE.md).

## Etsy Engine ile kullan

Etsy Engine'in hazırladığı ürün görselinin yolunu `media.json` dosyasına yazıp `--preset product` seç. Böylece mevcut görselden kısa bir ürün tanıtımı hazırlayabilirsin. Bu bağlantı yerel dosyalar üzerinden çalışır; Etsy mağazana bağlanmaz.

## Kapsam

İlk sürüm kodla düzenlenen bir üretim aracıdır. Görsel zaman çizelgesi veya tek cümleden otomatik reklam yazarı içermez. Orijinal motion-kit çalışma klasörü, müşteri işleri ve 100 temalık arşiv bu pakete dahil değildir.

Kod MIT lisanslıdır. Kaynaklar ve lisanslar: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
