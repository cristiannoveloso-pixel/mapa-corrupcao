// backend/import-cases.js
// -----------------------------------------------
// Importa casos históricos do arquivo CSV ou JSON
// para o banco corruption.db (tabela: news)
// -----------------------------------------------

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const Papa = require("papaparse"); // precisa instalar: npm install papaparse

const dbPath = path.join(__dirname, "corruption.db");
const db = new sqlite3.Database(dbPath);

// === Altere aqui o nome do arquivo que quer importar ===
const filePath = path.join(__dirname, "casos_tocantins.json");
// const filePath = path.join(__dirname, "cases_historicos.json");

function insertCase(c) {
  db.run(
    `INSERT INTO news (title, summary, state, region, date, source, url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      c.title,
      c.summary || "",
      c.state,
      c.region,
      c.date,
      c.source || "",
      c.url || ""
    ],
    err => {
      if (err) console.error("❌ Erro ao inserir:", err.message);
      else console.log(`✅ Inserido: ${c.title}`);
    }
  );
}

function importCSV(data) {
  const parsed = Papa.parse(data, { header: true, skipEmptyLines: true });
  parsed.data.forEach(insertCase);
}

function importJSON(data) {
  const list = JSON.parse(data);
  list.forEach(insertCase);
}

console.log("🚀 Importando casos históricos...");

const ext = path.extname(filePath);
const content = fs.readFileSync(filePath, "utf8");

if (ext === ".csv") importCSV(content);
else if (ext === ".json") importJSON(content);
else console.error("Formato não suportado. Use .csv ou .json");

setTimeout(() => {
  console.log("🎉 Importação concluída!");
  db.close();
}, 1500);
