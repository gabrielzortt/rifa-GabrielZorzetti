/**
 * firebase.js
 * ------------------------------------------------------------------
 * Inicialização do Firebase (Firestore + Authentication) e funções
 * auxiliares usadas por script.js e admin.js.
 *
 * ⚠️ EDITAR: substitua firebaseConfig pelos dados do SEU projeto
 * Firebase (Configurações do projeto > Geral > Seus apps > SDK).
 *
 * Este projeto usa o SDK modular do Firebase carregado direto do
 * CDN oficial da Google (gstatic.com) via <script type="module">.
 * Isso NÃO é um framework nem uma dependência de build — é a forma
 * padrão de usar Firebase em um site 100% estático, sem npm/bundler.
 * ------------------------------------------------------------------
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ⚠️ EDITAR — cole aqui a configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDLCuS0-Z0B3USg-INSXyk3p8te4wFHCD0",
  authDomain: "rifa-gabriel.firebaseapp.com",
  projectId: "rifa-gabriel",
  storageBucket: "rifa-gabriel.firebasestorage.app",
  messagingSenderId: "473092092450",
  appId: "1:473092092450:web:c0a3fea15ea9c98d6f907b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Estrutura do Firestore usada por este site:
 *
 * numeros/{numero}            -> documento por número da rifa
 *    numero: number
 *    status: "disponivel" | "reservado" | "vendido"
 *    nome, whatsapp, cidade, estado, email: string
 *    criadoEm: timestamp
 *    atualizadoEm: timestamp
 *
 * config/geral                -> configuração editável pelo painel admin
 *    pix, valor, quantidade, whatsapp, premios: (espelha config.js;
 *    opcional — só é necessário se você quiser editar pelo painel
 *    em vez de editar config.js diretamente)
 */

// ---------- NÚMEROS DA RIFA ----------

/** Escuta em tempo real todos os números e chama callback(mapaDeNumeros) a cada mudança. */
function escutarNumeros(callback) {
  const ref = collection(db, "numeros");
  return onSnapshot(ref, (snapshot) => {
    const mapa = {};
    snapshot.forEach((docSnap) => {
      mapa[docSnap.id] = docSnap.data();
    });
    callback(mapa);
  });
}

