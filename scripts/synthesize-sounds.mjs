#!/usr/bin/env node
// Kullanım: node motor/ses.mjs [çıktı-klasörü]   (varsayılan: motor/ses/kutuphane)
// Sıcak, lisanssız UI ses efektleri üretir (örnek dosya yok, hepsi sentez). saas-motion-kit/tools/warm_sfx.py'den uyarlandı (MIT).
// Hepsi Do majörde ve kısa oda yankılı: müzik altında birbiriyle uyumlu durur. Saf sinüs bip yok (ince ve tekinsiz duyulur).
// 48 kHz, mono, 16 bit WAV. Rastgelelik tohumlu: her çalıştırmada birebir aynı dosyalar.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const SR = 48000;
const NOTE = { C4: 261.63, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5 };
const TAU = 2 * Math.PI;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gauss(r) { const u = Math.max(r(), 1e-9), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

const buf = (sec) => new Float64Array(Math.round(SR * sec));
function env(i, attack, decay) { const t = i / SR; return Math.min(1, t / attack) * Math.exp(-t / decay); }

function marimba(f, dur = 0.45, bright = 0.35) {
  const x = buf(dur);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const tone = Math.sin(TAU * f * t) + bright * Math.sin(TAU * f * 4 * t) * Math.exp(-t / 0.03) + 0.2 * Math.sin(TAU * f * 10 * t) * Math.exp(-t / 0.008);
    x[i] = tone * env(i, 0.002, dur / 3.5);
  }
  return x;
}
function woodblock(f = 900, dur = 0.12) {
  const x = buf(dur);
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2.7 * t)) * env(i, 0.001, 0.025); }
  return x;
}
// Klavye tuşu: kısa gürültü tıkı + hafif gövde; tohumla çeşitlenir
function tus(seed) {
  const r = rng(seed), x = buf(0.06), f = 1800 + r() * 900;
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (0.6 * gauss(r) * Math.exp(-t / 0.004) + 0.5 * Math.sin(TAU * f * t) * Math.exp(-t / 0.012)); }
  return lowpass(x, 0.35);
}
// Damga / yumuşak gümbürtü: düşük perdeli, kısa, gövdeli
function damga() {
  const x = buf(0.35), r = rng(7);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, f = 140 * Math.exp(-t / 0.08) + 70;
    x[i] = Math.sin(TAU * f * t) * env(i, 0.002, 0.07) + 0.25 * gauss(r) * Math.exp(-t / 0.006);
  }
  return lowpass(x, 0.2);
}
// Hışırtı: bant sınırlı gürültü kabarması (arka planda sürekli fısıltı değil, tek bir geçiş)
function hisirti(dur = 0.5, seed = 11) {
  const r = rng(seed), n = Math.round(SR * dur), raw = new Float64Array(n);
  for (let i = 0; i < n; i++) raw[i] = gauss(r);
  const x = movingAvg(raw, 40);
  for (let i = 0; i < n; i++) x[i] *= Math.sin(Math.PI * i / n) ** 2;
  return x;
}
function movingAvg(x, w) { const y = new Float64Array(x.length); let acc = 0; for (let i = 0; i < x.length; i++) { acc += x[i]; if (i >= w) acc -= x[i - w]; y[i] = acc / w; } return y; }
function lowpass(x, a) { const y = new Float64Array(x.length); let p = 0; for (let i = 0; i < x.length; i++) { p += a * (x[i] - p); y[i] = p; } return y; }

function seq(...parts) {
  const end = Math.max(...parts.map(([o, s]) => Math.round(o * SR) + s.length));
  const out = new Float64Array(end);
  for (const [o, s] of parts) { const k = Math.round(o * SR); for (let i = 0; i < s.length; i++) out[k + i] += s[i]; }
  return out;
}
// Kısa oda yankısı: tohumlu, üstel sönen gürültü darbe yanıtıyla evrişim
function room(x, mix = 0.14, size = 0.09) {
  const r = rng(3), irN = Math.round(SR * size * 4), ir = new Float64Array(irN);
  for (let i = 0; i < irN; i++) ir[i] = gauss(r) * Math.exp(-i / (SR * size));
  const wet = new Float64Array(x.length + irN - 1);
  for (let i = 0; i < x.length; i++) { const v = x[i]; if (!v) continue; for (let j = 0; j < irN; j += 1) wet[i + j] += v * ir[j]; }
  const pk = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const k = mix / pk(wet) * pk(x), y = new Float64Array(wet.length);
  for (let i = 0; i < y.length; i++) y[i] = (x[i] || 0) + k * wet[i];
  return y;
}
function wav(path, x, gainDb = -3) {
  const pk = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1, g = 10 ** (gainDb / 20) / pk;
  const fade = Math.round(SR * 0.01), n = x.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { let v = x[i] * g; if (i > n - fade) v *= (n - i) / fade; b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2); }
  writeFileSync(path, b);
}

const SESLER = {
  pop:     () => marimba(NOTE.G5, 0.3, 0.5),
  tik:     () => woodblock(1100),
  onay:    () => seq([0, marimba(NOTE.E5, 0.4)], [0.09, marimba(NOTE.G5, 0.5)]),
  acilis:  () => seq([0, marimba(NOTE.C5, 0.6)], [0.07, marimba(NOTE.E5, 0.6)], [0.14, marimba(NOTE.G5, 0.7)], [0.21, marimba(NOTE.C6, 0.9)]),
  hata:    () => seq([0, marimba(NOTE.A4, 0.45, 0.2)], [0.12, marimba(NOTE.E4, 0.55, 0.2)]),
  hisirti: () => hisirti(0.5, 11),
  kaydir:  () => hisirti(0.28, 23),
  damga:   () => damga(),
  nota:    () => marimba(NOTE.C5, 0.5, 0.3),
  tus1: () => tus(101), tus2: () => tus(202), tus3: () => tus(303), tus4: () => tus(404),
};
const ACIKLAMA = {
  pop: 'kart / rozet belirmesi', tik: 'küçük adım, sayaç tıkı', onay: 'başarılı işlem, tik', acilis: 'ana açılış (drop), logo',
  hata: 'yumuşak uyarı (alarm değil)', hisirti: 'sahne geçişi', kaydir: 'kısa kayma / swipe', damga: 'damga, mühür, oturma',
  nota: 'tek vurgu', tus1: 'klavye tuşu (4 varyant; daktiloda sırayla kullan)',
};

const root = resolve(dirname(new URL(import.meta.url).pathname));
const out = resolve(process.argv[2] || join(root, '..', 'output', 'synthesized-sounds'));
mkdirSync(out, { recursive: true });
for (const [ad, f] of Object.entries(SESLER)) {
  const dry = f();
  wav(join(out, `${ad}.wav`), ad.startsWith('tus') ? room(dry, 0.06, 0.04) : room(dry), ad.startsWith('tus') ? -9 : -3);
}
writeFileSync(join(out, 'SESLER.md'), '# Ses kütüphanesi (sentez, lisanssız)\n\n| Ad | Kullanım |\n|---|---|\n' +
  Object.keys(SESLER).filter((k) => !/^tus[234]$/.test(k)).map((k) => `| \`${k}\` | ${ACIKLAMA[k] || ''} |`).join('\n') +
  '\n\nKompozisyonda: `boot(render, sure, { sesler: [{ t: 2.4, ses: "pop", kazanc: -6 }] })`\n');
console.log(`${Object.keys(SESLER).length} ses → ${out}`);
