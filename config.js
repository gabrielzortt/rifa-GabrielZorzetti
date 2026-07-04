/**
 * config.js
 * ------------------------------------------------------------------
 * PONTO ÚNICO DE CONFIGURAÇÃO DO SITE.
 * Edite apenas este arquivo para atualizar textos, valores, contatos,
 * prêmios e imagens. Nenhum outro arquivo deveria precisar ser tocado
 * para tarefas do dia a dia.
 *
 * Tudo marcado com "⚠️ EDITAR" é um valor de exemplo/placeholder que
 * você deve substituir pelo dado real antes de publicar o site.
 * ------------------------------------------------------------------
 */

const CONFIG = {

  // ============ IDENTIDADE ============
  nome: "Gabriel Zorzetti",
  instituicao: "Fundação Matias Machline",
  cidade: "Manaus - AM",

  // ============ RIFA ============
  rifa: {
    quantidadeNumeros: 3000,        // total de números da rifa (0000 a 2999)
    valorPorNumero: 10.00,          // valor em reais de cada número
    digitosNumero: 4,               // quantidade de dígitos exibidos (ex: 0001)
  },

  // ============ CONTATO ============
  whatsapp: {
    numero: "5592994274276",        // formato internacional, só números (55 + DDD + número)
    numeroExibicao: "(92) 99427-4276",
  },

  // ============ PAGAMENTO (PIX) ============
  pix: {
    chave: "020.267.282-40",        // chave Pix (CPF)
    tipoChave: "CPF",
    nomeRecebedor: "Gabriel Santos Zorzetti", // ⚠️ EDITAR se o nome cadastrado no Pix for diferente
    qrCodeImagem: "assets/img/qrcode-pix.png", // ⚠️ EDITAR — coloque a imagem do seu QR Code aqui
  },

  // ============ IMAGENS ============
  imagens: {
    logo: "assets/img/logo.png",              // ⚠️ EDITAR — logotipo (opcional, há um texto de reserva caso não exista)
    heroFoto: "assets/img/hero.jpg",           // ⚠️ EDITAR — foto para a seção inicial (opcional)
    quemSouFoto: "assets/img/perfil.jpg",      // ⚠️ EDITAR — foto de perfil para a seção "Quem sou"
  },

  // ============ CARTAS DE ACEITE ============
  cartas: [
    {
      feira: "FEBIC 2026",
      descricao: "Feira Brasileira de Iniciação Científica — Joinville, SC",
      imagem: "assets/cartas/carta-febic.jpg",
    },
    {
      feira: "FENECIT 2026",
      descricao: "Feira Nordestina de Ciências e Tecnologia — Recife, PE",
      imagem: "assets/cartas/carta-fenecit.jpg",
    },
  ],

  // ============ PROJETO CIENTÍFICO ============
  projeto: {
    titulo: "Altas Habilidades e Superdotação: Desafios Educacionais para o Desenvolvimento Acadêmico no Ensino Formal",
    categoria: "Ciências Humanas — Educação",
    autores: ["Pedro Henrique Nascimento Pereira", "Gabriel Santos Zorzetti"],
    orientador: "Emerson Leão Brito do Nascimento",
    instituicao: "Fundação Matias Machline",
    pdfResumo: "assets/projeto/sobre-o-projeto.pdf",
    pdfCompleto: "assets/projeto/artigo-completo.pdf",
  },

  // ============ PRÊMIOS ============
  // Edite, adicione ou remova itens livremente — os cards se ajustam automaticamente.
  premios: [
    {
      titulo: "Perfume Yara Candy — Lattafa (50ml)",
      descricao: "Eau de Parfum feminino da linha Yara, da Lattafa, com saída cítrica de groselha preta e tangerina verde, coração adocicado de morango e gardênia, e fundo de baunilha, âmbar, almíscar e madeira de sândalo.",
      imagem: "assets/img/premio-perfume.jpg",
    },
    {
      titulo: "Óculos esportivo — lente vermelha espelhada",
      descricao: "Óculos de sol modelo esportivo, armação leve e lentes espelhadas em tom vermelho/dourado, ideal para ciclismo, corrida e uso no dia a dia.",
      imagem: "assets/img/premio-oculos-vermelho.jpg",
    },
    {
      titulo: "Óculos esportivo — lente azul espelhada",
      descricao: "Óculos de sol modelo esportivo, armação leve e lentes espelhadas em tom azul, ideal para ciclismo, corrida e uso no dia a dia.",
      imagem: "assets/img/premio-oculos-azul.jpg",
    },
  ],

  // ============ FAQ ============
  faq: [
    {
      pergunta: "Para que serve a arrecadação desta rifa?",
      resposta: "A arrecadação é destinada exclusivamente aos custos da minha participação nas feiras científicas FEBIC e FENECIT: transporte, hospedagem e taxa de inscrição. O projeto científico já está pronto e aprovado — a rifa não financia a pesquisa, apenas a viagem."
    },
    {
      pergunta: "Como sei que meu número foi confirmado?",
      resposta: "Depois de escolher um número e enviar o comprovante do Pix pelo WhatsApp, o pagamento é conferido manualmente e o número passa para o status \"Vendido\". Você pode conferir o status do seu número a qualquer momento nesta página."
    },
    {
      pergunta: "Posso comprar mais de um número?",
      resposta: "Sim. Basta repetir o processo de escolha e reserva para cada número desejado."
    },
    {
      pergunta: "Como e quando será feito o sorteio?",
      resposta: "⚠️ EDITAR — descreva aqui a data prevista e o método do sorteio (ex: Loteria Federal, live no Instagram, etc.)."
    },
    {
      pergunta: "O que acontece se eu reservar um número e não pagar?",
      resposta: "Números reservados sem confirmação de pagamento em um prazo determinado voltam a ficar disponíveis para outros compradores."
    },
  ],

  // ============ RODAPÉ ============
  rodape: {
    textoDireitos: `© ${new Date().getFullYear()} Gabriel Zorzetti. Todos os direitos reservados.`,
  },
};

export default CONFIG;
