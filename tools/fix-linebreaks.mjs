#!/usr/bin/env node
// fix-linebreaks.mjs (v2)
// Ambil jeda enter asli tiap quote dari halaman kaskus/archive.org, lalu tulis ke quotes.fixed.json.
//
// Pakai (Node 18+, tanpa dependency):
//   node fix-linebreaks.mjs                       -> proses semua quote di ./quotes.json
//   node fix-linebreaks.mjs --only 4,44 --debug   -> cek id tertentu + tampilkan diagnosa
//   node fix-linebreaks.mjs --archive-only        -> lewati kaskus langsung, pakai archive.org saja
//   node fix-linebreaks.mjs --delay 3000          -> jarak antar request (ms), default 1500
//   node fix-linebreaks.mjs --concurrency 2       -> request paralel, default 2
//   node fix-linebreaks.mjs --min-len 100         -> cuma quote >= 100 karakter
//
// Aman: isi kata quote TIDAK pernah diubah. Script cuma ganti spasi antar kata
// jadi "\n" (atau "\n\n") kalau di halaman asli memang ada enter di situ.
// Yang berhasil di-fetch disimpan di .cache/, jadi jalankan ulang = lanjut,
// cuma yang gagal yang di-fetch lagi.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const inputPath = args.find((a) => a.endsWith('.json')) ?? 'quotes.json';
const outPath = opt('out', 'quotes.fixed.json');
const reportPath = opt('report', 'report.txt');
const minLen = Number(opt('min-len', 0));
const only = opt('only', '') ? new Set(opt('only', '').split(',').map(Number)) : null;
const concurrency = Number(opt('concurrency', 2));
const delayMs = Number(opt('delay', 1500));
const retries = Number(opt('retries', 4));
const archiveOnly = args.includes('--archive-only');
const debug = args.includes('--debug');
const cacheDir = '.cache';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- HTML -> teks (jeda baris dipertahankan) ----------
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…' };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(cp); } catch { return m; }
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}
export function htmlToText(html) {
  let t = html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|blockquote|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  t = decodeEntities(t).replace(/\r/g, '').replace(/ /g, ' ');
  return t.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n');
}

// ---------- cari quote di teks halaman, ambil pemisah antar kata ----------
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function applyBreaks(quote, pageText) {
  const words = quote.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const re = new RegExp(words.map(esc).join('\\s+'), 'i');
  const m = re.exec(pageText);
  if (!m) return null;
  const seps = m[0].match(/\s+/g) ?? [];
  let out = words[0];
  for (let i = 1; i < words.length; i++) {
    const n = (seps[i - 1].match(/\n/g) ?? []).length;
    out += (n >= 2 ? '\n\n' : n === 1 ? '\n' : ' ') + words[i];
  }
  return out;
}

// ---------- fetch (throttle global + retry sabar) + cache ----------
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + delayMs;
  if (wait) await sleep(wait);
}
// return { text, status } ; text = null kalau gagal
async function fetchText(url) {
  let status = 'err';
  for (let attempt = 1; attempt <= retries; attempt++) {
    await throttle();
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
      });
      status = String(r.status);
      if (r.ok) return { text: await r.text(), status };
      if ([401, 403, 404, 410].includes(r.status)) return { text: null, status };
      const ra = Number(r.headers.get('retry-after'));
      await sleep(ra > 0 ? ra * 1000 : 8000 * attempt); // 429 / 5xx: tunggu lebih lama
    } catch (e) {
      status = 'err:' + (e.cause?.code || e.name);
      await sleep(3000 * attempt);
    }
  }
  return { text: null, status };
}
async function getHtml(id, i, url) {
  const f = path.join(cacheDir, `${id}-${i}.html`);
  if (fs.existsSync(f)) return { html: fs.readFileSync(f, 'utf8'), status: 'cache' };
  const { text, status } = await fetchText(url);
  if (text) fs.writeFileSync(f, text);
  return { html: text, status };
}
function candidateUrls(link) {
  if (link.includes('web.archive.org')) return [link];
  const pid = link.match(/show_post\/([0-9a-f]+)/i)?.[1];
  return [
    ...(archiveOnly ? [] : [link]),
    `https://web.archive.org/web/2/${link}`,
    ...(pid ? [`https://web.archive.org/web/2/https://www.kaskus.co.id/show_post/${pid}`] : []),
  ];
}

