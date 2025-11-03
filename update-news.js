// update-news.js
import axios from "axios";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as dotenv from "dotenv";

dotenv.config();

// ✅ Lista de chaves
const apiKeys = [
  process.env.NEWS_API_KEY1,
  process.env.NEWS_API_KEY2
].filter(Boolean); // remove undefined

if (apiKeys.length === 0) {
  console.error("❌ Nenhuma NEWS_API_KEY encontrada no .env");
  process.exit(1);
}

async function connectDb() {
  return open({ filename: "corruption.db", driver: sqlite3.Database });
}

// 🔄 Tenta várias chaves até funcionar
async function fetchNews() {
  const query = "Corrupção+Brasil";
  const baseUrl = "https://newsapi.org/v2/everything";
  const params = `?q=${query}&language=pt&sortBy=publishedAt&pageSize=50`;

  for (const key of apiKeys) {
    const url = `${baseUrl}${params}&apiKey=${key}`;
    console.log(`🔑 Usando chave: ${key.slice(0, 6)}...`);

    try {
      const { data } = await axios.get(url);
      if (data?.articles?.length) {
        console.log(`✅ ${data.articles.length} artigos obtidos com sucesso`);
        return data.articles;
      } else {
        console.warn(`⚠️ Nenhum artigo retornado com a chave ${key.slice(0, 6)}...`);
      }
    } catch (err) {
      console.error(`❌ Erro com a chave ${key.slice(0, 6)}...`, err.response?.statusText || err.message);
    }
  }

  console.error("🚫 Todas as chaves falharam!");
  return [];
}

async function atualizarBanco() {
  const db = await connectDb();
  await db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    summary TEXT,
    state TEXT,
    region TEXT,
    municipality TEXT,
    organization TEXT,
    value_estimated TEXT,
    status TEXT,
    date TEXT,
    source TEXT,
    url TEXT UNIQUE
  )`);

  const artigos = await fetchNews();
  if (artigos.length === 0) {
    console.log("⚠️ Nenhum novo artigo encontrado.");
    await db.close();
    return;
  }

  for (const art of artigos) {
    const titulo = art.title?.trim() || "Sem título";
    const resumo = art.description || art.content || "";
    const data = art.publishedAt || new Date().toISOString();
    const url = art.url;
    const fonte = art.source?.name || "Notícia Online";

    await db.run(
      `INSERT OR IGNORE INTO news 
      (title, summary, date, source, url, state, region, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [titulo, resumo, data, fonte, url, "Brasil", "Nacional", "Publicado"]
    );
  }

  console.log(`🆕 ${artigos.length} artigos processados.`);
  await db.close();
}

atualizarBanco().then(() => console.log("🏁 Coleta via NewsAPI concluída."));
