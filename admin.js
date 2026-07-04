import CONFIG from "./config.js";
import {
  observarAutenticacao,
  loginAdmin,
  logoutAdmin,
  listarCompradores,
  marcarComoVendido,
  marcarGrupoComoVendido,
  liberarNumero,
  buscarConfigRemota,
  salvarConfigRemota,
} from "./firebase.js";

let compradoresCache = [];

/* ============================================================
   LOGIN / LOGOUT
   ============================================================ */
function initAuth() {
  console.log("[DIAG] initAuth() chamado — registrando observador de autenticação...");

  observarAutenticacao((user) => {
  console.log("[DIAG] observarAutenticacao disparou. Usuário:", user ? user.email : "nenhum (deslogado)");

  const login = document.getElementById("loginScreen");
  const painel = document.getElementById("adminScreen");

  if (user) {
    login.style.display = "none";
    painel.style.display = "block";
    painel.hidden = false;

    window.scrollTo(0, 0);

    console.log("[DIAG] Usuário autenticado, chamando initPainel()...");
    initPainel().catch((err) =>
      console.error("[DIAG] ERRO dentro de initPainel():", err)
    );
  } else {
    login.style.display = "flex";
    painel.style.display = "none";
    painel.hidden = true;
  }
});
  document.getElementById("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[DIAG] Formulário de login enviado.");
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;
    const erroEl = document.getElementById("loginErro");
    erroEl.hidden = true;
    try {
      console.log("[DIAG] Chamando loginAdmin()...");
      const resultado = await loginAdmin(email, senha);
      console.log("[DIAG] loginAdmin() retornou com sucesso:", resultado.user.email);
    } catch (err) {
      console.error("[DIAG] loginAdmin() lançou erro:", err.code, err.message);
      erroEl.textContent = "E-mail ou senha inválidos.";
      erroEl.hidden = false;
    }
  });

  document.getElementById("btnLogout").addEventListener("click", () => logoutAdmin());
}

/* ============================================================
   ABAS
   ============================================================ */
function initTabs() {
  document.querySelectorAll(".admin__tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin__tab").forEach((t) => t.setAttribute("aria-current", "false"));
      tab.setAttribute("aria-current", "true");
      const alvo = tab.dataset.tab;
      document.getElementById("painelCompradores").hidden = alvo !== "compradores";
      document.getElementById("painelConfig").hidden = alvo !== "config";
    });
  });
}

/* ============================================================
   COMPRADORES
   ============================================================ */
