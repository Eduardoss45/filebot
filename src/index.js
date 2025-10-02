const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("fs");
const crypto = require("crypto");
const chokidar = require("chokidar");
const started = require("electron-squirrel-startup");
const { carregarJson, registrarJson } = require("./utils/recoveryUtils");
const { logMessage } = require("./utils/loggerUtils");

if (started) {
  app.quit();
}

// Caminhos para os JSONs
const jsonPath = path.join(__dirname, "json");
const pastasJsonPath = path.join(jsonPath, "pastas.json");
const formatosJsonPath = path.join(jsonPath, "formatos.json");
const recoveryJsonPath = path.join(jsonPath, "filebot_recovery.json");

// 📌 Garantir que a pasta "json" existe
if (!fs.existsSync(jsonPath)) {
  fs.mkdirSync(jsonPath, { recursive: true });
}

// 📌 Criar um JSON padrão caso não exista
const inicializarJson = (filePath, defaultData) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
  }
};

inicializarJson(pastasJsonPath, {});
inicializarJson(formatosJsonPath, { formatos: [] });
inicializarJson(recoveryJsonPath, {});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "frontend", "index.html"));

  // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Lógica do backend integrada

const arquivosMovidos = new Set();
let arquivosRenomeados = [];

const calcularHashArquivo = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (data) => {
      hash.update(data);
    });
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
    stream.on("error", (err) => {
      reject(err);
    });
  });
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const definirMetodo = ({ extension, creationDate, modificationDate, pattern }) => {
  if (Array.isArray(extension) && extension.length > 0) return "extension";
  if (creationDate) return "creationDate";
  if (modificationDate) return "modificationDate";
  if (pattern) return "pattern";
  return null;
};

const extrairPadrao = (fileName) => {
  const nomeSemExtensao = path.basename(fileName, path.extname(fileName));
  const padrao = nomeSemExtensao.match(/^[^\W\d_]+/);
  return padrao ? padrao[0] : null;
};

const verificarPadrao = (fileName, pattern, regExr) => {
  const basePattern = extrairPadrao(fileName);
  if (basePattern !== pattern) {
    logMessage(
      "warn",
      "Padrão não corresponde ao prefixo do arquivo. Ignorando..."
    );
    return false;
  } else if (!(regExr instanceof RegExp)) {
    logMessage("error", "🚨 RegExr inválido.");
    return false;
  }
  return regExr.test(basePattern);
};

const deveMoverArquivo = (file, stats, metodoUsado, criterios, regExr) => {
  switch (metodoUsado) {
    case "extension":
      return criterios.extensions.includes(path.extname(file));
    case "creationDate":
      return formatDate(stats.birthtime) === criterios.creationDate;
    case "modificationDate":
      return formatDate(stats.mtime) === criterios.modificationDate;
    case "pattern":
      return verificarPadrao(file, criterios.pattern, regExr);
    default:
      return false;
  }
};

async function verificarEExcluirDuplicata(filePath, destinoInicial) {
  try {
    const [statsNovo, statsExistente] = await Promise.all([
      fs.promises.stat(filePath).catch(() => null),
      fs.promises.stat(destinoInicial).catch(() => null),
    ]);

    if (!statsNovo || !statsExistente) return false;

    if (statsNovo.size !== statsExistente.size) return false;

    const [hashNovo, hashExistente] = await Promise.all([
      calcularHashArquivo(filePath),
      calcularHashArquivo(destinoInicial),
    ]);

    if (hashNovo && hashNovo === hashExistente) {
      logMessage(
        "info",
        `🗑️ Arquivo duplicado encontrado! Excluindo ${filePath}...`
      );
      await fs.promises.unlink(filePath);
      return true;
    }
  } catch (err) {
    logMessage("error", `🚨 Erro ao comparar arquivos: ${err}`);
  }
  return false;
}

