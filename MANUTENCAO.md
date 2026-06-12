# VISA Careiro — Guia de Manutenção

Sistema de Cadastro Sanitário Municipal de Careiro, AM.  
Desenvolvido por **Darlan Cardoso**.

---

## 📁 Estrutura de Arquivos

```
visa-careiro/
│
├── index.html                  ← Página principal (HTML + imports)
├── firebase-config.js          ← Credenciais Firebase (não versionar!)
├── changelog.js                ← Log de versões (não modificar)
├── termo-de-uso.html           ← Página de termos
├── politica-de-privacidade.html← Página de política
├── imag01.jpeg                 ← Logo do sistema
│
├── css/
│   ├── variables.css           ← Cores, sombras, raios — edite aqui primeiro
│   ├── layout.css              ← Sidebar, topbar, grid principal
│   ├── components.css          ← Botões, tabela, modais, formulários, badges
│   └── pages.css               ← Estilos de páginas específicas (dashboard,
│                                  cronograma, legislação, login, impressão)
│
└── js/
    ├── state.js                ← Estado global, cache Firebase, getters/setters
    ├── utils.js                ← Funções puras: formatação, badges, toast, paginação
    ├── auth.js                 ← Login, logout, termos, troca de senha
    ├── estabelecimentos.js     ← Tabela, filtros, CRUD, validação CPF/CNPJ
    ├── pages.js                ← Dashboard, cronograma, legislação, config, backup
    └── app.js                  ← Boot, navegação, init, DOMContentLoaded
```

---

## 🔧 Tarefas Comuns de Manutenção

### Alterar cores do sistema
Abra **`css/variables.css`** e edite as variáveis CSS:
```css
--rosa-dark: #f48aab;   /* cor principal (botões, badges, topbar) */
--bg: #f5e8ef;          /* fundo geral */
--text: #2d1b24;        /* texto principal */
```

---

### Alterar o prazo de validade da fiscalização
Por padrão, um estabelecimento é considerado "Fiscalizado" se a data da última fiscalização for há **menos de 4 meses**.

Abra **`js/utils.js`** e altere a constante:
```js
const MESES_VALIDADE_FISCALIZACAO = 4; // ← altere aqui
```

---

### Adicionar ou remover campos do formulário de estabelecimento
1. Abra **`index.html`** e localize o modal `#modalEstab`
2. Adicione o campo HTML desejado (input, select etc.)
3. Abra **`js/estabelecimentos.js`** e atualize as funções:
   - `openEdit(id)` — para preencher o campo na edição
   - `clearEstabForm()` — para limpar o campo ao abrir o modal
   - `saveEstab()` — para ler e validar o novo campo antes de salvar
   - `openDetail(id)` — para exibir o campo no modal de detalhe

---

### Adicionar uma nova página / seção ao menu
1. No **`index.html`**, adicione o botão na sidebar:
```html
<button class="nav-item" data-page="minha-pagina" onclick="navigateTo('minha-pagina')">
    <span class="icon">🆕</span> Minha Página
</button>
```
2. Adicione o bloco HTML da página:
```html
<div class="page" id="page-minha-pagina">
    <!-- conteúdo aqui -->
</div>
```
3. Em **`js/app.js`**, dentro de `navigateTo()`, adicione o título e a chamada de render:
```js
const titles = {
    ...
    'minha-pagina': '🆕 Minha Página'
};
// E no bloco de renderização:
if (page === 'minha-pagina') renderMinhaPagina();
```
4. Crie a função `renderMinhaPagina()` em **`js/pages.js`**.

---

### Alterar o Firebase (trocar de projeto)
Abra **`firebase-config.js`** e substitua as credenciais:
```js
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    ...
};
```
> ⚠️ **Nunca versione este arquivo com credenciais reais.** Adicione-o ao `.gitignore`.

---

### Alterar lista padrão de localidades (bairros)
As localidades padrão ficam em **`js/state.js`**, na propriedade `bairros` do objeto `_fbCache`.  
Ao fazer login pela primeira vez, elas são carregadas do Firestore (se existirem).  
Para alterar o padrão de fábrica (quando não há dados no Firestore):
```js
bairros: [
    'CENTRO', 'BAIRRO NOVO', // ← edite esta lista
    ...
],
```

---

### Alterar textos da impressão (cabeçalho, assinaturas)
Abra **`js/pages.js`** e localize as funções:
- `imprimirEstabelecimentos()` — impressão da lista
- `imprimirCronograma()` — impressão do cronograma

Procure os trechos com `"Prefeitura Municipal de Careiro"` ou `"VISA Careiro"` para alterar cabeçalhos.  
As linhas de assinatura usam o nome do usuário logado (`_currentUser?.profile?.nome`).

---

## 🗂️ Ordem de Carregamento dos Scripts

A ordem no `index.html` é **obrigatória**. Não altere:

```
1. state.js           → define variáveis globais e cache
2. utils.js           → funções puras que não dependem de nada
3. auth.js            → usa _STATE_REF, _USERS_REF (do firebase-config)
4. estabelecimentos.js→ usa DADOS, filtros, getters do state
5. pages.js           → usa tudo acima
6. app.js             → inicializa o sistema, chama boot()
```

---

## 🔥 Coleções Firestore

| Referência JS       | Coleção / Documento Firestore     | Conteúdo                               |
|---------------------|-----------------------------------|----------------------------------------|
| `_STATE_REF`        | `state/main`                      | Config, bairros, cronograma, etc.      |
| `_BASE_REF`         | `dados/base`                      | Lista de estabelecimentos ativos       |
| `_INATIVOS_REF`     | `dados/inativos`                  | Lista de estabelecimentos inativos     |
| `_USERS_REF`        | coleção `users`                   | Usuários e senhas do sistema           |

> As referências acima são definidas em **`firebase-config.js`**.

---

## 🚀 Deploy

O sistema é um SPA estático (HTML + CSS + JS puro).  
Pode ser hospedado em:
- **Firebase Hosting** — `firebase deploy`
- **GitHub Pages**
- **Netlify / Vercel** — arraste a pasta `visa-careiro/`
- Qualquer servidor web que sirva arquivos estáticos

---

## 📦 Dependências Externas

| Biblioteca              | Versão | Fonte                                      |
|-------------------------|--------|--------------------------------------------|
| Firebase App (compat)   | 9.6.0  | `gstatic.com/firebasejs`                   |
| Firebase Firestore      | 9.6.0  | `gstatic.com/firebasejs`                   |
| Firebase Auth           | 9.6.0  | `gstatic.com/firebasejs`                   |
| Playfair Display (fonte)| —      | Google Fonts                               |
| DM Sans (fonte)         | —      | Google Fonts                               |

Sem frameworks JS (React, Vue etc.). Sem bundler. Sem dependências npm.

---

## 🔐 Segurança

- Senhas são armazenadas em texto no Firestore (sistema interno).  
  Para ambientes mais críticos, migre para Firebase Authentication.
- O arquivo `firebase-config.js` contém chaves de API — nunca exponha publicamente.
- As regras do Firestore devem restringir acesso somente a usuários autenticados.

---

*Última atualização da estrutura modular: Junho/2026*
