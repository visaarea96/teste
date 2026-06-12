/* ============================================================
   VISA Careiro — App: Boot, Navegação e Inicialização
   ============================================================ */

// ---------- Navegação ----------
function navigateTo(page) {
    currentPage = page;

    // Atualiza nav items
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    // Mostra/oculta páginas
    document.querySelectorAll('.page').forEach(el => {
        el.classList.toggle('active', el.id === 'page-' + page);
    });

    // Atualiza título da topbar
    const titles = {
        dashboard:      '📊 Dashboard',
        estabelecimentos: '🏪 Estabelecimentos',
        inativos:       '🚫 Estabelecimentos Inativos',
        cronograma:     '📅 Cronograma',
        legislacao:     '📚 Legislação',
        fiscalizacoes:  '📋 Fiscalizações',
        configuracoes:  '⚙️ Configurações'
    };
    const titleEl = document.getElementById('topbarTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'VISA Careiro';

    // Renderiza a página destino
    if (page === 'dashboard')        renderDashboard();
    if (page === 'estabelecimentos') { renderTable(); updateCpfLabel(); refreshAllCategoryDropdowns(); refreshAllBairroDropdowns(); initCatDatalist(); }
    if (page === 'inativos')         renderInativos();
    if (page === 'cronograma')       renderCronograma();
    if (page === 'legislacao')       renderLegislacao();
    if (page === 'fiscalizacoes')    renderFiscalizacoes();
    if (page === 'configuracoes')    { renderConfig(); updateCpfLabel(); }

    // Fecha sidebar em mobile
    closeSidebar();
}

// ---------- Boot ----------
async function boot() {
    if (!_currentUser) {
        document.getElementById('loginOverlay').style.display = 'flex';
        return;
    }
    document.getElementById('loginOverlay').style.display = 'none';

    const termosAceitos = localStorage.getItem('visa_terms_accepted');
    if (!termosAceitos) {
        openModal('modalTermos');
        return;
    }

    const loadEl = document.getElementById('loadingOverlay');
    if (loadEl) loadEl.style.display = 'flex';
    await carregarDadosRemotos();
}

// ---------- Carrega dados do Firestore ----------
async function carregarDadosRemotos() {
    const loadEl = document.getElementById('loadingOverlay');
    try {
        const snap = await _STATE_REF.get();
        if (snap.exists) {
            const d = snap.data();
            if (d.agents)              _fbCache.agents             = d.agents;
            if (d.config)              _fbCache.config             = d.config;
            if (d.custom)              _fbCache.custom             = d.custom;
            if (d.deleted)             _fbCache.deleted            = d.deleted;
            if (d.disabled)            _fbCache.disabled           = d.disabled;
            if (d.edited)              _fbCache.edited             = d.edited;
            if (d.bairros)             _fbCache.bairros            = d.bairros;
            if (d.cronograma_data)     _fbCache.cronograma_data    = d.cronograma_data;
            if (d.legislacao_data)     _fbCache.legislacao_data    = d.legislacao_data;
            if (d.fiscalizacoes_data)  _fbCache.fiscalizacoes_data = d.fiscalizacoes_data;
        }
    } catch (e) {
        console.warn('Firestore state indisponível:', e);
        showToast('⚠️ Sem conexão com a nuvem.', 'error');
    }

    try {
        const inativosSnap = await _INATIVOS_REF.get();
        if (inativosSnap.exists) {
            const id = inativosSnap.data();
            if (Array.isArray(id.estabelecimentos)) _fbCache.inativos_data = id.estabelecimentos;
        }
    } catch (e) { console.warn('Erro ao carregar inativos_data:', e); }

    let raw = [];
    try {
        const baseSnap = await _BASE_REF.get();
        if (baseSnap.exists) {
            const bd = baseSnap.data();
            if (Array.isArray(bd.estabelecimentos)) raw = bd.estabelecimentos;
        }
    } catch (e) { console.warn('Erro ao carregar dados base:', e); }

    _DADOS_ORIGINAL.length = 0;
    raw.forEach(r => _DADOS_ORIGINAL.push(r));

    if (loadEl) loadEl.style.display = 'none';
    init();
}

// ---------- Init (após carregamento) ----------
function init() {
    rebuildDADOS();
    refreshAllCategoryDropdowns();
    refreshAllBairroDropdowns();
    initCatDatalist();
    updateTopBadges();
    updateCpfLabel();
    renderDashboard();

    // Atualiza UI com dados do usuário logado
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    if (nameEl) nameEl.textContent = _currentUser?.profile?.nome || _currentUser?.email || 'Usuário';
    if (roleEl) roleEl.textContent = _currentUser?.role === 'admin' ? 'Administrador' : 'Fiscal';
}

// ---------- DOMContentLoaded ----------
document.addEventListener('DOMContentLoaded', () => {

    // Auto-uppercase em campos de formulário
    const skipIds = new Set(['estCnae', 'estLicenca', 'loginEmail', 'loginSenha', 'legLink', 'estFiscDescricao']);
    function applyUppercase(el) {
        if (!el || skipIds.has(el.id)) return;
        if (['date', 'email', 'password', 'month'].includes(el.type)) return;
        if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return;
        const pos = el.selectionStart;
        el.value = el.value.toUpperCase();
        try { el.setSelectionRange(pos, pos); } catch (e) {}
    }
    document.addEventListener('input', e => {
        const el = e.target;
        if (el.classList.contains('form-input') || el.classList.contains('auto-upper') ||
            el.classList.contains('search-input') || el.id === 'newBairroName') {
            applyUppercase(el);
        }
    });

    // Máscara CPF/CNPJ
    const cpfCnpjInput = document.getElementById('estCpfCnpj');
    if (cpfCnpjInput) {
        cpfCnpjInput.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length <= 11) {
                v = v.replace(/(\d{3})(\d)/,       '$1.$2');
                v = v.replace(/(\d{3})(\d)/,       '$1.$2');
                v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else {
                v = v.slice(0, 14);
                v = v.replace(/(\d{2})(\d)/,       '$1.$2');
                v = v.replace(/(\d{3})(\d)/,       '$1.$2');
                v = v.replace(/(\d{3})(\d)/,       '$1/$2');
                v = v.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
            }
            this.value = v;
            validarCpfCnpjVisual(this);
        });
        cpfCnpjInput.addEventListener('blur', function () {
            validarCpfCnpjVisual(this);
        });
    }

    // Enter no login
    document.getElementById('loginSenha')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
    });

    // Fechar modais clicando no overlay
    document.querySelectorAll('.overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
});

// Inicia o sistema
boot();
