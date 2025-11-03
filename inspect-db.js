const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'corruption.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('Erro ao abrir o banco:', err.message);
  console.log('✅ Conectado ao banco:', dbPath);
});

// Lista todas as tabelas
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) return console.error('Erro ao listar tabelas:', err.message);
  console.log('🗂️ Tabelas existentes:');
  rows.forEach(r => console.log('-', r.name));

  // Opcional: ver o schema da primeira tabela
  if (rows.length > 0) {
    const table = rows[0].name;
    db.all(`PRAGMA table_info(${table})`, (err, info) => {
      if (err) return console.error('Erro ao consultar schema:', err.message);
      console.log(`\n📋 Estrutura da tabela '${table}':`);
      info.forEach(c => console.log(`• ${c.name} (${c.type})`));
      db.close();
    });
  } else {
    db.close();
  }
});
