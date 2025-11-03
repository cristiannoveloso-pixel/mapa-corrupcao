// backend/view-db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco
const dbPath = path.join(__dirname, 'corruption.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('Erro ao abrir banco:', err.message);
  console.log('✅ Conectado ao banco:', dbPath);
});

// Consulta todos os registros da tabela "news"
db.all('SELECT * FROM news', (err, rows) => {
  if (err) return console.error('Erro ao consultar banco:', err.message);

  console.log(`\n📊 ${rows.length} caso(s) encontrado(s):\n`);
  rows.forEach(r => {
    console.log(`🆔 ${r.id} | ${r.title}`);
    console.log(`   Estado: ${r.state}`);
    console.log(`   Região: ${r.region}`);
    console.log(`   Data: ${r.date}`);
    console.log(`   Fonte: ${r.source}`);
    console.log(`   URL: ${r.url}`);
    console.log('-------------------------------------------');
  });

  db.close();
});