/** Busca um único número. */
async function buscarNumero(numero) {
  const ref = doc(db, "numeros", String(numero));
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/** Reserva um número (cria/atualiza o documento com os dados do comprador). */
async function reservarNumero(numero, dadosComprador) {
  const ref = doc(db, "numeros", String(numero));
  const atual = await getDoc(ref);

  if (atual.exists() && atual.data().status !== "disponivel") {
    throw new Error("Este número não está mais disponível.");
  }

  await setDoc(ref, {
    numero: Number(numero),
    status: "reservado",
    nome: dadosComprador.nome,
    whatsapp: dadosComprador.whatsapp,
    cidade: dadosComprador.cidade,
    estado: dadosComprador.estado,
    email: dadosComprador.email || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
}

/** Reserva vários números de uma vez, com um Pix único para o total.
 *  Todos os números recebem o mesmo grupoId, para o painel admin poder
 *  confirmar o pagamento de todos juntos com um clique. */
async function reservarNumeros(numeros, dadosComprador) {
  // Confere disponibilidade de todos antes de gravar qualquer coisa
  for (const numero of numeros) {
    const ref = doc(db, "numeros", String(numero));
    const atual = await getDoc(ref);
    if (atual.exists() && atual.data().status !== "disponivel") {
      throw new Error(`O número ${numero} não está mais disponível. Atualize a página e escolha outro.`);
    }
  }

  const grupoId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const batch = writeBatch(db);

  numeros.forEach((numero) => {
    const ref = doc(db, "numeros", String(numero));
    batch.set(ref, {
      numero: Number(numero),
      status: "reservado",
      grupoId,
      nome: dadosComprador.nome,
      whatsapp: dadosComprador.whatsapp,
      cidade: dadosComprador.cidade,
      estado: dadosComprador.estado,
      email: dadosComprador.email || "",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
  });

  await batch.commit();
  return grupoId;
}

/** Painel admin: marca todos os números de um mesmo grupo (mesmo checkout) como vendidos de uma vez. */
async function marcarGrupoComoVendido(grupoId, numeros) {
  const batch = writeBatch(db);
  numeros.forEach((numero) => {
    const ref = doc(db, "numeros", String(numero));
    batch.update(ref, { status: "vendido", atualizadoEm: serverTimestamp() });
  });
  await batch.commit();
}

/** Painel admin: marca um número como vendido (pagamento aprovado). */
async function marcarComoVendido(numero) {
  const ref = doc(db, "numeros", String(numero));
  await updateDoc(ref, { status: "vendido", atualizadoEm: serverTimestamp() });
}

/** Painel admin: marca um número reservado/vendido como disponível novamente. */
async function liberarNumero(numero) {
  const ref = doc(db, "numeros", String(numero));
  await setDoc(ref, {
    numero: Number(numero),
    status: "disponivel",
    nome: "",
    whatsapp: "",
    cidade: "",
    estado: "",
    email: "",
    atualizadoEm: serverTimestamp(),
  });
}

/** Painel admin: lista todos os compradores (números reservados ou vendidos). */
async function listarCompradores() {
  const ref = collection(db, "numeros");
  const snap = await getDocs(ref);
  const resultado = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.status !== "disponivel") resultado.push(data);
  });
  return resultado.sort((a, b) => a.numero - b.numero);
}

// ---------- CONFIGURAÇÃO EDITÁVEL PELO PAINEL ADMIN ----------
// Guarda em Firestore (coleção "config", documento "geral") os campos que o
// painel admin permite editar sem precisar mexer em config.js: pix, valor,
// quantidade, whatsapp e prêmios. Se o documento não existir, o site usa os
// valores padrão definidos em config.js.

async function buscarConfigRemota() {
  const ref = doc(db, "config", "geral");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

async function salvarConfigRemota(dados) {
  const ref = doc(db, "config", "geral");
  await setDoc(ref, { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
}

// ---------- SORTEIO ----------
// Guarda o resultado do sorteio em config/sorteio. Enquanto esse documento
// não existir (ou tiver realizado: false), o site funciona normalmente.
// Depois de realizado, o site mostra o popup de ganhadores e trava a compra
// de novos números — sem precisar tirar o site do ar.

const PREMIOS_SORTEIO = [
  { id: "perfume", nome: "Perfume Yara Candy (Lattafa, 30ml)" },
  { id: "oculos-vermelho", nome: "Óculos esportivo — lente vermelha" },
  { id: "oculos-azul", nome: "Óculos esportivo — lente azul" },
];

/** Busca o resultado do sorteio, se já tiver sido realizado. */
async function buscarSorteio() {
  const ref = doc(db, "config", "sorteio");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/** Painel admin: sorteia 3 números vendidos de verdade (lidos agora do Firestore),
 *  distribui os 3 prêmios aleatoriamente entre eles, salva o resultado e passa
 *  a bloquear novas compras no site. */
async function realizarSorteio() {
  const ref = collection(db, "numeros");
  const snap = await getDocs(ref);
  const vendidos = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.status === "vendido") vendidos.push(data);
  });

  if (vendidos.length < 3) {
    throw new Error(`Só há ${vendidos.length} número(s) vendido(s) — é preciso ter pelo menos 3 para sortear.`);
  }

  // Embaralha os vendidos e pega os 3 primeiros (sorteio justo, sem viés)
  const embaralhados = [...vendidos].sort(() => Math.random() - 0.5);
  const sorteados = embaralhados.slice(0, 3);

  // Embaralha os prêmios também, pra distribuição não seguir nenhuma ordem fixa
  const premiosEmbaralhados = [...PREMIOS_SORTEIO].sort(() => Math.random() - 0.5);

  const vencedores = sorteados.map((comprador, i) => ({
    numero: comprador.numero,
    nome: comprador.nome,
    whatsapp: comprador.whatsapp,
    premioId: premiosEmbaralhados[i].id,
    premioNome: premiosEmbaralhados[i].nome,
  }));

  const sorteioRef = doc(db, "config", "sorteio");
  await setDoc(sorteioRef, {
    realizado: true,
    vencedores,
    dataSorteio: serverTimestamp(),
  });

  return vencedores;
}

/** Painel admin: corrige o texto de um prêmio já sorteado (ex: erro de digitação),
 *  sem sortear de novo — mantém os mesmos 3 números ganhadores. */
async function atualizarVencedores(vencedores) {
  const ref = doc(db, "config", "sorteio");
  await setDoc(ref, { vencedores }, { merge: true });
}

/** Painel admin: desfaz o sorteio (volta a liberar a compra de números). Usar só em caso de engano. */
async function reabrirVendas() {
  const ref = doc(db, "config", "sorteio");
  await setDoc(ref, { realizado: false }, { merge: true });
}

// ---------- AUTENTICAÇÃO (PAINEL ADMIN) ----------

function loginAdmin(email, senha) {
  return signInWithEmailAndPassword(auth, email, senha);
}

function logoutAdmin() {
  return signOut(auth);
}

function observarAutenticacao(callback) {
  return onAuthStateChanged(auth, callback);
}

export {
  db,
  auth,
  escutarNumeros,
  buscarNumero,
  reservarNumero,
  reservarNumeros,
  marcarComoVendido,
  marcarGrupoComoVendido,
  liberarNumero,
  listarCompradores,
  buscarConfigRemota,
  salvarConfigRemota,
  buscarSorteio,
  realizarSorteio,
  atualizarVencedores,
  reabrirVendas,
  loginAdmin,
  logoutAdmin,
  observarAutenticacao,
};