const moverArquivo = async (filePath, to) => {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath);
  const fileBaseName = path.basename(filePath, fileExt);

  if (arquivosMovidos.has(fileName)) {
    logMessage(
      "info",
      `🔄 Ignorando ${fileName}, pois foi movido recentemente.`
    );
    return;
  }

  let destinoInicial = path.join(to, fileName);

  if (
    await fs.promises
      .access(destinoInicial)
      .then(() => true)
      .catch(() => false)
  ) {
    if (await verificarEExcluirDuplicata(filePath, destinoInicial)) return;
  }

  let newPath = destinoInicial;
  let newFileName = "";
  let count = 1;
  while (
    await fs.promises
      .access(newPath)
      .then(() => true)
      .catch(() => false)
  ) {
    newPath = path.join(to, `${fileBaseName} (${count})${fileExt}`);
    newFileName = `${fileBaseName} (${count})${fileExt}`;
    arquivosRenomeados.push({
      [fileBaseName + fileExt]: newFileName,
    });
    count++;
  }

  logMessage("info", `🚀 Movendo ${fileName} para ${newPath}`);

  arquivosMovidos.add(fileName);

  fs.promises
    .rename(filePath, newPath)
    .then(() => {
      logMessage("info", `✅ ${fileName} movido para ${newPath}`);
      setTimeout(() => arquivosMovidos.delete(fileName), 5000);
    })
    .catch((err) => {
      logMessage("error", `🚨 Erro ao mover ${fileName}: ${err}`);
      arquivosMovidos.delete(fileName);
    });
};

const monitorarArquivos = async ({
  from,
  to,
  ignore,
  metodoUsado,
  criterios,
  regExr,
}) => {
  const watcher = chokidar.watch(from, { persistent: true });

  const arquivosMovidos = [];
  const arquivosIgnorados = [];
  const promessasMovimentacao = [];

  watcher.on("add", async (filePath) => {
    const fileName = path.basename(filePath);
    const fileDir = path.dirname(filePath);

    if (
      Array.isArray(ignore) &&
      ignore.some((item) => fileName === item || fileDir.endsWith(`/${item}`))
    ) {
      arquivosIgnorados.push(fileName);
      logMessage("info", `❌ Ignorado: ${filePath}`);
      return;
    }

    const mover = async () => {
      try {
        const stats = await fs.promises.stat(filePath);
        if (deveMoverArquivo(filePath, stats, metodoUsado, criterios, regExr)) {
          await moverArquivo(filePath, to);
          arquivosMovidos.push(fileName);
        }
      } catch (err) {
        logMessage("error", `🚨 Erro ao acessar ${fileName}: ${err}`);
      }
    };

    promessasMovimentacao.push(mover());
  });

  watcher.on("error", (err) =>
    logMessage("error", `🚨 Erro no monitoramento: ${err}`)
  );

  watcher.on("ready", async () => {
    logMessage(
      "info",
      `📂 Monitorando "${from}" e movendo para "${to}" usando método "${metodoUsado}"`
    );

    await Promise.all(promessasMovimentacao);

    await registrarJson({
      from,
      to,
      metodoUsado,
      criterios,
      arquivosMovidos,
      arquivosIgnorados,
      arquivosRenomeados,
    });
  });

  return { arquivosMovidos, arquivosIgnorados };
};

// IPC Handlers

ipcMain.handle("organizar-automaticamente", (event, args) => {
  const {
    extension,
    from,
    to,
    ignore,
    pattern,
    creationDate,
    modificationDate,
  } = args;

  if (!from || !to) return { success: false, message: "Caminhos inválidos." };

  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });

  const regExr = new RegExp("^[^\\W\\d_]+");

  const criteriosRecebidos = {
    extension: extension?.length > 0,
    creationDate: !!creationDate,
    modificationDate: !!modificationDate,
    pattern: !!pattern,
  };

  const criteriosAtivos = Object.keys(criteriosRecebidos).filter(
    (key) => criteriosRecebidos[key]
  );

  if (criteriosAtivos.length !== 1) {
    return {
      success: false,
      message: `Erro: Apenas um critério deve ser utilizado por vez. Critérios enviados: ${criteriosAtivos.join(
        ", "
      )}`,
    };
  }

  const metodoUsado = definirMetodo({
    extension,
    creationDate,
    modificationDate,
    pattern,
  });

  if (!metodoUsado) {
    return {
      success: false,
      message: "Nenhum critério válido foi fornecido.",
    };
  }

  const criterios = {
    extensions: Array.isArray(extension)
      ? extension.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)) 
      : undefined,
    creationDate,
    modificationDate,
    pattern,
  };

  monitorarArquivos({
    from,
    to,
    ignore,
    metodoUsado,
    criterios,
    regExr,
  });

  return {
    success: true,
    message: `📂 Monitoramento iniciado com sucesso usando o método "${metodoUsado}".`,
  };
});

