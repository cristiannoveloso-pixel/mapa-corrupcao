// backend/scraper.js
// -----------------------------------------------
// Coletor automático de notícias de corrupção
// Fontes: G1 Política, Metrópoles e Agência Brasil (ampliada)
// Banco: corruption.db (tabela: news)
// -----------------------------------------------

const axios = require("axios");
const cheerio = require("cheerio");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "corruption.db");
const db = new sqlite3.Database(dbPath);

// ========== Funções auxiliares ==========

function normalizeText(text) {
  return text ? text.replace(/\s+/g, " ").trim() : "";
}

// Estados e Regiões
const STATES = {
  acre: "Acre", alagoas: "Alagoas", amapa: "Amapá", amazonas: "Amazonas", bahia: "Bahia", ceara: "Ceará",
  "distrito federal": "Distrito Federal", espirito: "Espírito Santo", goias: "Goiás", maranhao: "Maranhão",
  "mato grosso": "Mato Grosso", "mato grosso do sul": "Mato Grosso do Sul", minas: "Minas Gerais",
  para: "Pará", paraiba: "Paraíba", parana: "Paraná", pernambuco: "Pernambuco", piaui: "Piauí",
  "rio de janeiro": "Rio de Janeiro", "rio grande do norte": "Rio Grande do Norte",
  "rio grande do sul": "Rio Grande do Sul", rondonia: "Rondônia", roraima: "Roraima",
  "santa catarina": "Santa Catarina", "sao paulo": "São Paulo", sergipe: "Sergipe", tocantins: "Tocantins",
  sp: "São Paulo", rj: "Rio de Janeiro", mg: "Minas Gerais", df: "Distrito Federal", go: "Goiás",
  rs: "Rio Grande do Sul", pr: "Paraná", ba: "Bahia", ce: "Ceará", pe: "Pernambuco", am: "Amazonas",
  pa: "Pará", ma: "Maranhão", mt: "Mato Grosso", ms: "Mato Grosso do Sul", pi: "Piauí", to: "Tocantins",
  se: "Sergipe", pb: "Paraíba", rn: "Rio Grande do Norte", es: "Espírito Santo", al: "Alagoas",
  ac: "Acre", ap: "Amapá", ro: "Rondônia", rr: "Roraima",
};

const STATE_TO_REGION = {
  Acre: "Norte", Amapá: "Norte", Amazonas: "Norte", Pará: "Norte", Rondônia: "Norte",
  Roraima: "Norte", Tocantins: "Norte", Maranhão: "Nordeste", Piauí: "Nordeste", Ceará: "Nordeste",
  "Rio Grande do Norte": "Nordeste", Paraíba: "Nordeste", Pernambuco: "Nordeste", Alagoas: "Nordeste",
  Sergipe: "Nordeste", Bahia: "Nordeste", "Distrito Federal": "Centro-Oeste", Goiás: "Centro-Oeste",
  "Mato Grosso": "Centro-Oeste", "Mato Grosso do Sul": "Centro-Oeste", "Minas Gerais": "Sudeste",
  "Espírito Santo": "Sudeste", "Rio de Janeiro": "Sudeste", "São Paulo": "Sudeste",
  Paraná: "Sul", "Santa Catarina": "Sul", "Rio Grande do Sul": "Sul",
};

function normalizeForMatch(s) {
  if (!s) return "";
  return s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .toLowerCase()
    .trim();
}

function detectStateFromUrl(url) {
  if (!url) return null;
  const u = normalizeForMatch(url);
  for (const key of Object.keys(STATES)) {
    if (u.includes(key)) return STATES[key];
  }
  return null;
}

function detectStateFromText(title, summary) {
  const text = normalizeForMatch(`${title || ""} ${summary || ""}`);
  for (const key of Object.keys(STATES)) {
    if (text.includes(key)) return STATES[key];
  }
  return null;
}

function detectStateAndRegion({ url, title, summary }) {
  let state = detectStateFromUrl(url) || detectStateFromText(title, summary);
  if (!state) return { state: null, region: null };
  const region = STATE_TO_REGION[state] || null;
  return { state, region };
}

// Verifica duplicatas
function existsNews(title, url, callback) {
  db.get(
    "SELECT id FROM news WHERE title = ? OR url = ? LIMIT 1",
    [title, url],
    (err, row) => {
      if (err) {
        console.error("Erro ao verificar duplicata:", err.message);
        callback(false);
      } else {
        callback(!!row);
      }
    }
  );
}

