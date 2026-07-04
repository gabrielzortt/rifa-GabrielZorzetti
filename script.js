import CONFIG from "./config.js";
import { escutarNumeros, reservarNumero, buscarConfigRemota } from "./firebase.js";

/* ============================================================
   ESTADO
   ============================================================ */
let mapaNumeros = {};       // { "0001": {status, nome, ...} }
let paginaAtual = 0;
const NUMEROS_POR_PAGINA = 100;
let totalNumeros = CONFIG.rifa.quantidadeNumeros;
let totalPaginas = Math.ceil(totalNumeros / NUMEROS_POR_PAGINA);

// Se o painel admin já salvou uma configuração no Firestore, ela sobrescreve
// os valores padrão de config.js (pix, valor, quantidade, whatsapp, prêmios).
async function aplicarConfigRemota() {
  try {
    const remota = await buscarConfigRemota();
    if (!remota) return;
    if (remota.pixChave) CONFIG.pix.chave = remota.pixChave;
    if (remota.pixTipo) CONFIG.pix.tipoChave = remota.pixTipo;
    if (remota.valorPorNumero != null) CONFIG.rifa.valorPorNumero = Number(remota.valorPorNumero);
    if (remota.quantidadeNumeros != null) CONFIG.rifa.quantidadeNumeros = Number(remota.quantidadeNumeros);
    if (remota.whatsappNumero) CONFIG.whatsapp.numero = remota.whatsappNumero;
    if (remota.whatsappExibicao) CONFIG.whatsapp.numeroExibicao = remota.whatsappExibicao;
    if (Array.isArray(remota.premios) && remota.premios.length) CONFIG.premios = remota.premios;
  } catch (e) {
    console.warn("Não foi possível carregar configuração remota, usando config.js local.", e);
  }
  totalNumeros = CONFIG.rifa.quantidadeNumeros;
  totalPaginas = Math.ceil(totalNumeros / NUMEROS_POR_PAGINA);
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatarNumero(n) {
  return String(n).padStart(CONFIG.rifa.digitosNumero, "0");
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function linkWhatsapp(mensagem) {
  return `https://wa.me/${CONFIG.whatsapp.numero}?text=${encodeURIComponent(mensagem)}`;
}

/* ============================================================
   PREENCHIMENTO ESTÁTICO A PARTIR DO CONFIG
   ============================================================ */
function preencherConfigEstatico() {
  document.getElementById("statTotalNumeros").textContent = totalNumeros;
  document.getElementById("valorNumeroTexto").textContent = formatarMoeda(CONFIG.rifa.valorPorNumero);
  document.getElementById("pixChave").textContent = CONFIG.pix.chave;
  document.getElementById("pixTipo").textContent = CONFIG.pix.tipoChave;
  document.getElementById("pixValor").textContent = formatarMoeda(CONFIG.rifa.valorPorNumero);
  document.getElementById("footerTexto").textContent = CONFIG.rodape.textoDireitos;

  const footerWpp = document.getElementById("footerWhatsapp");
  footerWpp.href = linkWhatsapp(`Olá! Tenho uma dúvida sobre a rifa de ${CONFIG.nome}.`);

  const qrImgs = document.querySelectorAll(".pix-box__qr");
  qrImgs.forEach((img) => (img.src = CONFIG.pix.qrCodeImagem));
}

function preencherCartas() {
  const grid = document.getElementById("cartasGrid");
  grid.innerHTML = CONFIG.cartas
    .map(
      (c) => `
    <a class="carta-card" href="${c.imagem}" target="_blank" rel="noopener">
      <div class="carta-card__thumb"><img src="${c.imagem}" alt="Carta de aceite — ${c.feira}" loading="lazy"></div>
      <div class="carta-card__body">
        <h3>${c.feira}</h3>
        <p>${c.descricao}</p>
        <span class="carta-card__cta">Ver carta completa →</span>
      </div>
    </a>`
    )
    .join("");
}

function preencherPremios() {
  const grid = document.getElementById("premiosGrid");
  grid.innerHTML = CONFIG.premios
    .map(
      (p) => `
    <article class="premio-card">
      <div class="premio-card__img ${p.imagem ? "" : "premio-card__img--empty"}">
        ${p.imagem ? `<img src="${p.imagem}" alt="${p.titulo}" loading="lazy" onerror="this.parentElement.classList.add('premio-card__img--empty'); this.remove();">` : "Imagem do prêmio"}
      </div>
      <div class="premio-card__body">
        <h3>${p.titulo}</h3>
        <p>${p.descricao}</p>
      </div>
    </article>`
    )
    .join("");
}

function preencherFaq() {
  const list = document.getElementById("faqList");
  list.innerHTML = CONFIG.faq
    .map(
      (item, i) => `
    <div class="faq-item" data-open="false">
      <button class="faq-item__q" data-index="${i}">
        <span>${item.pergunta}</span>
        <span class="faq-item__icon">+</span>
      </button>
      <div class="faq-item__a"><div class="faq-item__a-inner">${item.resposta}</div></div>
    </div>`
    )
    .join("");

  list.querySelectorAll(".faq-item__q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const answer = item.querySelector(".faq-item__a");
      const aberto = item.getAttribute("data-open") === "true";
      item.setAttribute("data-open", String(!aberto));
      answer.style.maxHeight = aberto ? "0px" : answer.scrollHeight + "px";
    });
  });
}

