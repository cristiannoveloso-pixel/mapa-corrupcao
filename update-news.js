// update-news.js
import axios from "axios";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as dotenv from "dotenv";

dotenv.config();

// ✅ Lista de chaves da NewsAPI
const apiKeys = [
  process.env.NEWS_API_KEY1,
  process.env.NEWS_API_KEY2
].filter(Boolean);

if (apiKeys.length === 0) {
  console.error("❌ Nenhuma NEWS_API_KEY encontrada no .env");
  process.exit(1);
}

// Mapeamento Estados → Regiões
const estadosRegioes = {
  "Acre": "Norte", "Alagoas": "Nordeste", "Amapá": "Norte", "Amazonas": "Norte",
  "Bahia": "Nordeste", "Ceará": "Nordeste", "Distrito Federal": "Centro-Oeste",
  "Espírito Santo": "Sudeste", "Goiás": "Centro-Oeste", "Maranhão": "Nordeste",
  "Mato Grosso": "Centro-Oeste", "Mato Grosso do Sul": "Centro-Oeste",
  "Minas Gerais": "Sudeste", "Pará": "Norte", "Paraíba": "Nordeste",
  "Paraná": "Sul", "Pernambuco": "Nordeste", "Piauí": "Nordeste",
  "Rio de Janeiro": "Sudeste", "Rio Grande do Norte": "Nordeste",
  "Rio Grande do Sul": "Sul", "Rondônia": "Norte", "Roraima": "Norte",
  "Santa Catarina": "Sul", "São Paulo": "Sudeste", "Sergipe": "Nordeste",
  "Tocantins": "Norte"
};

// Função para detectar estado no texto
function detectarEstado(texto) {
  if (!texto) return null;
  texto = texto.toLowerCase();
  for (const estado of Object.keys(estadosRegioes)) {
    if (texto.includes(estado.toLowerCase())) return estado;
  }
  return null;
}

// Conexão com o banco SQLite
async function connectDb() {
  return open({ filename: "corruption.db", driver: sqlite3.Database });
}

// Busca notícias via NewsAPI
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

// Atualiza banco com notícias
async function atualizarBanco() {
  const db = await connectDb();

  // Criação da tabela se não existir
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
    const resumo = art.description?.trim() || art.content?.trim() || "Sem resumo";
    const data = art.publishedAt || new Date().toISOString();
    const url = art.url || "";
    const fonte = art.source?.name?.trim() || "Notícia Online";

    // Detectar estado e região
    const estadoDetectado = detectarEstado(`${titulo} ${resumo}`) || "Brasil";
    const regiao = estadosRegioes[estadoDetectado] || "Nacional";

    const municipality = "—";
    const organization = "—";
    const value_estimated = "—";
    const status = "Publicado";

    try {
      await db.run(
        `INSERT OR IGNORE INTO news 
        (title, summary, state, region, municipality, organization, value_estimated, status, date, source, url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [titulo, resumo, estadoDetectado, regiao, municipality, organization, value_estimated, status, data, fonte, url]
      );
    } catch (err) {
      console.error(`❌ Erro ao inserir artigo: ${titulo}`, err.message);
    }
  }

  console.log(`🆕 ${artigos.length} artigos processados e inseridos com estado/região detectados.`);
  await db.close();
}

atualizarBanco().then(() => console.log("🏁 Coleta via NewsAPI concluída."));

