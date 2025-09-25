const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');

let client;
let mainWindow;

// Verifica se está em desenvolvimento ou produção
const isDev = !app.isPackaged;

// Diretório de dados do usuário
const userDataPath = app.getPath("userData");
const contatosFile = path.join(userDataPath, "contatos.json");
const ignoradosFile =  "contatosig.json";
const uploadDir = path.join(userDataPath, "uploads");

// Cria pasta uploads se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Carregar lista de ignorados
let ignorados = [];
if (fs.existsSync(ignoradosFile)) {
  try {
    ignorados = JSON.parse(fs.readFileSync(ignoradosFile, "utf8"));
  } catch (error) {
    console.error("Erro ao carregar ignorados:", error);
  }
}

function salvarIgnorados() {
  try {
    fs.writeFileSync(ignoradosFile, JSON.stringify(ignorados, null, 2));
  } catch (error) {
    console.error("Erro ao salvar ignorados:", error);
  }
}

function setMainWindow(win) {
  mainWindow = win;
}

function startWhatsApp() {
  // Configuração do Puppeteer para build distribuído
  const puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  };

  // Em produção, usa o Chromium embutido do Electron

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: "whatsapp-client",
      dataPath: userDataPath // Garante que os dados de autenticação sejam salvos no userData
    }),
    puppeteer: puppeteerConfig,
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
  });

  // QR Code
  client.on('qr', async qr => {
    console.log("QR Code gerado.");
    try {
      const qrCodeDataUrl = await qrcode.toDataURL(qr);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('qr-generated', qrCodeDataUrl);
      }
    } catch (error) {
      console.error("Erro ao gerar QR code:", error);
    }
  });

  // Conectado
  client.on('ready', () => {
    console.log('WhatsApp conectado!');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('whatsapp-ready');
    }
  });

  // Erro de autenticação
  client.on('auth_failure', (msg) => {
    console.error('Falha na autenticação:', msg);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth-failure', msg);
    }
  });

  // Desconectado
  client.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('whatsapp-disconnected');
    }
  });

  // Receber mensagens
  client.on('message', msg => {
    const numero = msg.from.replace("@c.us", "");
    if (msg.body.toUpperCase().trim() === "SAIR") {
      if (!ignorados.includes(numero)) {
        ignorados.push(numero);
        salvarIgnorados();
        msg.reply("Você foi removido da lista e não receberá mais mensagens promocionais e de inicios de funcionamento.");
        console.log(`Número adicionado ao contatosig.json: ${numero}`);
      }
    }
  });

  try {
    client.initialize();
  } catch (error) {
    console.error("Erro ao inicializar WhatsApp:", error);
  }
}

async function sendMessages(contatos, mensagem, ignorar, imagem) {
  if (!client || client.pupPage === null) {
    throw new Error('WhatsApp não inicializado ou desconectado');
  }

  const ignorarSet = new Set([...ignorar, ...ignorados]);
  let media = null;

  if (imagem) {
    try {
      const imagemPath = path.join(uploadDir, "imagem_atual.jpg");
      if (fs.existsSync(imagemPath)) {
        media = MessageMedia.fromFilePath(imagemPath);
      }
    } catch (err) {
      console.error("Erro ao carregar imagem:", err);
    }
  }

  let enviados = 0;

  for (let numero of contatos) {
    if (ignorarSet.has(numero)) {
      console.log(`Ignorado: ${numero}`);
      continue;
    }

    const chatId = `${numero}@c.us`;
    try {
      const chat = await client.getChatById(chatId);
      await chat.sendStateTyping();
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

      if (media) {
        await client.sendMessage(chatId, media, { caption: mensagem });
      } else {
        await client.sendMessage(chatId, mensagem);
      }
      
      enviados++;
      console.log(`Mensagem enviada para ${numero} (Total enviados: ${enviados})`);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('progress-update', enviados);
      }

      if (enviados % 100 === 0) {
        console.log("Atingiu 100 mensagens, aguardando 10 minutos...");
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('status-update', `Pausado 10 minutos após ${enviados} mensagens`);
        }
        await new Promise(r => setTimeout(r, 10 * 60 * 1000));
      }

      const delay = Math.floor(Math.random() * 10) + 1;
      await new Promise(r => setTimeout(r, delay * 1000));

    } catch (err) {
      console.error(`Erro ao enviar para ${numero}:`, err);
    }
  }

  return "Envio concluído!";
}

module.exports = { startWhatsApp, sendMessages, setMainWindow };