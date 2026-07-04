# Rifa — Gabriel Zorzetti (FEBIC / FENECIT 2026)

Site estático (HTML5 + CSS3 + JavaScript puro) para divulgar o projeto científico
de Gabriel Zorzetti e vender números de uma rifa que financia sua participação
nas feiras FEBIC e FENECIT 2026. Os dados são armazenados no Firebase Firestore,
e o painel administrativo usa Firebase Authentication. 

Nenhum framework, bundler ou dependência via npm é usado. O Firebase é carregado   
diretamente do CDN oficial do Google (`gstatic.com`) através de `<script type="module">`,
que é a forma padrão de usar o SDK modular do Firebase sem ferramentas de build.

---

## 1. Estrutura de arquivos

```
index.html        → página principal do site
admin.html         → painel administrativo (login + gestão)
style.css          → estilos do site principal
admin.css          → estilos do painel administrativo
script.js          → lógica do site principal
admin.js           → lógica do painel administrativo
firebase.js        → inicialização do Firebase e funções do Firestore/Auth






foram feitas mudanças, misturando,a arquivo, claude e chat gpr
config.js          → TODAS as configurações editáveis (nome, Pix, prêmios, etc.)
assets/
  cartas/           → imagens das cartas de aceite (FEBIC e FENECIT)
  projeto/           → PDFs do projeto científico
  img/               → logotipo, foto de perfil, QR Code do Pix, fotos dos prêmios
```

---

## 2. Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e clique em
   **Adicionar projeto**. Dê um nome (ex: `rifa-gabriel`) e conclua a criação.
2. No menu lateral, vá em **Compilação → Firestore Database** → **Criar banco de dados**.
   - Escolha o modo **produção** (as regras de segurança abaixo cuidam do acesso).
   - Selecione uma região (ex: `southamerica-east1` — mais próxima do Brasil).
3. No menu lateral, vá em **Compilação → Authentication** → **Começar**.
   - Ative o provedor **E-mail/senha**.
   - Em **Users**, clique em **Add user** e crie o e-mail e senha que você (Gabriel) vai
     usar para entrar no painel administrativo (`admin.html`).
4. Volte em **Configurações do projeto** (ícone de engrenagem) → aba **Geral** → role até
   **Seus aplicativos** → clique no ícone `</>` (Web) → registre um app (não precisa marcar
   Firebase Hosting) → copie o objeto `firebaseConfig` que aparece.
5. Cole esse objeto em `firebase.js`, substituindo o bloco marcado com `⚠️ EDITAR`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

### Regras de segurança do Firestore

Em **Firestore Database → Regras**, substitua o conteúdo por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Números da rifa: qualquer visitante pode ler (para ver o status)
    // e criar uma reserva (status "disponivel" -> "reservado").
    // Só um usuário autenticado (o painel admin) pode marcar como vendido
    // ou liberar um número já reservado/vendido.
    match /numeros/{numero} {
      allow read: if true;
      allow create: if request.resource.data.status == "reservado";
      allow update, delete: if request.auth != null;
    }

    // Configuração pública (Pix, valor, prêmios etc.): leitura livre,
    // escrita apenas para o painel admin autenticado.
    match /config/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Clique em **Publicar**.

> Essas regras permitem que qualquer visitante reserve um número (necessário para o
> formulário de compra funcionar sem exigir login), mas só quem faz login no painel
> (`admin.html`) pode confirmar pagamentos, liberar números ou editar as configurações.

---

## 3. Configurar o site (`config.js`)

Abra `config.js` e edite os campos marcados com `⚠️ EDITAR`:

- `rifa.valorPorNumero` — valor de cada número.
- `whatsapp.numero` e `whatsapp.numeroExibicao` — seu WhatsApp para receber comprovantes.
- `pix.qrCodeImagem` — coloque a imagem do seu QR Code em `assets/img/qrcode-pix.png`
  (ou outro nome, ajustando o caminho aqui).
