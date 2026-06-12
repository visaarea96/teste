/* ============================================================
   VISA Careiro — Estado Global e Cache Firebase
   Edite aqui os dados padrão de bairros e configurações.
   ============================================================ */

// ---------- Estado de UI ----------
let DADOS = [];
let _DADOS_ORIGINAL = [];
let currentPage = 'dashboard';
let currentEstabPage = 1;
let currentInativosPage = 1;
const PAGE_SIZE = 20;
let filters = { q: '', bairro: '', categoria: '', risco: '', status: '', dataInicio: '', dataFim: '' };
let _currentUser = null;

// Recupera sessão salva
(function () {
    try {
        const s = sessionStorage.getItem('visa_session');
        if (s) _currentUser = JSON.parse(s);
    } catch (e) {}
})();

// ---------- Cache Firestore ----------
const _fbCache = {
    inspections: {},
    agents: [],
    config: {
        licenca: true,
        semFisc: true,
        cpfObrigatorio: true,
        permitirExclusaoInativos: false
    },
    custom: [],
    deleted: [],
    disabled: [],
    edited: {},
    // Lista de bairros/localidades padrão — edite conforme necessário
    bairros: [
        'ESTRADA DE AUTAZES', 'COMUNIDADE BOA VISTA', 'ESTRADA DO MANAQUIRI', 'JACAMIM',
        'P A PANELAO', 'PACATUBA', 'LAGO CASTANHO', 'ORGAOS PUBLICOS',
        'UBS E OUTRAS UNIDADES DE SAUDE', 'RAMAL TIMBO', 'COMUNIDADE DO TILHEIRO',
        'HOTEIS E POUSADAS', 'LAGO TILHEIRO', 'PURUPURU', 'PURUPURU RIO', 'ESCOLAS',
        'SAMAUMA', 'LAGO JANAUACA', 'SAO JOSE', 'RAMAL FLORESTA', 'MAMORI I',
        'LAGO TAPAGEM', 'MERCADO CENTRAL', 'CENTRO', 'BAIRRO NOVO', 'VISTA ALEGRE',
        'NOVO HORIZONTE', 'NOVA ESPERANCA', 'SEBASTIAO BORGES'
    ],
    inativos_data: [],
    cronograma_data: [],
    legislacao_data: [],
    fiscalizacoes_data: []
};

// ---------- Persistência Firestore ----------
function _saveField(field, value) {
    _STATE_REF.set({ [field]: value }, { merge: true })
        .catch(e => console.error('Firestore write [' + field + ']:', e));
}

// ---------- Getters / Setters por domínio ----------
function getInspections()    { return _fbCache.inspections; }
function getAgents()         { return _fbCache.agents; }
function getConfig()         { return _fbCache.config; }

function getCustom()         { return _fbCache.custom; }
function saveCustom(d)       { _fbCache.custom = d; _saveField('custom', d); }

function getDeletedIds()     { return _fbCache.deleted; }
function saveDeletedIds(d)   { _fbCache.deleted = d; _saveField('deleted', d); }

function getDisabledIds()    { return _fbCache.disabled || []; }
function saveDisabledIds(d)  { _fbCache.disabled = d; _saveField('disabled', d); }
function isDisabled(id)      { return getDisabledIds().map(String).includes(String(id)); }

function getEditedMap()      { return _fbCache.edited; }
function saveEditedMap(d)    { _fbCache.edited = d; _saveField('edited', d); }

function getBairros()        { return _fbCache.bairros && _fbCache.bairros.length ? _fbCache.bairros : ['Centro']; }
function saveBairros(d)      { _fbCache.bairros = d; _saveField('bairros', d); }

function getInativosData()   { return _fbCache.inativos_data || []; }
async function saveInativosData(lista) {
    _fbCache.inativos_data = lista;
    try {
        await _INATIVOS_REF.set({ estabelecimentos: lista, updatedAt: new Date().toISOString() });
    } catch (e) { console.error(e); }
}

function getCronogramaData()     { return _fbCache.cronograma_data || []; }
function saveCronogramaData(d)   { _fbCache.cronograma_data = d; _saveField('cronograma_data', d); }

function getLegislacaoData()     { return _fbCache.legislacao_data || []; }
function saveLegislacaoData(d)   { _fbCache.legislacao_data = d; _saveField('legislacao_data', d); }

function getFiscalizacoesData()  { return _fbCache.fiscalizacoes_data || []; }
function saveFiscalizacoesData(d){ _fbCache.fiscalizacoes_data = d; _saveField('fiscalizacoes_data', d); }

// ---------- Reconstrução do array DADOS ----------
function rebuildDADOS() {
    const deleted = getDeletedIds().map(String);
    const edited  = getEditedMap();
    const custom  = getCustom();
    let base = _DADOS_ORIGINAL.filter(r => !deleted.includes(String(r.id)));
    base = base.map(r => edited[String(r.id)] ? { ...r, ...edited[String(r.id)] } : r);
    DADOS.length = 0;
    [...base, ...custom].forEach(r => DADOS.push(r));
}