// Insere notícia
function insertNews(n) {
  const { state, region } = detectStateAndRegion(n);
  n.state = state;
  n.region = region;

  existsNews(n.title, n.url, exists => {
    if (!exists) {
      db.run(
        `INSERT INTO news (title, summary, state, region, date, source, url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [n.title, n.summary, n.state, n.region, n.date, n.source, n.url],
        err => {
          if (err) console.error("❌ Erro ao inserir:", err.message);
        }
      );
    }
  });
}

// ======== Fonte 1: G1 Política ========
async function fetchG1() {
  console.log("📰 Coletando do G1 Política...");
  const url = "https://g1.globo.com/politica/";
  const html = await axios.get(url);
  const $ = cheerio.load(html.data);
  const noticias = [];

  $(".feed-post-body").each((i, el) => {
    const title = normalizeText($(el).find(".feed-post-link").text());
    const summary = normalizeText($(el).find(".feed-post-body-resumo").text());
    const link = $(el).find(".feed-post-link").attr("href");
    if (title && link) {
      noticias.push({
        title,
        summary,
        url: link,
        date: new Date().toISOString().split("T")[0],
        source: "G1 Política",
      });
    }
  });

  console.log(`✅ ${noticias.length} notícias encontradas no G1`);
  noticias.forEach(insertNews);
}

// ======== Fonte 2: Metrópoles (expandida) ========
async function fetchMetropoles() {
  console.log("🧾 Coletando do Metrópoles (corrupção, fraude, propina, desvio)...");
  const tags = ["corrupcao", "fraude", "propina", "desvio"];
  const noticias = [];

  for (const tag of tags) {
    const url = `https://www.metropoles.com/tag/${tag}`;
    try {
      const html = await axios.get(url);
      const $ = cheerio.load(html.data);
      $("article").each((i, el) => {
        const title = normalizeText($(el).find("h2, h3, h1").text());
        const summary = normalizeText($(el).find("p").first().text());
        const link = $(el).find("a").attr("href");
        if (title && link) {
          noticias.push({
            title,
            summary,
            url: link.startsWith("http") ? link : `https://www.metropoles.com${link}`,
            date: new Date().toISOString().split("T")[0],
            source: `Metrópoles (${tag})`,
          });
        }
      });
    } catch (e) {
      console.warn(`⚠️ Falha ao coletar ${tag}: ${e.message}`);
    }
  }

  // Remove duplicatas
  const unique = [];
  const seen = new Set();
  for (const n of noticias) {
    if (!seen.has(n.url)) {
      seen.add(n.url);
      unique.push(n);
    }
  }

  console.log(`✅ ${unique.length} notícias encontradas no Metrópoles`);
  unique.forEach(insertNews);
}

// ======== Fonte 3: Agência Brasil (ampliada) ========
async function fetchAgenciaBrasil() {
  console.log("🗞️ Coletando da Agência Brasil (seção Política)...");
  const url = "https://agenciabrasil.ebc.com.br/politica";
  const html = await axios.get(url);
  const $ = cheerio.load(html.data);
  const noticias = [];

  $(".noticia").each((i, el) => {
    const title = normalizeText($(el).find("h2, h3, a").text());
    const summary = normalizeText($(el).find("p").first().text());
    const link = $(el).find("a").attr("href");
    const lower = title.toLowerCase();

    if (
      lower.includes("corrup") ||
      lower.includes("fraude") ||
      lower.includes("propina") ||
      lower.includes("desvio") ||
      lower.includes("irregular")
    ) {
      noticias.push({
        title,
        summary,
        url: link.startsWith("http") ? link : `https://agenciabrasil.ebc.com.br${link}`,
        date: new Date().toISOString().split("T")[0],
        source: "Agência Brasil (Política)",
      });
    }
  });

  console.log(`✅ ${noticias.length} notícias encontradas na Agência Brasil`);
  noticias.forEach(insertNews);
}

// ======== Execução principal ========
(async () => {
  console.log("🚀 Iniciando coleta de casos...");
  try {
    await fetchG1();
    await fetchMetropoles();
    await fetchAgenciaBrasil();
    console.log("🎉 Coleta concluída com sucesso!");
  } catch (e) {
    console.error("❌ Erro durante a coleta:", e.message);
  } finally {
    db.close();
  }
})();