ipcMain.handle("reverter-movimentacao", (event, args) => {
  try {
    let { data, idMovimentacao } = args;
    let json = carregarJson();

    if (!Object.keys(json).length) {
      return { success: false, message: "Nenhuma movimentação encontrada." };
    }

    if (!data) {
      data = Object.keys(json).sort().pop();
    }

    if (!json[data] || !Object.keys(json[data]).length) {
      return {
        success: false,
        message: "Nenhuma movimentação encontrada para a data fornecida.",
      };
    }

    if (!idMovimentacao) {
      idMovimentacao = Object.keys(json[data]).sort().pop();
    }

    if (!json[data][idMovimentacao]) {
      return { success: false, message: "Movimentação não encontrada." };
    }

    const movimentacao = json[data][idMovimentacao];
    logMessage(`🔄 Revertendo movimentação: ${idMovimentacao} do dia ${data}`);

    let error = false;

    movimentacao.filesNames.forEach((arquivo) => {
      let nomeOriginal = arquivo;
      let nomeRenomeado = arquivo;

      if (movimentacao.filesRenamed && movimentacao.filesRenamed.length > 0) {
        const renomeado = movimentacao.filesRenamed.find(
          (obj) => Object.keys(obj)[0] === arquivo
        );
        if (renomeado) {
          nomeRenomeado = renomeado[arquivo];
        }
      }

      const caminhoAtual = path.join(movimentacao.toDestin, nomeRenomeado);
      const caminhoOriginal = path.join(movimentacao.fromFolder, nomeOriginal);

      if (fs.existsSync(caminhoAtual)) {
        try {
          fs.renameSync(caminhoAtual, caminhoOriginal);
          logMessage(
            `✅ Arquivo restaurado: ${nomeRenomeado} → ${nomeOriginal}`
          );
        } catch (err) {
          logMessage(
            `❌ Erro ao restaurar ${nomeRenomeado}: ${err.message}`,
            "error"
          );
          error = true;
        }
      } else {
        logMessage(
          `⚠️ Arquivo não encontrado no destino: ${nomeRenomeado}`,
          "warn"
        );
      }
    });

    if (!error) {
      delete json[data][idMovimentacao];
      if (Object.keys(json[data]).length === 0) {
        delete json[data];
      }

      fs.writeFileSync(recoveryJsonPath, JSON.stringify(json, null, 2), "utf-8");
      logMessage("✅ Movimentação revertida com sucesso!");
      return { success: true, message: "Movimentação revertida com sucesso!" };
    } else {
      return {
        success: false,
        message: "Reversão parcial concluída, alguns arquivos falharam.",
      };
    }
  } catch (error) {
    logMessage(`❌ Erro na reversão: ${error.message}`, "error");
    return { success: false, message: "Erro ao reverter movimentação." };
  }
});

// Funções existentes
ipcMain.handle("obter-formatos", async () => {
  try {
    if (fs.existsSync(formatosJsonPath)) {
      const data = fs.readFileSync(formatosJsonPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erro ao carregar formatos:", error);
  }
  return [];
});

ipcMain.handle("obter-pastas", async () => {
  try {
    if (fs.existsSync(pastasJsonPath)) {
      const data = fs.readFileSync(pastasJsonPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erro ao obter pastas:", error);
  }
  return {};
});

ipcMain.handle("selecionar-pasta", async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  return filePaths.length > 0 ? filePaths[0] : null;
});

ipcMain.handle("salvar-pasta", async (_, nome, caminho) => {
  try {
    const data = fs.existsSync(pastasJsonPath)
      ? JSON.parse(fs.readFileSync(pastasJsonPath, "utf-8"))
      : {};

    data[nome] = caminho;
    fs.writeFileSync(pastasJsonPath, JSON.stringify(data, null, 2), "utf-8");

    return true;
  } catch (error) {
    console.error("Erro ao salvar pastas.json:", error);
    return false;
  }
});