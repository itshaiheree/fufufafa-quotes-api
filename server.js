import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Pakai quotes.fixed.json kalau ada, kalau nggak ya quotes.json. Bisa di-override: QUOTES_FILE=...
const file =
  process.env.QUOTES_FILE ||
  ['quotes.json'].map((f) => path.join(__dirname, f)).find((f) => fs.existsSync(f));

if (!file) {
  console.error('quotes.json / quotes.fixed.json nggak ketemu di folder ini.');
  process.exit(1);
}

const quotes = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(quotes.map((q) => [q.id, q]));
console.log(`Loaded ${quotes.length} quotes dari ${path.basename(file)}`);

const app = express();

// CORS sederhana biar bisa dipanggil dari frontend mana pun
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

const toInt = (v, def, min, max) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : Math.min(Math.max(n, min), max);
};

// GET /random            -> 1 quote acak (object)
// GET /random?count=5    -> 5 quote acak tanpa duplikat (array, maks 50)
app.get('/random', (req, res) => {
  if (req.query.count === undefined) {
    return res.json(quotes[Math.floor(Math.random() * quotes.length)]);
  }
  const count = toInt(req.query.count, 1, 1, 50);
  const pool = [...quotes];
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  res.json(out);
});

// GET /quotes?page=1&limit=20&q=kata   -> daftar + paginasi + pencarian teks
app.get('/quotes', (req, res) => {
  const limit = toInt(req.query.limit, 20, 1, 100);
  const page = toInt(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const list = q ? quotes.filter((x) => x.quote.toLowerCase().includes(q)) : quotes;
  const total = list.length;
  res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data: list.slice((page - 1) * limit, page * limit),
  });
});

// GET /quotes/:id
app.get('/quotes/:id', (req, res) => {
  const item = byId.get(Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Quote tidak ditemukan' });
  res.json(item);
});

app.get('/', (_req, res) => {
  res.json({
    total: quotes.length,
    endpoints: ['/random', '/random?count=[number]', '/quotes?page=[number]&limit=[number, maks. 5]&q=[kata, opsional]', '/quotes/:id'],
  });
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`API jalan di http://localhost:${PORT}`));
