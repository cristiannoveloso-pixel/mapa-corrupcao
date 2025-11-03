// backend/import-extended.js
// -----------------------------------------------
// Importa casos de corrupção detalhados (.json)
// com novos campos: município, órgão, valor, status
// -----------------------------------------------

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "corruption.db");
const db = new sqlite3.Database(dbPath);

// Caminho do arquivo JSON que você quer importar
const filePath = path.join(__dirname, "casos-estado.json");

function insertCase(c) {
  db.run(
    `INSERT INTO news 
    (title, summary, state, region, municipality, organization, value_estimated, status, date, source, url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.title,
      c.summary || "",
      c.state,
      c.region,
      c.municipality || "",
      c.organization || "",
      c.value_estimated || "",
      c.status || "",
      c.date,
      c.source || "",
      c.url || ""
    ],
    err => {
      if (err) console.error("❌ Erro ao inserir:", err.message);
      else console.log(`✅ Inserido: ${c.title} (${c.state})`);
    }
  );
}

console.log("🚀 Importando casos detalhados...");

try {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  data.forEach(insertCase);
} catch (e) {
  console.error("❌ Erro ao ler arquivo JSON:", e.message);
}

setTimeout(() => {
  console.log("🎉 Importação concluída!");
  db.close();
}, 1500);
