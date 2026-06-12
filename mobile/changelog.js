/**
 * changelog.js — VISA Careiro
 * Exibe modal de novidades ao usuário na primeira visita de cada versão.
 * Para forçar reexibição, basta incrementar CURRENT_VERSION.
 */

const CURRENT_VERSION = '1.0.3';
const STORAGE_KEY = 'visa_careiro_changelog_seen';

const CHANGELOG = {
  version: CURRENT_VERSION,
  title: 'Novidades da Versão',
  date: 'Abril de 2026',
  items: [
    { icon: '📅', text: 'Adicionada aba de <strong>Cronograma Mensal</strong>' },
    { icon: '⚖️', text: 'Adicionada aba de <strong>Legislação</strong>' },
    { icon: '🔍', text: 'Adicionada aba de <strong>Fiscalização</strong>' },
    { icon: '🪪', text: 'Adicionado campo de <strong>CPF/CNPJ</strong> e <strong>Licenciamento</strong>' },
    { icon: '📄', text: 'Adicionados <strong>Termos de Uso</strong> e <strong>Política de Privacidade</strong>' },
    { icon: '🔄', text: 'Substituição da data de <strong>licenciamento</strong> por <strong>fiscalização</strong>' },
    { icon: '✏️', text: "Campo <em>Razão Social</em> renomeado para <strong>Razão Social e Proprietário</strong>" },
    { icon: '📆', text: 'Adicionado <strong>filtro de data por mês</strong> em Estabelecimentos' },
    { icon: '📱', text: 'Interface adaptada para <strong>versão mobile</strong>' },
    { icon: '⚙️', text: 'Demais <strong>otimizações</strong> de desempenho e usabilidade' },
  ]
};

function injectChangelogStyles() {
  if (document.getElementById('changelog-styles')) return;
  const style = document.createElement('style');
  style.id = 'changelog-styles';
  style.textContent = `
    #changelog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(45, 27, 36, 0.55);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: cl-fade-in 0.25s ease;
      padding: 16px;
    }

    @keyframes cl-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes cl-slide-up {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }

    #changelog-modal {
      background: #fff;
      border-radius: 20px;
      padding: 32px 28px 24px;
      max-width: 480px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(45, 27, 36, 0.22), 0 4px 16px rgba(244, 138, 171, 0.18);
      animation: cl-slide-up 0.3s ease;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: #f9b8c8 transparent;
    }

    #changelog-modal::-webkit-scrollbar { width: 5px; }
    #changelog-modal::-webkit-scrollbar-track { background: transparent; }
    #changelog-modal::-webkit-scrollbar-thumb { background: #f9b8c8; border-radius: 10px; }

    #changelog-modal .cl-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #f48aab, #f9b8c8);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 100px;
      margin-bottom: 12px;
    }

    #changelog-modal h2 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22px;
      font-weight: 900;
      color: #2d1b24;
      margin: 0 0 4px;
      line-height: 1.25;
    }

    #changelog-modal .cl-date {
      font-size: 12px;
      color: #b08090;
      margin-bottom: 20px;
    }

    #changelog-modal .cl-divider {
      height: 1px;
      background: linear-gradient(90deg, #f9b8c8 0%, transparent 100%);
      margin-bottom: 18px;
      border: none;
    }

    #changelog-modal .cl-list {
      list-style: none;
      margin: 0 0 24px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    #changelog-modal .cl-list li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      color: #3d2530;
      line-height: 1.5;
      background: #fdf4f6;
      border: 1px solid #fce0e8;
      border-radius: 10px;
      padding: 9px 12px;
    }

    #changelog-modal .cl-list li .cl-icon {
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    #changelog-modal .cl-list li strong {
      color: #2d1b24;
    }

    #changelog-modal .cl-list li em {
      color: #7a4f61;
      font-style: normal;
    }

    #changelog-btn-close {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #f48aab, #f9b8c8);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
      font-family: 'DM Sans', sans-serif;
      letter-spacing: 0.02em;
    }

    #changelog-btn-close:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }

    #changelog-btn-close:active {
      transform: translateY(0);
      opacity: 1;
    }

    #changelog-modal .cl-close-x {
      position: absolute;
      top: 14px;
      right: 16px;
      background: #fde8ee;
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #f48aab;
      font-size: 16px;
      transition: background 0.15s;
    }

    #changelog-modal .cl-close-x:hover {
      background: #f9b8c8;
      color: #fff;
    }

    @media (max-width: 500px) {
      #changelog-modal {
        padding: 24px 18px 18px;
        border-radius: 16px;
      }
      #changelog-modal h2 { font-size: 19px; }
    }
  `;
  document.head.appendChild(style);
}

function buildChangelogModal() {
  const overlay = document.createElement('div');
  overlay.id = 'changelog-overlay';

  const itemsHTML = CHANGELOG.items
    .map(item => `
      <li>
        <span class="cl-icon">${item.icon}</span>
        <span>${item.text}</span>
      </li>
    `)
    .join('');

  overlay.innerHTML = `
    <div id="changelog-modal" role="dialog" aria-modal="true" aria-labelledby="changelog-title">
      <button class="cl-close-x" id="changelog-close-x" aria-label="Fechar">✕</button>
      <div class="cl-badge">🚀 Atualização v${CHANGELOG.version}</div>
      <h2 id="changelog-title">${CHANGELOG.title}</h2>
      <p class="cl-date">📆 ${CHANGELOG.date}</p>
      <hr class="cl-divider">
      <ul class="cl-list">
        ${itemsHTML}
      </ul>
      <button id="changelog-btn-close">Entendido, vamos lá! ✅</button>
    </div>
  `;

  return overlay;
}

function closeChangelog() {
  const overlay = document.getElementById('changelog-overlay');
  if (!overlay) return;
  overlay.style.transition = 'opacity 0.2s ease';
  overlay.style.opacity = '0';
  setTimeout(() => overlay.remove(), 220);
  localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
}

function showChangelog() {
  injectChangelogStyles();
  const overlay = buildChangelogModal();
  document.body.appendChild(overlay);

  document.getElementById('changelog-btn-close').addEventListener('click', closeChangelog);
  document.getElementById('changelog-close-x').addEventListener('click', closeChangelog);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeChangelog();
  });

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      closeChangelog();
      document.removeEventListener('keydown', onEsc);
    }
  }, { once: true });
}

function initChangelog() {
  const seen = localStorage.getItem(STORAGE_KEY);
  if (seen === CURRENT_VERSION) return;
  showChangelog();
}

// Inicializa após o DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChangelog);
} else {
  initChangelog();
}
