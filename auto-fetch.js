// backend/auto-fetch.js
const cron = require("node-cron");
const { exec } = require("child_process");
const path = require("path");

const scriptPath = path.join(__dirname, "scraper.js");

// Executa a coleta
function runScraper() {
  console.log("🕒 Executando coleta automática...");
  exec(`node "${scriptPath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Erro ao executar scraper:", err);
      return;
    }
    console.log(stdout);
    if (stderr) console.error(stderr);
  });
}

// Agenda: 08:00 e 20:00 todos os dias
cron.schedule("0 10,20 * * *", runScraper);

// Executa imediatamente ao iniciar
runScraper();