function formatarNumero(n) {
  return String(n).padStart(CONFIG.rifa.digitosNumero, "0");
}
function formatarMoeda(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function carregarCompradores() {
  const tbody = document.getElementById("tabelaCompradores");
  tbody.innerHTML = `<tr><td colspan="7" class="admin__vazio">Carregando...</td></tr>`;
  try {
    compradoresCache = await listarCompradores();
    console.log("[DIAG] listarCompradores() OK, total:", compradoresCache.length);
  } catch (err) {
    console.error("[DIAG] ERRO em listarCompradores() — provavelmente regras de segurança do Firestore:", err.code, err.message);
    tbody.innerHTML = `<tr><td colspan="7" class="admin__vazio">Erro ao carregar: ${err.message}</td></tr>`;
    throw err;
  }
  renderTabela();
  renderStats();
}

function renderStats() {
  const reservados = compradoresCache.filter((c) => c.status === "reservado").length;
  const vendidos = compradoresCache.filter((c) => c.status === "vendido").length;
  const disponiveis = CONFIG.rifa.quantidadeNumeros - reservados - vendidos;
  const arrecadado = vendidos * CONFIG.rifa.valorPorNumero;

  document.getElementById("statDisponiveis").textContent = disponiveis;
  document.getElementById("statReservados").textContent = reservados;
  document.getElementById("statVendidos").textContent = vendidos;
  document.getElementById("statArrecadado").textContent = formatarMoeda(arrecadado);
}

function renderTabela() {
  const textoFiltro = document.getElementById("filtroTexto").value.trim().toLowerCase();
  const numeroFiltro = document.getElementById("filtroNumero").value.trim();
  const somentePendentes = document.getElementById("filtroPendentes").checked;

  let lista = [...compradoresCache].sort((a, b) => {
    if (a.status !== b.status) return a.status === "reservado" ? -1 : 1;
    return a.numero - b.numero;
  });

  if (somentePendentes) {
    lista = lista.filter((c) => c.status === "reservado");
  }
  if (textoFiltro) {
    lista = lista.filter(
      (c) =>
        (c.nome || "").toLowerCase().includes(textoFiltro) ||
        (c.whatsapp || "").toLowerCase().includes(textoFiltro) ||
        (c.cidade || "").toLowerCase().includes(textoFiltro)
    );
  }
  if (numeroFiltro !== "") {
    lista = lista.filter((c) => String(c.numero) === String(Number(numeroFiltro)));
  }

const tbody = document.getElementById("tabelaCompradores");
  if (!lista.length) {
    tbody.innerHTML = somentePendentes
      ? `<tr><td colspan="7" class="admin__vazio">Nenhum pagamento pendente de confirmação. 🎉</td></tr>`
      : `<tr><td colspan="7" class="admin__vazio">Nenhum comprador encontrado.</td></tr>`;
    return;
  }

  // Agrupa números reservados que pertencem à mesma compra (mesmo grupoId)
  const numerosPorGrupo = {};
  compradoresCache.forEach((c) => {
    if (c.status === "reservado" && c.grupoId) {
      (numerosPorGrupo[c.grupoId] ||= []).push(c.numero);
    }
  });

  tbody.innerHTML = lista
    .map((c) => {
      const grupo = c.grupoId ? numerosPorGrupo[c.grupoId] : null;
      const ehGrupo = grupo && grupo.length > 1;
      const acaoVender =
        c.status === "reservado"
          ? ehGrupo
            ? `<button class="btn btn--solid btn--sm" data-acao="vender-grupo" data-grupo="${c.grupoId}">Marcar pago (${grupo.length} números)</button>`
            : `<button class="btn btn--solid btn--sm" data-acao="vender" data-numero="${c.numero}">Marcar pago</button>`
          : "";
      return `
    <tr>
      <td>${formatarNumero(c.numero)}${ehGrupo ? ` <span class="grupo-tag" title="Comprados juntos: ${grupo.map(formatarNumero).join(', ')}">grupo</span>` : ""}</td>
      <td><span class="status-badge status-badge--${c.status}">${c.status === "vendido" ? "Vendido" : "Reservado"}</span></td>
      <td>${c.nome || "—"}</td>
      <td>${c.whatsapp || "—"}</td>
      <td>${[c.cidade, c.estado].filter(Boolean).join(" / ") || "—"}</td>
      <td>${c.email || "—"}</td>
      <td class="acoes">
        ${acaoVender}
        <button class="btn btn--outline btn--sm" data-acao="liberar" data-numero="${c.numero}">Liberar</button>
      </td>
    </tr>`;
    })
    .join("");

  tbody.querySelectorAll("[data-acao]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const acao = btn.dataset.acao;
      if (acao === "vender") {
        const numero = Number(btn.dataset.numero);
        confirmarAcao(`Marcar o número ${formatarNumero(numero)} como vendido (pagamento aprovado)?`, async () => {
          await marcarComoVendido(numero);
          await carregarCompradores();
        });
      } else if (acao === "vender-grupo") {
        const grupoId = btn.dataset.grupo;
        const numeros = numerosPorGrupo[grupoId] || [];
        confirmarAcao(
          `Marcar os números ${numeros.map(formatarNumero).join(", ")} como vendidos (pagamento único aprovado)?`,
          async () => {
            await marcarGrupoComoVendido(grupoId, numeros);
            await carregarCompradores();
          }
        );
      } else {
        const numero = Number(btn.dataset.numero);
        confirmarAcao(`Liberar o número ${formatarNumero(numero)}? Ele voltará a ficar disponível e os dados do comprador serão apagados.`, async () => {
          await liberarNumero(numero);
          await carregarCompradores();
        });
      }
    });
  });
}

/* ============================================================
   MODAL DE CONFIRMAÇÃO
   ============================================================ */
function confirmarAcao(texto, aoConfirmar) {
  const overlay = document.getElementById("modalConfirm");
  document.getElementById("modalConfirmTexto").textContent = texto;
  overlay.hidden = false;

  const btnOk = document.getElementById("modalConfirmOk");
  const btnCancelar = document.getElementById("modalConfirmCancelar");

  const limpar = () => {
    overlay.hidden = true;
    btnOk.replaceWith(btnOk.cloneNode(true));
    btnCancelar.replaceWith(btnCancelar.cloneNode(true));
  };

  document.getElementById("modalConfirmOk").addEventListener("click", async () => {
    limpar();
    await aoConfirmar();
  });
  document.getElementById("modalConfirmCancelar").addEventListener("click", limpar);
}

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */
let premiosEditados = [];

