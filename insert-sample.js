const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'corruption.db');
const db = new sqlite3.Database(dbPath);

const samples = [
  {
    title: "Fraude em licitação no Piauí",
    summary: "Auditoria aponta superfaturamento em contratos de obras públicas.",
    state: "Piauí",
    region: "Nordeste",
    date: "2024-09-15",
    source: "Portal da Transparência",
    url: "https://exemplo.com/piaui"
  },
  {
    title: "Desvio de verbas em São Paulo",
    summary: "Prefeitura é investigada por uso irregular de recursos da educação.",
    state: "São Paulo",
    region: "Sudeste",
    date: "2025-01-10",
    source: "Folha de São Paulo",
    url: "https://exemplo.com/sp"
  },
  {
    title: "Esquema de propina em Brasília",
    summary: "Operação da Polícia Federal prende servidores públicos.",
    state: "Distrito Federal",
    region: "Centro-Oeste",
    date: "2025-06-02",
    source: "G1 Notícias",
    url: "https://g1.globo.com"
  }
];

samples.forEach(c => {
  db.run(
    `INSERT INTO news (title, summary, state, region, date, source, url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [c.title, c.summary, c.state, c.region, c.date, c.source, c.url],
    err => {
      if (err) console.error("❌ Erro ao inserir:", err.message);
      else console.log(`✅ Caso adicionado: ${c.title}`);
    }
  );
});

db.close();
