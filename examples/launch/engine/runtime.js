/*
 * Hareketli Banner runtime
 * Her banner zamanın saf bir fonksiyonudur: render(t) aynı t için her zaman aynı kareyi çizer.
 * Bu sayede tarayıcıda önizleme (?play) ile GIF'e kare kare dökme birebir aynı sonucu verir.
 */
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  // t'yi [start, end] aralığında 0..1'e çevirir
  const prog = (t, start, end) => clamp((t - start) / (end - start));

  const ease = {
    linear: (p) => p,
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inCubic: (p) => p * p * p,
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outBack: (p) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    },
  };

  // Giriş/çıkış zarfı: 0 → 1 (giriş) ... 1 → 0 (çıkış)
  function envelope(t, inStart, inDur, outStart, outDur, eIn = ease.outExpo, eOut = ease.inCubic) {
    const a = eIn(prog(t, inStart, inStart + inDur));
    const b = 1 - eOut(prog(t, outStart, outStart + outDur));
    return Math.min(a, b);
  }

  // Metni kelime span'lerine böler (boşlukları korur)
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    return words.map((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
  }

  function splitChars(el) {
    const chars = [...el.textContent];
    el.textContent = '';
    return chars.map((c) => {
      const s = document.createElement('span');
      s.className = 'c';
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
  }

  // Kelime kelime yükselip netleşen giriş (referanstaki kinetik tipografi)
  function riseIn(spans, t, start, { stagger = 0.07, dur = 0.55, dy = 18, blur = 6 } = {}) {
    spans.forEach((s, i) => {
      const p = ease.outExpo(prog(t, start + i * stagger, start + i * stagger + dur));
      s.style.opacity = p;
      s.style.transform = `translateY(${(1 - p) * dy}px)`;
      s.style.filter = p < 0.999 ? `blur(${(1 - p) * blur}px)` : 'none';
    });
  }

  function riseOut(spans, t, start, { stagger = 0.035, dur = 0.35, dy = -14, blur = 5 } = {}) {
    spans.forEach((s, i) => {
      const p = ease.inCubic(prog(t, start + i * stagger, start + i * stagger + dur));
      if (p <= 0) return;
      s.style.opacity = 1 - p;
      s.style.transform = `translateY(${p * dy}px)`;
      s.style.filter = `blur(${p * blur}px)`;
    });
  }

  // ── Motion yardımcıları ───────────────────────────────────────────────

  // Kesintisiz döngü için tam tur salınım: n tur / periyot. t=0 ve t=periyot aynı değeri verir.
  const dongu = (t, periyot, n = 1, faz = 0) => Math.sin(2 * Math.PI * (n * t / periyot + faz));

  // Sayaç: [start, end] aralığında from → to, istenen ease ile. Yuvarlama çağırana kalır.
  const sayac = (t, start, end, from, to, e = ease.outCubic) => lerp(from, to, e(prog(t, start, end)));

  // Güvenli daktilo: harf başına opacity yerine metnin kendisi kısaltılır (TASARIM_SISTEMI §2.8).
  function yaz(el, text, t, start, cps = 0.06) {
    const chars = [...text];
    const n = Math.max(0, Math.min(chars.length, Math.floor((t - start) / cps)));
    const v = chars.slice(0, n).join('');
    if (el.textContent !== v) el.textContent = v;
    return { n, bitti: n >= chars.length, bitis: start + chars.length * cps };
  }

  // GSAP köprüsü: duraklatılmış bir zaman çizelgesini render(t)'ye çevirir.
  // Kullanım: const tl = gsap.timeline({ paused: true }); ...; boot(HB.gsapBagla(tl, ekstra), tl.duration())
  function gsapBagla(tl, ekstra) {
    if (window.gsap) { gsap.ticker.lagSmoothing(0); gsap.ticker.sleep && gsap.ticker.sleep(); }
    tl.pause(0);
    return (t) => { tl.seek(t, false); if (ekstra) ekstra(t); };
  }

  // ── Önizleme ve render sözleşmesi ─────────────────────────────────────
  // boot(render, sure, secenekler)
  //   secenekler.fps      : video kare hızı (varsayılan: GIF 25, MP4 30; render.mjs karar verir)
  //   secenekler.dongu    : true ise render.mjs t=0 ile t=sure karelerini karşılaştırır (dikiş testi)
  //   secenekler.sesler   : [{ t: 2.4, ses: 'pop' | 'ses/ozel.wav', kazanc: -6 }]  (render.mjs karıştırır)
  //   secenekler.muzik    : { dosya: 'muzik.mp3', baslangic: 0, kazanc: -8, sonus: 1.5 }
  //   secenekler.hazir    : Promise; 3D sahne, görsel, video yüklenene kadar kare alınmaz
  // Önizleme: ?play gerçek zamanlı döngü, ?t=3.2 tek kare.
  function boot(render, duration, secenekler = {}) {
    window.DURATION = duration;
    window.render = render;
    window.FPS = secenekler.fps || null;
    window.DONGU = !!secenekler.dongu;
    window.SESLER = secenekler.sesler || [];
    window.MUZIK = secenekler.muzik || null;
    const q = new URLSearchParams(location.search);
    const imgs = [...document.images].map((im) => (im.decode ? im.decode().catch(() => {}) : null));
    const ready = Promise.all([document.fonts ? document.fonts.ready : null, ...imgs, secenekler.hazir]);
    ready.then(() => {
      if (q.has('t')) return render(parseFloat(q.get('t')));
      if (!q.has('play')) return render(0);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return render(duration * 0.84);
      const t0 = performance.now();
      const loop = async (now) => {
        await render(((now - t0) / 1000) % duration);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    window.bannerReady = ready.then(() => true);
  }

  window.HB = { clamp, lerp, prog, ease, envelope, splitWords, splitChars, riseIn, riseOut, boot, dongu, sayac, yaz, gsapBagla };
})();
