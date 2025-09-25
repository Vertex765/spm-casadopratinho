const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require('path');
const fs = require("fs");


 

const userDataPath = app.getPath("userData");
const contatosFile = path.join(userDataPath, "contatos.json");
const contatosIgFile =  "contatosig.json";
  const uploadsDir = path.join(userDataPath, "uploads");



    const { startWhatsApp, sendMessages, setMainWindow } = require("./sender.js");

// Aguarde o app estar pronto antes de importar o sender
app.whenReady().then(() => {
  


  // Garante que os diretórios existam
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  function createWindow() {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false // Importante para recursos locais
      }
    });

    setMainWindow(win);
    win.loadFile('index.html');
    
  
  }

  createWindow();
  
  // Inicializa o WhatsApp após um pequeno delay para a janela carregar
  setTimeout(() => {
    startWhatsApp();
  }, 1000);

  // ... resto do seu código main.js permanece igual
});

// ... resto do seu main.js

ipcMain.handle("select-image", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg"] }]
  });

  if (result.canceled) return null;
  return result.filePaths[0]; // retorna o caminho real do arquivo
});

ipcMain.on("upload-image", (event, filePath) => {
const uploadDir = path.join(app.getPath("userData"), "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const destino = path.join(uploadDir, "imagem_atual.jpg");
  fs.copyFileSync(filePath, destino);

  console.log("✅ Imagem atualizada:", destino);
});
ipcMain.handle("select-csv", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "CSV Files", extensions: ["csv"] }]
  });

  if (result.canceled) return null;
  return result.filePaths[0]; // retorna o caminho real do CSV
});
ipcMain.on("process-csv", (event, filePath) => {
  try {
    const csvData = fs.readFileSync(filePath, "utf-8");

    // quebra em linhas e ignora o cabeçalho
    const linhas = csvData.split(/\r?\n/).slice(1); // pula a primeira linha (cabeçalho)

    const numerosNovos = linhas
      .map(linha => {
        if (!linha.trim()) return "";
        const partes = linha.includes(";") ? linha.split(";") : linha.split(",");
        if (!partes[1]) return ""; // se não tiver segunda coluna

        // só números
        let num = partes[1].replace(/\D/g, "");
        if (!num) return "";

        // remove o 9 depois do DDD:  
        // Ex: 85 9 888432770 → 85 888432770
        // Pega DDD (2 dígitos), se tiver 9 logo depois remove
        if (num.length >= 11) {
          const ddd = num.slice(0, 2);
          let resto = num.slice(2);
          if (resto.startsWith("9")) {
            resto = resto.slice(1); // remove o 9
          }
          num = ddd + resto;
        }

        // adiciona 55 no início se não tiver
        if (!num.startsWith("55")) {
          num = "55" + num;
        }

        // ignora se for menor que 12 dígitos no total
        if (num.length != 12) return "";

        return num;
      })
      .filter(n => n.length > 0);

    // caminho do arquivo de saída
    const outputPath = path.join(app.getPath("userData"), "contatos.json");

    // lê contatos existentes, se houver
    let contatosExistentes = [];
    if (fs.existsSync(outputPath)) {
      try {
        contatosExistentes = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
        if (!Array.isArray(contatosExistentes)) contatosExistentes = [];
      } catch {
        contatosExistentes = [];
      }
    }

    // une os existentes + novos e remove duplicados
    const todosContatos = Array.from(new Set([...contatosExistentes, ...numerosNovos]));

    // salva em JSON
    fs.writeFileSync(outputPath, JSON.stringify(todosContatos, null, 2), "utf-8");

    event.sender.send("csv-done", outputPath);
  } catch (err) {
    console.error("❌ Erro ao processar CSV:", err);
  }
});




ipcMain.on("enviar-mensagens", async (event, { mensagem, imagem }) => {
  try {
    // carrega contatos do arquivo
    let contatos = [];
    if (fs.existsSync(contatosFile)) {
      const data = fs.readFileSync(contatosFile, "utf8");
      if (data.trim().length > 0) {
        contatos = JSON.parse(data);
      }
    }
  let ignorar = [];
    if (fs.existsSync(contatosIgFile)) {
      const data = fs.readFileSync(contatosIgFile, "utf8");
      if (data.trim().length > 0) {
        ignorar = JSON.parse(data);
      }
    }
    const resultado = await sendMessages(contatos, mensagem, ignorar, imagem);
    console.log(resultado);
  } catch (err) {
    console.error("Erro no envio:", err);
  }
});
ipcMain.handle("contar-contatos", async () => {
  try {
    if (fs.existsSync(contatosFile)) {
      const data = fs.readFileSync(contatosFile, "utf8");
      if (data.trim().length > 0) {
        const contatos = JSON.parse(data);
        return contatos.length; // devolve a quantidade
      }
    }
    return 0; // se não existir ou estiver vazio
  } catch (err) {
    console.error("Erro ao contar contatos:", err);
    return 0;
  }
});
ipcMain.handle("contar-contatosig", async () => {
  try {
    if (fs.existsSync(contatosIgFile)) {
      const data = fs.readFileSync(contatosIgFile, "utf8");
      if (data.trim().length > 0) {
        const contatosig = JSON.parse(data);
        return contatosig.length; // devolve a quantidade
      }
    }
    return 0; // se não existir ou estiver vazio
  } catch (err) {
    console.error("Erro ao contar contatos:", err);
    return 0;
  }
});


const GEMINI_API_KEY = "AIzaSyAZ1iL2yXhR2IxHJLTzvP8WbtHmknGmtHE";

ipcMain.handle("gerar-texto-gemini", async (event, prompt) => {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      }
    );

    const data = await response.json();

    // 👇 Pega apenas o texto gerado
    const textoGerado =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";

    return textoGerado;
  } catch (err) {
    console.error("Erro ao chamar Gemini:", err);
    return "Erro: " + err.message;
  }
});




ipcMain.on('limpar-contatos', (event) => {
  try {
    fs.writeFileSync(contatosFile, JSON.stringify([], null, 2), 'utf-8');
    event.sender.send('contatos-limpos');
    console.log('contatos.json foi esvaziado.');
  } catch (err) {
    console.error('Erro ao limpar contatos.json:', err);
    event.sender.send('erro-limpar-contatos', err.message);
  }
});

ipcMain.handle("get-user-data-path", () => {
  return app.getPath("userData");
});
ipcMain.handle("get-upload-path", () => {
  const uploadDir = path.join(app.getPath("userData"), "uploads");
  return path.join(uploadDir, "imagem_atual.jpg");
});


ipcMain.handle("get-style-path", () => {
  return path.join(process.resourcesPath, "style.css");
});

