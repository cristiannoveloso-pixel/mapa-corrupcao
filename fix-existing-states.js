// backend/fix-existing-states.js
// -----------------------------------------------
// Corrige registros antigos do banco corruption.db
// Atualiza estado e região com base no título e URL
// -----------------------------------------------

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "corruption.db");
const db = new sqlite3.Database(dbPath);

// ========== Funções auxiliares ==========
function normalizeText(text) {
  return text ? text.replace(/\s+/g, " ").trim() : "";
}

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

// ========== Execução principal ==========
console.log("🔧 Corrigindo registros no banco corruption.db...");

db.all("SELECT id, title, summary, url, state FROM news", (err, rows) => {
  if (err) {
    console.error("❌ Erro ao consultar:", err.message);
    db.close();
    return;
  }

  let total = 0, atualizados = 0, limpos = 0;
  rows.forEach(r => {
    total++;
    const detected = detectStateAndRegion({
      url: r.url,
      title: r.title,
      summary: r.summary
    });

    // Atualiza se encontrar estado válido
    if (detected.state && detected.region && r.state !== detected.state) {
      db.run(
        "UPDATE news SET state = ?, region = ? WHERE id = ?",
        [detected.state, detected.region, r.id],
        err => {
          if (!err) {
            console.log(`✅ #${r.id}: ${r.state || "?"} → ${detected.state} (${detected.region})`);
            atualizados++;
          }
        }
      );
    }

    // Limpa "Brasil" ou "Nacional"
    if (r.state && ["brasil", "nacional"].includes(r.state.toLowerCase())) {
      db.run(
        "UPDATE news SET state = NULL, region = NULL WHERE id = ?",
        [r.id],
        err => {
          if (!err) {
            console.log(`🗑️ #${r.id}: removido estado inválido (${r.state})`);
            limpos++;
          }
        }
      );
    }
  });

  setTimeout(() => {
    console.log("\n📊 Resumo da correção:");
    console.log(`• Total de registros: ${total}`);
    console.log(`• Atualizados com estado/região: ${atualizados}`);
    console.log(`• Limpos (Brasil/Nacional): ${limpos}`);
    db.close();
  }, 1500);
});