// Kaskus sekarang merender post lewat JSON di <script>: "content":{"text":"...","html":"..."}.
// Prioritas: post yang ID-nya cocok dengan link -> post lain yang hasilnya seragam -> teks halaman biasa.
const nl = (s) => (s.match(/\n/g) ?? []).length;
function matchInPage(item, html, pageText) {
  const pid = item.link.match(/show_post\/([0-9a-f]+)/i)?.[1];
  const exact = [];
  const others = [];
  const re = /"content":\{"text":("(?:[^"\\]|\\.)*"),"html":("(?:[^"\\]|\\.)*")/g;
  for (const m of html.matchAll(re)) {
    let cands;
    try { cands = [JSON.parse(m[1]).replace(/\r/g, ''), htmlToText(JSON.parse(m[2]))]; } catch { continue; }
    const rs = cands.map((c) => applyBreaks(item.quote, c)).filter(Boolean);
    if (!rs.length) continue;
    const best = rs.reduce((a, b) => (nl(b) > nl(a) ? b : a));
    const near = pid && html.slice(Math.max(0, m.index - 3000), m.index).includes(pid);
    (near ? exact : others).push(best);
  }
  if (exact.length) return exact[0];
  if (others.length) return new Set(others).size === 1 ? others[0] : null; // ambigu -> jangan ditebak
  return applyBreaks(item.quote, pageText);
}

function debugContext(quote, text) {
  const w = quote.split(/\s+/).filter(Boolean).slice(0, 2).join('\\s+');
  const m = w ? new RegExp(w, 'i').exec(text) : null;
  if (m) return `...${text.slice(Math.max(0, m.index - 60), m.index + 220).replace(/\n/g, '⏎')}...`;
  return `(2 kata pertama nggak ada di halaman) awal teks: ${text.trim().slice(0, 200).replace(/\n/g, '⏎')}`;
}

// ---------- main ----------
async function main() {
  fs.mkdirSync(cacheDir, { recursive: true });
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const todo = data.filter((x) => !x.quote.includes('\n') && x.quote.length >= minLen && (!only || only.has(x.id)));
  console.log(`Total ${data.length} quote, diproses ${todo.length}. delay=${delayMs}ms concurrency=${concurrency}${archiveOnly ? ' archive-only' : ''}`);

  const report = { changed: [], single: [], fetchFailed: [], textMissing: [] };
  const triesMap = new Map();
  let done = 0;
  const queue = [...todo];

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      let result = null;
      let loadedAny = false;
      const tries = [];
      const urls = candidateUrls(item.link);
      for (let i = 0; i < urls.length && !result; i++) {
        const { html, status } = await getHtml(item.id, i, urls[i]);
        if (html) {
          loadedAny = true;
          const text = htmlToText(html);
          result = matchInPage(item, html, text);
          tries.push(`${new URL(urls[i]).host}:${status}${result ? ':cocok' : ':teks-tidak-ada'}`);
          if (debug && !result) console.log(`  [#${item.id}] ${tries.at(-1)}  ${debugContext(item.quote, text)}`);
        } else {
          tries.push(`${new URL(urls[i]).host}:${status}`);
        }
      }
      triesMap.set(item.id, tries.join(' | '));
      if (result) {
        if (result !== item.quote) { item.quote = result; report.changed.push(item); }
        else report.single.push(item);
      } else (loadedAny ? report.textMissing : report.fetchFailed).push(item);
      if (debug) console.log(`#${item.id} -> ${result ? 'ketemu' : loadedAny ? 'TEKS TIDAK KETEMU' : 'FETCH GAGAL'}  [${triesMap.get(item.id)}]`);
      if (++done % 25 === 0) console.log(`  ${done}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  const fmt = (x) => `  #${x.id}  ${x.link}  [${triesMap.get(x.id) ?? ''}]`;
  const lines = [
    `Diubah (ada jeda enter): ${report.changed.length}`,
    ...report.changed.map((x) => `  #${x.id}`),
    `Dicek, memang 1 baris: ${report.single.length}`,
    `FETCH GAGAL (halaman nggak kebuka, jalankan ulang script): ${report.fetchFailed.length}`,
    ...report.fetchFailed.map(fmt),
    `TEKS TIDAK KETEMU (halaman kebuka tapi quote nggak ada di dalamnya, cek manual): ${report.textMissing.length}`,
    ...report.textMissing.map(fmt),
  ];
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log('\n' + lines.filter((l) => !l.startsWith('  ')).join('\n'));
  console.log(`\nHasil: ${outPath}\nLaporan: ${reportPath}`);
}

if (process.env.FIX_LB_TEST !== '1') main();