function renderPremiosForm() {
  const wrap = document.getElementById("cfgPremiosList");
  wrap.innerHTML = premiosEditados
    .map(
      (p, i) => `
    <div class="config-premio-row">
      <input type="text" placeholder="Título" value="${p.titulo || ""}" data-campo="titulo" data-index="${i}">
      <input type="text" placeholder="Descrição" value="${p.descricao || ""}" data-campo="descricao" data-index="${i}">
      <button type="button" data-remover="${i}" aria-label="Remover prêmio">×</button>
    </div>`
    )
    .join("");

  wrap.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      const i = Number(input.dataset.index);
      premiosEditados[i][input.dataset.campo] = input.value;
    });
  });
  wrap.querySelectorAll("[data-remover]").forEach((btn) => {
    btn.addEventListener("click", () => {
      premiosEditados.splice(Number(btn.dataset.remover), 1);
      renderPremiosForm();
    });
  });
}

async function initConfigForm() {
  const remota = (await buscarConfigRemota()) || {};

  document.getElementById("cfgPixChave").value = remota.pixChave || CONFIG.pix.chave;
  document.getElementById("cfgPixTipo").value = remota.pixTipo || CONFIG.pix.tipoChave;
  document.getElementById("cfgValor").value = remota.valorPorNumero ?? CONFIG.rifa.valorPorNumero;
  document.getElementById("cfgQuantidade").value = remota.quantidadeNumeros ?? CONFIG.rifa.quantidadeNumeros;
  document.getElementById("cfgWhatsappNumero").value = remota.whatsappNumero || CONFIG.whatsapp.numero;
  document.getElementById("cfgWhatsappExibicao").value = remota.whatsappExibicao || CONFIG.whatsapp.numeroExibicao;

  premiosEditados = JSON.parse(JSON.stringify(remota.premios && remota.premios.length ? remota.premios : CONFIG.premios));
  renderPremiosForm();

  document.getElementById("btnAddPremio").addEventListener("click", () => {
    premiosEditados.push({ titulo: "", descricao: "", imagem: "" });
    renderPremiosForm();
  });

  document.getElementById("formConfig").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("configMsg");
    msg.hidden = true;
    msg.className = "config-form__msg";

    try {
      await salvarConfigRemota({
        pixChave: document.getElementById("cfgPixChave").value.trim(),
        pixTipo: document.getElementById("cfgPixTipo").value,
        valorPorNumero: Number(document.getElementById("cfgValor").value),
        quantidadeNumeros: Number(document.getElementById("cfgQuantidade").value),
        whatsappNumero: document.getElementById("cfgWhatsappNumero").value.trim(),
        whatsappExibicao: document.getElementById("cfgWhatsappExibicao").value.trim(),
        premios: premiosEditados.filter((p) => p.titulo || p.descricao),
      });
      msg.textContent = "Configurações salvas. O site já reflete os novos valores.";
      msg.classList.add("config-form__msg--ok");
      msg.hidden = false;
    } catch (err) {
      msg.textContent = "Não foi possível salvar. Verifique sua conexão e tente novamente.";
      msg.classList.add("config-form__msg--erro");
      msg.hidden = false;
    }
  });
}

/* ============================================================
   INICIALIZAÇÃO DO PAINEL (pós-login)
   ============================================================ */
let painelIniciado = false;

async function initPainel() {
  console.log("[DIAG] initPainel() iniciou. painelIniciado =", painelIniciado);
  if (painelIniciado) {
    console.log("[DIAG] Painel já tinha sido iniciado antes, ignorando.");
    return;
  }
  painelIniciado = true;

  initTabs();
  console.log("[DIAG] Abas iniciadas. Carregando compradores...");
  await carregarCompradores();
  console.log("[DIAG] Compradores carregados. Carregando formulário de configuração...");
  await initConfigForm();
  console.log("[DIAG] initPainel() concluído com sucesso.");

  document.getElementById("filtroTexto").addEventListener("input", renderTabela);
  document.getElementById("filtroNumero").addEventListener("input", renderTabela);
  document.getElementById("filtroPendentes").addEventListener("change", renderTabela);
  document.getElementById("btnRecarregar").addEventListener("click", carregarCompradores);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[DIAG] admin.js carregado, DOM pronto. Chamando initAuth()...");
  initAuth();
});
