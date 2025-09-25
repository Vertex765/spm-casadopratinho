const { ipcRenderer } = require('electron');
const fs = require("fs");

// No início do renderer.js, adicione:
ipcRenderer.on('auth-failure', (event, msg) => {
  console.error('Falha na autenticação:', msg);
  document.getElementById('qr-area').innerHTML = 
    '<p style="color: red;">Erro de autenticação. Reinicie a aplicação.</p>';
});

ipcRenderer.on('whatsapp-disconnected', () => {
  document.getElementById('qr-area').innerHTML = 
    '<p style="color: orange;">WhatsApp desconectado. Reconectando...</p>';
});
// Mostrar QR Code
ipcRenderer.on('qr-generated', (event, qrCodeDataUrl) => {
  document.getElementById('qr-area').querySelector("p").innerText = "Escaneie o QR Code abaixo:";
  const qrImg = document.getElementById('qr-image');
  qrImg.src = qrCodeDataUrl;
  qrImg.style.display = 'block';
});


// Quando conectar
ipcRenderer.on('whatsapp-ready', () => {
  document.getElementById('qr-area').innerHTML = `<p id="pronto">✅ Conectado ao WhatsApp!</p>`;
   const audio = document.getElementById("alertSound");
audio.play();
   

  const qntctts = path.join(__dirname, "contatos.json");
const lerqnt = fs.readFileSync(qntctts,JSON.parse).split(",")
 document.getElementById('qr-area').innerHTML = `<p>${lerqnt.length}</p>`;
});



document.getElementById("selecionarImagem").addEventListener("click", async () => {
  const result = await ipcRenderer.invoke("select-image");
  if (result) {
    ipcRenderer.send("upload-image", result);

    // Mostra a imagem escolhida direto no HTML
    const preview = document.getElementById("preview");
    preview.src = result;  // caminho absoluto
  }
});
document.getElementById("importCsv").addEventListener("click", async () => {
  const filePath = await ipcRenderer.invoke("select-csv");
  if (!filePath) return;

  ipcRenderer.send("process-csv", filePath);
    
const qtd = await ipcRenderer.invoke("contar-contatos");
  document.getElementById("ctts").textContent = `Total de contatos: ${qtd}`;
      alert("Lista de Numeros adcionada com sucesso");
     

});
document.getElementById("enviarBtn").addEventListener("click", () => {
const prontobtn = document.getElementById("pronto");

const mensagem = document.getElementById("mensagem").value;
     const audio = document.getElementById("alertSound");
if(prontobtn.innerText != "✅ Conectado ao WhatsApp!") {
  alert("Você precisa estar conectado, aguarde se conectar antes de iniciar os envios")
  return;
} else if (!mensagem) {
alert("Ops, você precisa colocar um texto antes de iniciar os envios")
  return;
}
audio.pause();
    document.getElementById("enviarBtn").innerText = "Sistema iniciado"
  ipcRenderer.send("enviar-mensagens", {
    mensagem,
    imagem: true // se quiser mandar imagem junto
  });
   document.getElementById("enviarBtn").innerText = "Realizar os Envios"
    // reseta pro início
  alert("Sistema iniciado com sucesso")
});
window.addEventListener("DOMContentLoaded", async () => {

const imagePath = await ipcRenderer.invoke("get-upload-path");
  const preview = document.getElementById("preview");
  preview.src = imagePath;

  const qtd = await ipcRenderer.invoke("contar-contatos");
  document.getElementById("ctts").textContent = `Total de contatos: ${qtd}`;
  const qtdig = await ipcRenderer.invoke("contar-contatosig");
  document.getElementById("cttsig").textContent = `Total de contatos a ser ignorados: ${qtdig}`;
});
function getDiaSemana() {
  const dias = [
    "DOMINGO",
    "SEGUNDA-FEIRA",
    "TERÇA-FEIRA",
    "QUARTA-FEIRA",
    "QUINTA-FEIRA",
    "SEXTA-FEIRA",
    "SÁBADO"
  ];
  const hoje = new Date();
  return dias[hoje.getDay()];
}

const diaDeHoje = getDiaSemana();

document.getElementById("gerarTextoBtn").addEventListener("click", async () => {
  document.getElementById("gerarTextoBtn").innerText = "Gerando texto..."
  const prompt = `
Hoje é ${diaDeHoje}.
Gere uma mensagem promocional para a Casa do Pratinho seguindo exatamente estas regras:

1. O título deve ser "🍴 ${diaDeHoje} COM GOSTINHO DE NORDESTE! 🛵🔥".
2. O texto deve convidar o cliente a pedir um "pratinho nordestino quentinho, cheio de tradição" e dizer que entregamos até às 23h.
3. Sempre inclua um benefício: você ganha cashback para economizar na sua proxima compra
4. Se o dia de hoje for QUINTA-FEIRA, adicione também: "🎁 Hoje tem CUPOM ESPECIAL: QUINTA15%OF".
5. No final, sempre coloque o link:
   https://pedido.anota.ai/loja/casa_do_pratinho__?f=msa
6. No final, sempre coloque : Caso queira parar de receber essa mensagem basta enviar a palavra *SAIR*
7. Retorne apenas a mensagem pronta, sem explicações ou texto adicional.
`;

const resposta = await ipcRenderer.invoke("gerar-texto-gemini", prompt);

  const textoGerado = await ipcRenderer.invoke("gerar-texto-gemini", prompt);
  document.getElementById("mensagem").value = textoGerado;
  
  document.getElementById("gerarTextoBtn").innerText = "Gerar Texto com IA"
});
ipcRenderer.on('progress-update', (event, enviados) => {
   document.getElementById('qr-area').innerHTML = `
   <p>Sistema Inicado</p>
   <p>✅ Enviados: ${enviados}</p>`;
});
 document.getElementById('btn-limpar').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja limpar todos os contatos?')) {
      ipcRenderer.send('limpar-contatos');
    }
  });

  ipcRenderer.on('contatos-limpos',async () => {
    const qtd = await ipcRenderer.invoke("contar-contatos");
  document.getElementById("ctts").textContent = `Total de contatos: ${qtd}`;
    alert('Contatos apagados com sucesso!');
  });

  ipcRenderer.on('erro-limpar-contatos', (event, err) => {
    alert('Erro ao limpar contatos: ' + err);
  });



ipcRenderer.invoke("get-style-path").then(stylePath => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = stylePath;
  document.head.appendChild(link);
});