// inspect-cache.mjs — intip isi halaman yang sudah di-cache.
// Pakai: node inspect-cache.mjs <id> <kata-kunci>
// Contoh: node inspect-cache.mjs 4 orderan
import fs from 'node:fs';

const [id, word] = process.argv.slice(2);
if (!id || !word) { console.log('Pakai: node inspect-cache.mjs <id> <kata-kunci>'); process.exit(1); }

const files = fs.readdirSync('.cache').filter((f) => f.startsWith(`${id}-`) && f.endsWith('.html'));
if (!files.length) { console.log(`Nggak ada file cache untuk id ${id}`); process.exit(1); }

for (const f of files) {
  const h = fs.readFileSync(`.cache/${f}`, 'utf8');
  console.log(`\n===== ${f} =====`);
  console.log('ukuran      :', h.length, 'karakter');
  console.log('title       :', (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim().slice(0, 120));
  console.log('jumlah <script>:', (h.match(/<script/gi) || []).length, '| jumlah <br>:', (h.match(/<br/gi) || []).length);
  const re = new RegExp(word, 'gi');
  const hits = [...h.matchAll(re)];
  console.log(`kata "${word}" muncul di HTML mentah:`, hits.length, 'kali');
  hits.slice(0, 3).forEach((m, n) => {
    const before = h.slice(0, m.index);
    const inScript = before.lastIndexOf('<script') > before.lastIndexOf('</script>');
    console.log(`  --- kemunculan ${n + 1} (di dalam <script>: ${inScript}) ---`);
    console.log('  ' + h.slice(Math.max(0, m.index - 250), m.index + 250).replace(/\s+/g, ' '));
  });
  if (!hits.length) console.log('awal HTML:', h.replace(/\s+/g, ' ').slice(0, 500));
}
