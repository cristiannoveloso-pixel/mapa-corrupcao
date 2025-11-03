// scheduler.js
import cron from "node-cron";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function executar(script) {
  console.log(`\n🚀 Executando ${script} em ${new Date().toLocaleString()}`);
  exec(`node ${__dirname}/${script}`, (err, stdout, stderr) => {
    if (err) console.error(`❌ Erro ao executar ${script}:`, err);
    if (stdout) console.log(stdout);
    if (stderr) console.warn(stderr);
  });
}

// 🕕 1️⃣ Coleta de notícias a cada 6 horas
cron.schedule("0 */6 * * *", () => {
  console.log("📰 Agendamento: Coleta de notícias (NewsAPI)");
  executar("update-news.js");
});

// 🌅 2️⃣ Coleta de dados oficiais 1 vez por dia (03:00)
cron.schedule("0 3 * * *", () => {
  console.log("🏛️ Agendamento: Coleta do Portal da Transparência");
  executar("update-cases.js");
});

console.log("✅ Agendador unificado iniciado.");
console.log("🕒 Notícias: a cada 6h | Dados oficiais: 03h diariamente");
