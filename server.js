// backend/server.js
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import sqlite3pkg from "sqlite3";
import dotenv from "dotenv";
import morgan from "morgan";
import chalk from "chalk"; // para logs coloridos

// ==================== CONFIGURAÇÕES INICIAIS ====================
dotenv.config();

const sqlite3 = sqlite3pkg.verbose();
const app = express();
const PORT = process.env.PORT || 5000;

// Substitui __dirname e __filename em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares globais
app.use(cors());
app.use(express.json());
app.use(morgan("dev")); // log básico de requisições (GET/POST/etc)

// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, "public")));

// ==================== BANCO DE DADOS ====================
const dbPath = path.join(__dirname, "corruption.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(chalk.red("❌ Erro ao conectar ao banco:"), err.message);
  } else {
    console.log(chalk.green("✅ Conectado ao banco corruption.db"));
  }
});

// ==================== MIDDLEWARE DE LOG PERSONALIZADO ====================
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusColor =
      res.statusCode >= 500
        ? chalk.red
        : res.statusCode >= 400
        ? chalk.yellow
        : chalk.green;

    console.log(
      `${chalk.cyan(req.method)} ${req.url} → ${statusColor(res.statusCode)} (${duration}ms)`
    );
  });
  next();
});

// ==================== ROTAS ====================

// Teste rápido
app.get("/", (req, res) => {
  res.send("🚀 Servidor funcionando com segurança!");
});

// 🔹 Retorna todos os casos
app.get("/api/cases", (req, res, next) => {
  const sql = `
    SELECT id, title, summary, state, region, municipality, organization, 
           value_estimated, status, date, source, url 
    FROM news
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

// 🔹 Retorna casos por estado
app.get("/api/cases/by-state", (req, res, next) => {
  const state = req.query.state;
  if (!state)
    return res.status(400).json({ error: "Parâmetro state é obrigatório" });

  const sql = `
    SELECT id, title, summary, state, region, municipality, organization, 
           value_estimated, status, date, source, url 
    FROM news 
    WHERE state = ?
  `;
  db.all(sql, [state], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

// 🔹 Adicionar novo caso
app.post("/api/add-case", (req, res, next) => {
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
    url,
  } = req.body;

  if (!title || !state)
    return res
      .status(400)
      .json({ error: "Campos obrigatórios: title e state" });

  if (!url || url.trim() === "")
    return res
      .status(400)
      .json({ error: 'O campo "url" é obrigatório e deve conter o link.' });

  const sql = `
    INSERT INTO news
    (title, summary, state, region, municipality, organization, 
     value_estimated, status, date, source, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
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
      url,
    ],
    function (err) {
      if (err) return next(err);
      res.json({ success: true, id: this.lastID });
    }
  );
});

// 🔹 Lista todos os políticos (ou por cargo)
app.get("/api/politicos", (req, res, next) => {
  const cargo = req.query.cargo;
  const sql = cargo
    ? "SELECT * FROM politicos WHERE LOWER(cargo) = LOWER(?) ORDER BY nome"
    : "SELECT * FROM politicos ORDER BY nome";

  db.all(sql, cargo ? [cargo] : [], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

// 🔹 Lista notícias vinculadas a um político
app.get("/api/politicos/:id/news", (req, res, next) => {
  const politicoId = req.params.id;
  const sql = `
    SELECT 
      n.id, n.title, n.summary, n.state, n.region, n.municipality, 
      n.organization, n.value_estimated, n.status, n.date, n.source, n.url
    FROM news n
    JOIN politico_news pn ON pn.news_id = n.id
    WHERE pn.politico_id = ?
    ORDER BY n.date DESC
  `;
  db.all(sql, [politicoId], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

// 🔹 Envia index.html para qualquer outra rota
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==================== TRATAMENTO GLOBAL DE ERROS ====================
app.use((err, req, res, next) => {
  console.error(chalk.red("❌ Erro no servidor:"), err.message);
  res.status(500).json({
    error: "Erro interno no servidor",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ==================== INICIALIZA SERVIDOR ====================
app.listen(PORT, () => {
  console.log(chalk.blueBright(`🚀 Servidor rodando em http://localhost:${PORT}`));
});