/* ============================================================
   GRADE DE NÚMEROS
   ============================================================ */
function statusDoNumero(numero) {
  const dado = mapaNumeros[formatarNumero(numero)];
  return dado ? dado.status : "disponivel";
}

function renderGrid() {
  const grid = document.getElementById("numerosGrid");
  const inicio = paginaAtual * NUMEROS_POR_PAGINA;
  const fim = Math.min(inicio + NUMEROS_POR_PAGINA, totalNumeros);

  let html = "";
  for (let n = inicio; n < fim; n++) {
    const status = statusDoNumero(n);
    const disabled = status !== "disponivel" ? "disabled" : "";
    html += `<button class="numero-ticket numero-ticket--${status}" data-numero="${n}" ${disabled}>${formatarNumero(n)}</button>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll(".numero-ticket:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalReserva(Number(btn.dataset.numero)));
  });

  renderPaginacao();
}

function renderPaginacao() {
  const el = document.getElementById("rifaPaginacao");
  const inicio = paginaAtual * NUMEROS_POR_PAGINA;
  const fim = Math.min(inicio + NUMEROS_POR_PAGINA, totalNumeros);
  el.innerHTML = `
    <button id="pagAnterior" ${paginaAtual === 0 ? "disabled" : ""}>← Anterior</button>
    <span>${formatarNumero(inicio)} – ${formatarNumero(fim - 1)} · página ${paginaAtual + 1} de ${totalPaginas}</span>
    <button id="pagProxima" ${paginaAtual >= totalPaginas - 1 ? "disabled" : ""}>Próxima →</button>
  `;
  document.getElementById("pagAnterior")?.addEventListener("click", () => {
    paginaAtual = Math.max(0, paginaAtual - 1);
    renderGrid();
    document.getElementById("rifa").scrollIntoView({ block: "start" });
  });
  document.getElementById("pagProxima")?.addEventListener("click", () => {
    paginaAtual = Math.min(totalPaginas - 1, paginaAtual + 1);
    renderGrid();
    document.getElementById("rifa").scrollIntoView({ block: "start" });
  });
}

function irParaNumero(numero) {
  if (Number.isNaN(numero) || numero < 0 || numero >= totalNumeros) return;
  paginaAtual = Math.floor(numero / NUMEROS_POR_PAGINA);
  renderGrid();
  requestAnimationFrame(() => {
    document.querySelector(`.numero-ticket[data-numero="${numero}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

/* ============================================================
   MODAL: RESERVAR NÚMERO
   ============================================================ */
let numeroSelecionado = null;

function abrirModalReserva(numero) {
  numeroSelecionado = numero;
  document.getElementById("modalNumero").textContent = formatarNumero(numero);
  document.getElementById("formReserva").reset();
  document.getElementById("formErro").hidden = true;
  document.getElementById("modalReserva").hidden = false;
  document.getElementById("campoNome").focus();
}

function fecharModalReserva() {
  document.getElementById("modalReserva").hidden = true;
  numeroSelecionado = null;
}

async function confirmarReserva(evento) {
  evento.preventDefault();
  const btn = document.getElementById("btnConfirmarReserva");
  const erroEl = document.getElementById("formErro");
  erroEl.hidden = true;

  const dados = {
    nome: document.getElementById("campoNome").value.trim(),
    whatsapp: document.getElementById("campoWhatsapp").value.trim(),
    cidade: document.getElementById("campoCidade").value.trim(),
    estado: document.getElementById("campoEstado").value.trim().toUpperCase(),
    email: document.getElementById("campoEmail").value.trim(),
  };

  btn.disabled = true;
  btn.textContent = "Reservando...";

  try {
    await reservarNumero(numeroSelecionado, dados);
    fecharModalReserva();
    abrirModalPagamento(numeroSelecionado);
  } catch (err) {
    erroEl.textContent = err.message || "Não foi possível reservar este número. Tente outro.";
    erroEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Reservar número";
  }
}

/* ============================================================
   MODAL: PAGAMENTO
   ============================================================ */
function abrirModalPagamento(numero) {
  document.getElementById("pagamentoNumero").textContent = formatarNumero(numero);
  const mensagem = `Olá! Acabei de reservar o número ${formatarNumero(numero)} da rifa de ${CONFIG.nome} e vou enviar o comprovante do Pix.`;
  document.getElementById("linkWhatsappComprovante").href = linkWhatsapp(mensagem);
  document.getElementById("modalPagamento").hidden = false;
}

function fecharModalPagamento() {
  document.getElementById("modalPagamento").hidden = true;
}

async function copiarChavePix() {
  const btn = document.getElementById("btnCopiarPix");
  try {
    await navigator.clipboard.writeText(CONFIG.pix.chave);
    const textoOriginal = btn.textContent;
    btn.textContent = "Copiado!";
    setTimeout(() => (btn.textContent = textoOriginal), 1800);
  } catch {
    alert("Não foi possível copiar automaticamente. Chave Pix: " + CONFIG.pix.chave);
  }
}

/* ============================================================
   MENU MOBILE
   ============================================================ */
function initMenuMobile() {
  const btn = document.getElementById("menuBtn");
  const nav = document.querySelector(".topbar__nav");
  btn.addEventListener("click", () => {
    const aberto = nav.style.display === "flex";
    nav.style.display = aberto ? "none" : "flex";
    nav.style.flexDirection = "column";
    nav.style.position = "absolute";
    nav.style.top = "100%";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.background = "var(--ink)";
    nav.style.padding = "20px 24px";
    btn.setAttribute("aria-expanded", String(!aberto));
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.style.display = "none";
      btn.setAttribute("aria-expanded", "false");
    })
  );
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
function initEventos() {
  document.getElementById("fecharModalReserva").addEventListener("click", fecharModalReserva);
  document.getElementById("fecharModalPagamento").addEventListener("click", fecharModalPagamento);
  document.getElementById("formReserva").addEventListener("submit", confirmarReserva);
  document.getElementById("btnCopiarPix").addEventListener("click", copiarChavePix);

  document.getElementById("btnBuscarNumero").addEventListener("click", () => {
    irParaNumero(Number(document.getElementById("buscaNumero").value));
  });
  document.getElementById("buscaNumero").addEventListener("keydown", (e) => {
    if (e.key === "Enter") irParaNumero(Number(e.target.value));
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay").forEach((o) => (o.hidden = true));
    }
  });
}

async function init() {
  await aplicarConfigRemota();

  preencherConfigEstatico();
  preencherCartas();
  preencherPremios();
  preencherFaq();
  initMenuMobile();
  initEventos();
  renderGrid();

  // Escuta o Firestore em tempo real e re-renderiza a grade quando algo mudar
  escutarNumeros((mapa) => {
    mapaNumeros = mapa;
    renderGrid();
  });
}

document.addEventListener("DOMContentLoaded", init);