- `imagens.logo`, `imagens.heroFoto`, `imagens.quemSouFoto` — coloque suas imagens em
  `assets/img/` (opcional; se não existirem, o site usa alternativas de texto).
- `premios` — edite título, descrição e imagem de cada prêmio, ou adicione/remova itens.
- `faq` — edite perguntas e respostas, especialmente a data/forma do sorteio.

Esses mesmos campos (Pix, valor, quantidade, WhatsApp e prêmios) também podem ser
editados depois, direto pelo painel administrativo, sem precisar mexer no código —
veja a seção 5.

---

## 4. Testar localmente

Como o site usa `<script type="module">`, é preciso servir os arquivos por HTTP
(abrir o `index.html` direto no navegador com `file://` não funciona). Duas opções simples:

```bash
# Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8000

# ou, com Node instalado
npx serve .
```

Depois acesse `http://localhost:8000`.

---

## 5. Painel administrativo

Acesse `admin.html`, faça login com o e-mail/senha criados no passo 2.3. No painel você pode:

- **Aba Compradores**: ver todos os números reservados/vendidos, buscar por nome, WhatsApp,
  cidade ou número, marcar pagamento como aprovado (o número vira "Vendido") ou liberar um
  número (ele volta a ficar "Disponível" e os dados do comprador são apagados).
- **Aba Configurações**: editar chave Pix, tipo de chave, valor por número, quantidade total
  de números, WhatsApp e a lista de prêmios. Essas alterações são salvas no Firestore e
  aplicadas ao site imediatamente, sem precisar publicar de novo no GitHub Pages.

---

## 6. Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex: `rifa-gabriel`) e envie todos os arquivos deste
   projeto para a branch `main`:

```bash
git init
git add .
git commit -m "Site da rifa"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/rifa-gabriel.git
git push -u origin main
```

2. No GitHub, vá em **Settings → Pages**.
3. Em **Source**, selecione a branch `main` e a pasta `/ (root)`. Clique em **Save**.
4. Após alguns minutos, o site estará disponível em:
   `https://SEU_USUARIO.github.io/rifa-gabriel/`

5. Volte ao Firebase, em **Authentication → Settings → Authorized domains**, e adicione
   esse domínio (`SEU_USUARIO.github.io`) à lista de domínios autorizados — caso contrário
   o login do painel admin não vai funcionar em produção.

---

## 7. Alterar textos e imagens depois de publicado

- **Textos, valores, contatos e prêmios**: edite `config.js` (ou use o painel admin para
  Pix/valor/quantidade/WhatsApp/prêmios) e envie a alteração com `git add . && git commit -m "..." && git push`.
  O GitHub Pages atualiza o site automaticamente em poucos minutos.
- **Imagens** (logo, foto de perfil, fotos dos prêmios, QR Code): substitua os arquivos
  dentro de `assets/img/` mantendo os mesmos nomes usados em `config.js`, ou adicione novos
  arquivos e atualize os caminhos correspondentes em `config.js`.
- **Cartas de aceite**: substitua os arquivos em `assets/cartas/` e ajuste `config.js` se
  mudar o nome dos arquivos.
- **PDF do projeto**: substitua os arquivos em `assets/projeto/`.

---

## 8. Checklist antes de divulgar o link

- [ ] `firebase.js` com o `firebaseConfig` do seu projeto real.
- [ ] Regras de segurança do Firestore publicadas (seção 2).
- [ ] Usuário admin criado no Firebase Authentication.
- [ ] `config.js` com valor por número, WhatsApp e chave Pix conferidos.
- [ ] QR Code do Pix em `assets/img/qrcode-pix.png`.
- [ ] Prêmios preenchidos com descrições reais (não deixe "A definir").
- [ ] Data/forma do sorteio preenchida no FAQ.
- [ ] Testado localmente: reservar um número de teste e confirmar que ele aparece no painel admin.
