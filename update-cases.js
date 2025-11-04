// update-cases.js
import axios from "axios";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as dotenv from "dotenv";

dotenv.config();

const CHAVE = process.env.CHAVE_API_PORTAL;

if (!CHAVE) {
  console.error("❌ CHAVE_API_PORTAL não encontrada no .env");
  process.exit(1);
}

async function connectDb() {
  return open({ filename: "corruption.db", driver: sqlite3.Database });
}

async function fetchFromPortal(pagina = 1) {
  const url = `https://api.portaldatransparencia.gov.br/api-de-dados/sancoes?pagina=${pagina}`;
  console.log(`🔎 Buscando dados do Portal da Transparência (página ${pagina})...`);

  try {
    const { data } = await axios.get(url, {
      headers: { "chave-api-dados": CHAVE }
    });
    return data;
  } catch (err) {
    console.error("❌ Erro ao buscar dados:", err.response?.statusText || err.message);
    return [];
  }
}

async function atualizarBanco() {
  const db = await connectDb();
  await db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    summary TEXT,
    state TEXT,
    organization TEXT,
    status TEXT,
    date TEXT,
    source TEXT,
    url TEXT UNIQUE
  )`);

  let totalInseridos = 0;
  let pagina = 1;

  while (true) {
    const registros = await fetchFromPortal(pagina);
    if (!registros.length) break;
    console.log(`📄 Página ${pagina}: ${registros.length} registros.`);

    for (const r of registros) {
      const titulo = r.nome || r.razaoSocial || "Registro Público";
      const resumo = r.motivo || r.descricao || "Sanção registrada no Portal da Transparência";
      const estado = r.uf || "Brasil";
      const orgao = r.orgaoSancionador?.nome || "Órgão não informado";
      const data = r.dataPublicacao || r.dataInicioSancao || new Date().toISOString();
      const url = r.link || `https://portaldatransparencia.gov.br/pessoa-juridica/${r.cpfCnpj}`;

      await db.run(
        `INSERT OR IGNORE INTO news
        (title, summary, state, organization, status, date, source, url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [titulo, resumo, estado, orgao, "Sancionado", data, "Portal da Transparência", url]
      );

      totalInseridos++;
    }

    pagina++;
    await new Promise(r => setTimeout(r, 1000)); // evita bloqueio
  }

  console.log(`✅ ${totalInseridos} novos casos oficiais inseridos no banco.`);
  await db.close();
}

atualizarBanco().then(() => console.log("🏁 Coleta CGU concluída."));

