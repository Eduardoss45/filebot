const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "../json/filebot_recovery.json");

const carregarJson = () => {
  if (fs.existsSync(LOG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    } catch (error) {
      console.error("🚨 Erro ao carregar log:", error);
      return {};
    }
  }
  return {};
};

const salvarLog = (logData) => {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2), "utf-8");
};

const registrarJson = ({
  from,
  to,
  metodoUsado,
  criterios = {},
  arquivosMovidos,
  arquivosIgnorados,
  arquivosRenomeados,
}) => {
  const logData = carregarJson();

  const dataAtual = new Date()
    .toISOString()
    .split("T")[0]
    .split("-")
    .reverse()
    .join("-");
  const timestamp = new Date().toLocaleTimeString("pt-BR").replace(/:/g, "-");

  if (!logData[dataAtual]) logData[dataAtual] = {};

  const logId = `${
    Object.keys(logData[dataAtual]).length + 1
  }-${metodoUsado}-${timestamp}`;

  logData[dataAtual][logId] = {
    fromFolder: from,
    toDestin: to,
    typeParameter: {
      [metodoUsado]:
        criterios[metodoUsado] ?? criterios[`${metodoUsado}s`] ?? [],
    },
    ...(arquivosIgnorados.length > 0 && { filesIgnore: arquivosIgnorados }),
    filesNames: arquivosMovidos,
    filesRenamed: arquivosRenomeados,
  };

  salvarLog(logData);
};

module.exports = { carregarJson, registrarJson };
