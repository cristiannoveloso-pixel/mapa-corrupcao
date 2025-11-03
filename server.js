// backend/server.js
import express from 'express';
import sqlite3pkg from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const sqlite3 = sqlite3pkg.verbose();
const app = express();
const PORT = 5000;

// Substitui __dirname e __filename em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));


// Caminho para o banco SQLite
const dbPath = path.join(__dirname, 'corruption.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Erro ao conectar ao banco:', err.message);
  else console.log('✅ Conectado ao banco corruption.db');
});

// ==================== ROTAS ==================== //

// Retorna todos os casos
app.get('/api/cases', (req, res) => {
  const sql = `SELECT id, title, summary, state, region, municipality, organization, value_estimated, status, date, source, url FROM news`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Retorna casos filtrados por estado (ex: /api/cases/by-state?state=Piauí)
app.get('/api/cases/by-state', (req, res) => {
  const state = req.query.state;
  if (!state) return res.status(400).json({ error: 'Parâmetro state é obrigatório' });

  const sql = `SELECT id, title, summary, state, region, municipality, organization, value_estimated, status, date, source, url FROM news WHERE state = ?`;
  db.all(sql, [state], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// =============================================== //
// Adicionar novo caso de corrupção
app.post('/api/add-case', (req, res) => {
  const {
    title,
    summary,
    state,
    region,
    municipality,
    organization,
    value_estimated,
    status,
    date,
    source,
    url
  } = req.body;

  if (!title || !state) {
    return res.status(400).json({ error: 'Campos obrigatórios: title e state' });
  }

  if (!url || url.trim() === '') {
    return res.status(400).json({ error: 'O campo "url" é obrigatório e deve conter o link da notícia.' });
  }

  const sql = `
    INSERT INTO news
    (title, summary, state, region, municipality, organization, value_estimated, status, date, source, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [title, summary, state, region, municipality, organization, value_estimated, status, date, source, url],
    function (err) {
      if (err) {
        console.error('Erro ao inserir:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// 🔹 GET /api/politicos
app.get('/api/politicos', (req, res) => {
  const cargo = req.query.cargo;
  const sql = cargo
    ? "SELECT * FROM politicos WHERE LOWER(cargo) = LOWER(?) ORDER BY nome"
    : "SELECT * FROM politicos ORDER BY nome";

  db.all(sql, cargo ? [cargo] : [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar políticos:", err);
      return res.status(500).json({ error: "Erro ao buscar políticos" });
    }
    res.json(rows);
  });
});

// 🔹 GET /api/politicos/:id/news
app.get('/api/politicos/:id/news', (req, res) => {
  const politicoId = req.params.id;

  const sql = `
    SELECT 
      n.id,
      n.title,
      n.summary,
      n.state,
      n.region,
      n.municipality,
      n.organization,
      n.value_estimated,
      n.status,
      n.date,
      n.source,
      n.url
    FROM news n
    JOIN politico_news pn ON pn.news_id = n.id
    WHERE pn.politico_id = ?
    ORDER BY n.date DESC;
  `;

  db.all(sql, [politicoId], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar notícias do político:", err);
      return res.status(500).json({ error: "Erro ao buscar notícias" });
    }
    res.json(rows);
  });
});
// Rota para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================== //
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
