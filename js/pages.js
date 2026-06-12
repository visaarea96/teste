/* ============================================================
   VISA Careiro — Dashboard, Impressão, Cronograma,
                  Legislação e Configurações
   ============================================================ */

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
    const activeData  = DADOS.filter(r => !isDisabled(r.id));
    const inativoCount = DADOS.filter(r => isDisabled(r.id)).length;
    let fiscalizados = 0, pendentes = 0;
    activeData.forEach(r => { if (getStatusForEstab(r) === 'fiscalizado') fiscalizados++; else pendentes++; });

    document.getElementById('statFiscalizado').textContent = fiscalizados;
    document.getElementById('statPendente').textContent    = pendentes;
    document.getElementById('statInativos').textContent    = inativoCount;
    document.getElementById('statTotalAtivos').textContent = fiscalizados + pendentes;
    updateTopBadges();

    // Agrupa entradas com mais de `limit` itens em "Diversos"
    function groupDiversos(entries, limit = 21) {
        if (entries.length <= limit) return entries;
        const top  = entries.slice(0, limit - 1);
        const rest = entries.slice(limit - 1);
        return [...top, ['Diversos', rest.reduce((s, [, c]) => s + c, 0)]];
    }

    // Gráfico de Localidades
    const bairros = {};
    activeData.forEach(r => { const k = r.bairro || 'Não informado'; bairros[k] = (bairros[k] || 0) + 1; });
    let bEntries = groupDiversos(Object.entries(bairros).sort((a, b) => b[1] - a[1]));
    const bMax = Math.max(1, ...bEntries.map(([, c]) => c));
    document.getElementById('bairroChart').innerHTML = bEntries.map(([name, cnt]) =>
        `<div class="bar-item">
           <div class="bar-label"><span>${esc(name)}</span><span>${cnt}</span></div>
           <div class="bar-track"><div class="bar-fill" style="width:${(cnt / bMax * 100).toFixed(1)}%"></div></div>
         </div>`
    ).join('');

    // Gráfico de Classe de Risco
    const riscos  = { 'BAIXO RISCO': 0, 'ALTO RISCO': 0, 'Não informado': 0 };
    activeData.forEach(r => {
        if      (r.classe_risco === 'BAIXO RISCO') riscos['BAIXO RISCO']++;
        else if (r.classe_risco === 'ALTO RISCO')  riscos['ALTO RISCO']++;
        else                                        riscos['Não informado']++;
    });
    const rColors = { 'BAIXO RISCO': '#6bcb8b', 'ALTO RISCO': '#e05a6b', 'Não informado': '#ddc5cc' };
    document.getElementById('riscoChart').innerHTML = Object.entries(riscos).map(([name, cnt]) =>
        `<div class="pie-row">
           <div class="pie-dot" style="background:${rColors[name]}"></div>
           <div class="pie-name">${name}</div>
           <div class="pie-val">${cnt}</div>
         </div>`
    ).join('');

    // Gráfico de Categorias
    const cats = {};
    activeData.forEach(r => {
        const cat = (r.categoria && r.categoria.trim()) ? r.categoria.trim().toUpperCase() : 'NÃO INFORMADO';
        cats[cat] = (cats[cat] || 0) + 1;
    });
    let allCats = groupDiversos(Object.entries(cats).sort((a, b) => b[1] - a[1]));
    const cMax  = allCats.length ? allCats[0][1] : 1;
    document.getElementById('catChart').innerHTML = allCats.length
        ? allCats.map(([name, cnt]) =>
            `<div class="bar-item">
               <div class="bar-label"><span style="font-size:12px">${esc(name)}</span><span>${cnt}</span></div>
               <div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt / cMax * 100)}%"></div></div>
             </div>`)
            .join('')
        : '<div style="color:var(--text-muted);font-size:13px;padding:10px">Nenhuma categoria cadastrada.</div>';
}

// ============================================================
// IMPRESSÃO — Estabelecimentos
// ============================================================
function imprimirEstabelecimentos() {
    const data = filteredData();
    if (!data.length) { showToast('Nenhum estabelecimento para imprimir!', 'error'); return; }

    const now     = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let cFisc = 0, cPend = 0;
    data.forEach(r => { if (getStatusForEstab(r) === 'fiscalizado') cFisc++; else cPend++; });

    const bairroAtivo = filters.bairro    || 'Todos';
    const catAtiva    = filters.categoria || 'Todas';
    const riscoAtivo  = filters.risco     || 'Todos';
    const statusAtivo = filters.status    || 'Todos';
    const dataInicio  = filters.dataInicio ? formatDate(filters.dataInicio) : '—';
    const dataFim     = filters.dataFim    ? formatDate(filters.dataFim)    : '—';

    const rows = data.map((r, i) => {
        const st    = getStatusForEstab(r);
        const stTxt = st === 'fiscalizado' ? 'Fiscalizado' : 'Pendente';
        const stColor = st === 'fiscalizado' ? '#2a6e47' : '#7a4e00';
        const stBg    = st === 'fiscalizado' ? '#e8f8ee' : '#fff4e0';
        return `<tr>
          <td style="text-align:center;font-weight:600">${i + 1}</td>
          <td style="font-weight:600">${esc(r.nome_fantasia)}</td>
          <td style="font-size:11px;color:#555">${esc(r.razao_social) || '&mdash;'}</td>
          <td style="font-size:11px;color:#555">${esc(r.cpf_cnpj) || '&mdash;'}</td>
          <td style="font-size:11px;color:#555;max-width:120px">${esc(r.endereco) || '&mdash;'}</td>
          <td>${esc(r.bairro) || '&mdash;'}</td>
          <td style="font-size:11px">${esc(r.categoria) || '&mdash;'}</td>
          <td style="font-size:10px;color:#555;max-width:110px">${esc(r.tipo_atividade) || '&mdash;'}</td>
          <td style="font-size:10px">${esc(r.cnae) || '&mdash;'}</td>
          <td style="font-size:11px">${r.classe_risco?.includes('BAIXO') ? 'Baixo' : r.classe_risco?.includes('ALTO') ? 'Alto' : '&mdash;'}</td>
          <td style="font-size:10px;color:#555">${esc(r.orgao_licenciador) || '&mdash;'}</td>
          <td style="font-size:11px">${r.ultimo_fiscalização ? formatDate(r.ultimo_fiscalização) : '&mdash;'}</td>
          <td style="font-size:10px">${esc(r.licenciamento) || '&mdash;'}</td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:50px;font-size:10px;font-weight:700;background:${stBg};color:${stColor}">${stTxt}</span></td>
        </tr>`;
    }).join('');

    const html = `
        <div class="print-header">
            <div>
                <div style="font-size:12px;opacity:.85;margin-bottom:4px;letter-spacing:1px;text-transform:uppercase">Prefeitura Municipal de Careiro — AM</div>
                <h1>VISA Careiro</h1>
                <div style="font-size:13px;opacity:.9;margin-top:4px">Vigilância Sanitária — Lista de Estabelecimentos</div>
            </div>
            <div class="print-meta"><div><strong>Data:</strong> ${dateStr} &nbsp;|&nbsp; <strong>Hora:</strong> ${timeStr}</div></div>
        </div>
        <div class="print-body">
            <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#555">
                <strong style="color:#333">Filtros:</strong>
                Localidade: <strong>${bairroAtivo}</strong> | Categoria: <strong>${catAtiva}</strong> |
                Risco: <strong>${riscoAtivo}</strong> | Status: <strong>${statusAtivo}</strong> |
                Data: <strong>${dataInicio} a ${dataFim}</strong>
            </div>
            <div class="print-section-title">📊 Resumo</div>
            <div class="print-summary">
                <div class="print-stat"><div class="pv">${data.length}</div><div class="pl">Total</div></div>
                <div class="print-stat"><div class="pv" style="color:#2a6e47">${cFisc}</div><div class="pl">Fiscalizados</div></div>
                <div class="print-stat"><div class="pv" style="color:#7a4e00">${cPend}</div><div class="pl">Pendentes</div></div>
            </div>
            <div class="print-section-title">🏪 Estabelecimentos</div>
            <table>
                <thead><tr>
                    <th style="width:28px">#</th><th>Nome Fantasia</th><th>Razão social/ proprietário</th>
                    <th>CPF/CNPJ</th><th>Endereço</th><th>Localidade</th><th>Categoria</th>
                    <th>Tipo Atividade</th><th>CNAE</th><th>Risco</th><th>Órgão Lic.</th>
                    <th>Fiscalização</th><th>Licenciamento</th><th>Status</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="print-footer">
                <div>
                    <div style="font-size:12px;color:#555;margin-bottom:32px">Responsável pela Emissão:</div>
                    <div class="sign-line">Chefe da Vigilância Sanitária Municipal</div>
                </div>
                <div>
                    <div style="font-size:12px;color:#555;margin-bottom:32px">Fiscal Responsável:</div>
                    <div class="sign-line">${esc(_currentUser?.profile?.nome || 'Fiscal Sanitário')}</div>
                </div>
            </div>
            <div style="margin-top:16px;padding:8px 12px;background:#f9f9f9;border-radius:6px;font-size:9px;color:#888;text-align:center">
                VISA Careiro — ${dateStr} às ${timeStr} — ${data.length} estabelecimentos
            </div>
        </div>`;

    document.getElementById('printModalTitle').textContent = '🖨️ Lista de Estabelecimentos';
    document.getElementById('printModalSub').textContent   = data.length + ' estabelecimentos';
    document.getElementById('printContent').innerHTML      = html;
    openModal('printPreviewModal');
}

function executarImpressao() {
    const content  = document.getElementById('printContent').innerHTML;
    const printWin = window.open('', '_blank', 'width=1200,height=800,menubar=no,toolbar=no,scrollbars=yes');
    printWin.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>VISA Careiro</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
        <style>${_printStyles()}</style></head><body><div>${content}</div>
        <script>window.onload=function(){window.print();window.onfocus=function(){window.close();};};<\/script></body></html>`);
    printWin.document.close();
    closeModal('printPreviewModal');
}

// Estilos CSS injetados na janela de impressão (mantidos inline por serem usados no popup)
function _printStyles() {
    return `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;color:#1a1a2e;background:#fff;padding:8px;font-size:8.5px;}.print-header{background:#f48aab;color:white;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:14px;border-radius:7px 7px 0 0;}.print-header h1{font-family:'Playfair Display',serif;font-size:13px;font-weight:700;}.print-header>div:first-child>div:first-child{font-size:8px;opacity:.85;letter-spacing:.6px;text-transform:uppercase;}.print-meta{font-size:8.5px;opacity:.9;text-align:right;white-space:nowrap;}.print-body{padding:10px 14px;}.print-section-title{font-family:'Playfair Display',serif;font-size:10.5px;border-bottom:1.5px solid #f48aab;padding-bottom:3px;margin:9px 0 6px;color:#f48aab;}.print-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;}.print-stat{background:#fde8ee;border:1px solid #f5c6d4;border-radius:5px;padding:6px 5px;text-align:center;}.pv{font-family:'Playfair Display',serif;font-size:16px;font-weight:900;color:#f48aab;line-height:1;}.pl{font-size:7.5px;color:#b08090;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-top:2px;}table{width:100%;border-collapse:collapse;font-size:8px;}thead tr{background:#f48aab;color:white;}th{padding:4px 5px;text-align:left;font-weight:700;font-size:7.5px;letter-spacing:.3px;text-transform:uppercase;white-space:nowrap;}td{padding:3.5px 5px;border-bottom:1px solid #fae8f0;vertical-align:middle;font-size:8px;}tr:nth-child(even) td{background:#fff5f8;}.print-footer{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:1.5px solid #eee;padding-top:12px;page-break-inside:avoid;break-inside:avoid;}.sign-line{border-top:1px solid #333;margin-top:26px;padding-top:4px;font-size:8.5px;color:#555;text-align:center;}@media print{body{padding:0;}@page{size:landscape;margin:5mm;}.print-footer{page-break-inside:avoid;break-inside:avoid;}}`;
}

// ============================================================
// CRONOGRAMA
// ============================================================
const COLOR_SEQUENCE = [null, 'red', 'green', 'blue'];
const COLOR_HEX2     = { red: '#e05a6b', green: '#6bcb8b', blue: '#3a7dc9' };
const COLOR_BG2      = { red: 'rgba(224,90,107,0.13)', green: 'rgba(107,203,139,0.13)', blue: 'rgba(58,125,201,0.13)' };

function getDiasNoMes(mes, ano) { return new Date(ano, mes, 0).getDate(); }

function alternarCorTopico(btn) {
    const current = btn.dataset.color || '';
    const idx     = COLOR_SEQUENCE.indexOf(current === '' ? null : current);
    const next    = COLOR_SEQUENCE[(idx + 1) % COLOR_SEQUENCE.length];
    const newColor = next || '';

    btn.dataset.color = newColor;
    btn.title = next ? 'Cor: ' + next : 'Sem cor';
    if (next) {
        btn.style.background    = COLOR_HEX2[next];
        btn.style.borderColor   = COLOR_HEX2[next];
        btn.style.borderStyle   = '';
        btn.classList.remove('no-color');
    } else {
        btn.style.background    = '#fff';
        btn.style.borderColor   = '#ddd';
        btn.style.borderStyle   = 'dashed';
        btn.classList.add('no-color');
    }

    const container = btn.closest('.topico-row');
    if (container) {
        const input = container.querySelector('.cronograma-topico');
        if (input) {
            input.dataset.color = newColor;
            input.style.background  = next ? COLOR_BG2[next] : '';
            input.style.borderLeft  = next ? `3px solid ${COLOR_HEX2[next]}` : '';
        }
    }
}

function renderCronograma() {
    const mesSel = document.getElementById('cronogramaMes');
    const anoSel = document.getElementById('cronogramaAno');
    if (!mesSel || !anoSel) return;

    const agora = new Date();
    // Popula select de anos se ainda estiver vazio
    if (!anoSel.options.length || anoSel.value === '') {
        anoSel.innerHTML = '';
        for (let a = agora.getFullYear() - 1; a <= agora.getFullYear() + 2; a++) {
            const opt = document.createElement('option');
            opt.value     = a;
            opt.textContent = a;
            if (a === agora.getFullYear()) opt.selected = true;
            anoSel.appendChild(opt);
        }
    }

    const mes        = parseInt(mesSel.value);
    const ano        = parseInt(anoSel.value);
    const totalDias  = getDiasNoMes(mes, ano);
    const cronograma = getCronogramaData();

    const mapa = {};
    cronograma.filter(r => r.mes === mes && r.ano === ano).forEach(r => {
        mapa[r.dia] = {
            ...r,
            topicos: (r.topicos || []).map(t => typeof t === 'string' ? { t, c: null } : t)
        };
    });

    const anoAtual  = agora.getFullYear();
    const mesAtual  = agora.getMonth() + 1;
    const isPast    = (ano < anoAtual) || (ano === anoAtual && mes < mesAtual);

    const btnSalvar  = document.getElementById('btnSalvarCronograma');
    const statusMsg  = document.getElementById('cronoStatusMsg');
    if (btnSalvar) btnSalvar.disabled = isPast;
    if (statusMsg) statusMsg.textContent = isPast ? '⛔ Mês encerrado – somente leitura' : 'Edite os campos e clique em Salvar';

    const disabledAttr = isPast ? 'disabled' : '';
    const diasSemana   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    let html = '';
    for (let dia = 1; dia <= totalDias; dia++) {
        const data     = new Date(ano, mes - 1, dia);
        const diaSem   = diasSemana[data.getDay()];
        const isToday  = (dia === agora.getDate() && mes === mesAtual && ano === anoAtual);
        const reg      = mapa[dia] || { topicos: [] };
        const topicos  = reg.topicos.length ? [...reg.topicos] : [{ t: '', c: null }];

        let topicosHtml = '';
        topicos.forEach((topico, idx) => {
            const isLast      = idx === topicos.length - 1;
            const cor         = topico.c || '';
            const corHex      = COLOR_HEX2[cor] || '';
            const btnColorStyle = cor ? `background:${corHex};border-color:${corHex};` : 'background:#fff;border-style:dashed;';
            const inputStyle    = cor ? `background:${COLOR_BG2[cor]};border-left:3px solid ${corHex};` : '';

            topicosHtml += `
                <div class="topico-row" style="display:flex;gap:8px;margin-bottom:4px;align-items:center">
                    <input class="cronograma-editable cronograma-topico" type="text"
                        placeholder="Descreva o tópico..." value="${esc(topico.t)}"
                        data-dia="${dia}" data-index="${idx}" data-color="${cor}"
                        ${disabledAttr} style="${inputStyle}">
                    <button type="button" class="btn-color-topico${cor ? '' : ' no-color'}"
                        data-dia="${dia}" data-index="${idx}" data-color="${cor}"
                        style="${btnColorStyle}" onclick="alternarCorTopico(this)"
                        title="${cor ? 'Cor: ' + cor : 'Sem cor'}" ${disabledAttr}></button>
                    ${isLast
                        ? `<button type="button" class="btn btn-sm btn-ghost cronograma-add-topico" data-dia="${dia}"
                               style="padding:2px 8px;font-size:14px;line-height:1"
                               onclick="addTopico(this, ${dia})" ${disabledAttr}>+</button>`
                        : `<button type="button" class="btn btn-sm btn-ghost cronograma-remove-topico"
                               data-dia="${dia}" data-index="${idx}"
                               style="padding:2px 8px;font-size:14px;line-height:1;color:var(--danger)"
                               onclick="removeTopico(this, ${dia}, ${idx})" ${disabledAttr}>×</button>`
                    }
                </div>`;
        });

        html += `<tr class="${isToday ? 'today-row' : ''}">
            <td class="cronograma-dia">${String(dia).padStart(2, '0')} <span style="font-size:11px;color:var(--text-muted)">${diaSem}</span></td>
            <td class="cronograma-topicos-cell" data-dia="${dia}">${topicosHtml}</td>
        </tr>`;
    }
    document.getElementById('cronogramaTableBody').innerHTML = html;
}

function addTopico(btn, dia) {
    const cell       = btn.closest('.cronograma-topicos-cell');
    const topicoDivs = cell.querySelectorAll('div[style*="display:flex"]');
    const lastDiv    = topicoDivs[topicoDivs.length - 1];
    const addBtn     = lastDiv.querySelector('.cronograma-add-topico');
    if (addBtn) {
        addBtn.outerHTML = `<button type="button" class="btn btn-sm btn-ghost cronograma-remove-topico"
            data-dia="${dia}" data-index="${topicoDivs.length - 1}"
            style="padding:2px 8px;font-size:14px;line-height:1;color:var(--danger)"
            onclick="removeTopico(this, ${dia}, ${topicoDivs.length - 1})">×</button>`;
    }
    const newIdx = topicoDivs.length;
    const newDiv = document.createElement('div');
    newDiv.className  = 'topico-row';
    newDiv.style.cssText = 'display:flex;gap:8px;margin-bottom:4px;align-items:center';
    newDiv.innerHTML = `
        <input class="cronograma-editable cronograma-topico" type="text"
            placeholder="Descreva o tópico..." value="" data-dia="${dia}" data-index="${newIdx}" data-color="">
        <button type="button" class="btn-color-topico no-color"
            data-dia="${dia}" data-index="${newIdx}" data-color=""
            style="background:#fff;border-style:dashed;" onclick="alternarCorTopico(this)" title="Sem cor"></button>
        <button type="button" class="btn btn-sm btn-ghost cronograma-add-topico" data-dia="${dia}"
            style="padding:2px 8px;font-size:14px;line-height:1" onclick="addTopico(this, ${dia})">+</button>`;
    cell.appendChild(newDiv);
    newDiv.querySelector('input').focus();
}

function removeTopico(btn) {
    btn.closest('div').remove();
}

function salvarCronograma() {
    const mes = parseInt(document.getElementById('cronogramaMes').value);
    const ano = parseInt(document.getElementById('cronogramaAno').value);

    const mapaPorDia = {};
    document.querySelectorAll('#cronogramaTableBody .cronograma-topico').forEach(inp => {
        const dia   = parseInt(inp.dataset.dia);
        const valor = inp.value.trim();
        const cor   = inp.dataset.color || null;
        if (!mapaPorDia[dia]) mapaPorDia[dia] = { dia, mes, ano, topicos: [] };
        if (valor) mapaPorDia[dia].topicos.push({ t: valor, c: cor });
    });

    const novos  = Object.values(mapaPorDia).filter(r => r.topicos.length > 0);
    const merged = [...getCronogramaData().filter(r => !(r.mes === mes && r.ano === ano)), ...novos];
    saveCronogramaData(merged);
    showToast('Cronograma salvo! ✅', 'success');
}

function imprimirCronograma() {
    const mesSel  = document.getElementById('cronogramaMes');
    const anoSel  = document.getElementById('cronogramaAno');
    const mes     = parseInt(mesSel.value);
    const ano     = parseInt(anoSel.value);
    const nomeMes = mesSel.options[mesSel.selectedIndex].text;

    const mapaPorDia = {};
    document.querySelectorAll('#cronogramaTableBody .cronograma-topico').forEach(inp => {
        const dia   = parseInt(inp.dataset.dia);
        const valor = inp.value.trim();
        const cor   = inp.dataset.color || null;
        if (!mapaPorDia[dia]) mapaPorDia[dia] = { dia, topicos: [] };
        if (valor) mapaPorDia[dia].topicos.push({ t: valor, c: cor });
    });

    const registros = Object.values(mapaPorDia).filter(r => r.topicos.length > 0).sort((a, b) => a.dia - b.dia);
    if (!registros.length) { showToast('Nenhum registro no cronograma para imprimir!', 'error'); return; }

    const now     = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const colorHex = { red: '#e05a6b', green: '#6bcb8b', blue: '#3a7dc9' };

    const rows = registros.map(r => `
        <tr>
            <td style="text-align:center;font-weight:600">${String(r.dia).padStart(2, '0')}</td>
            <td>${r.topicos.map(to => {
                const dot = to.c ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colorHex[to.c] || '#ccc'};margin-right:4px;vertical-align:middle;"></span>` : '';
                return dot + esc(to.t);
            }).join('<br>')}</td>
        </tr>`).join('');

    const html = `
        <div class="print-header">
            <div>
                <div style="font-size:12px;opacity:.85;margin-bottom:4px;letter-spacing:1px;text-transform:uppercase">Prefeitura Municipal de Careiro — AM</div>
                <h1>VISA Careiro</h1>
                <div style="font-size:13px;opacity:.9;margin-top:4px">Vigilância Sanitária — Cronograma de Fiscalização</div>
            </div>
            <div class="print-meta"><div><strong>Data:</strong> ${dateStr} &nbsp;|&nbsp; <strong>Hora:</strong> ${timeStr}</div></div>
        </div>
        <div class="print-body">
            <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#555">
                <strong style="color:#333">Período:</strong> ${nomeMes} de ${ano}
            </div>
            <div class="print-section-title">📊 Resumo</div>
            <div class="print-summary">
                <div class="print-stat"><div class="pv">${registros.length}</div><div class="pl">Dias programados</div></div>
            </div>
            <div class="print-section-title">📅 Programação Diária</div>
            <table>
                <thead><tr><th style="width:40px">Dia</th><th>Tópicos</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="print-footer">
                <div>
                    <div style="font-size:12px;color:#555;margin-bottom:32px">Responsável pela Programação:</div>
                    <div class="sign-line">Chefe da Vigilância Sanitária Municipal</div>
                </div>
                <div>
                    <div style="font-size:12px;color:#555;margin-bottom:32px">Fiscal Responsável:</div>
                    <div class="sign-line">${esc(_currentUser?.profile?.nome || 'Fiscal Sanitário')}</div>
                </div>
            </div>
            <div style="margin-top:16px;padding:8px 12px;background:#f9f9f9;border-radius:6px;font-size:9px;color:#888;text-align:center">
                VISA Careiro — ${dateStr} às ${timeStr} — ${nomeMes}/${ano}
            </div>
        </div>`;

    document.getElementById('printModalTitle').textContent = '🖨️ Cronograma Mensal';
    document.getElementById('printModalSub').textContent   = nomeMes + ' de ' + ano;
    document.getElementById('printContent').innerHTML      = html;
    openModal('printPreviewModal');
}

// ============================================================
// LEGISLAÇÃO
// ============================================================
function renderLegislacao() {
    const lista     = getLegislacaoData();
    const container = document.getElementById('legislacaoList');
    if (!container) return;

    if (!lista.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📚</div><h3>Nenhum documento cadastrado</h3><p>Adicione links de legislação sanitária.</p></div>';
        return;
    }

    container.innerHTML = lista.map((doc, i) => `
        <div class="legislacao-card">
            <div class="leg-info">
                <div class="leg-nome">${esc(doc.nome)}</div>
                ${doc.categoria ? `<div class="leg-cat">📁 ${esc(doc.categoria)}</div>` : ''}
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0">
                <button class="btn btn-primary btn-sm" onclick="window.open('${esc(doc.link)}','_blank')">🔗 Abrir</button>
                <button class="btn btn-ghost   btn-sm" onclick="openEditLegislacao(${i})">✏️</button>
                <button class="btn btn-danger  btn-sm" onclick="removeLegislacao(${i})">🗑️</button>
            </div>
        </div>`).join('');
}

function openAddLegislacao() {
    document.getElementById('legModalTitle').textContent = '＋ Novo Documento';
    document.getElementById('legNome').value     = '';
    document.getElementById('legLink').value     = '';
    document.getElementById('legCategoria').value = '';
    document.getElementById('legEditId').value   = '';
    openModal('modalLegislacao');
}

function openEditLegislacao(index) {
    const doc = getLegislacaoData()[index];
    if (!doc) return;
    document.getElementById('legModalTitle').textContent = '✏️ Editar Documento';
    document.getElementById('legNome').value      = doc.nome      || '';
    document.getElementById('legLink').value      = doc.link      || '';
    document.getElementById('legCategoria').value = doc.categoria || '';
    document.getElementById('legEditId').value    = index;
    openModal('modalLegislacao');
}

function saveLegislacao() {
    const nome      = document.getElementById('legNome').value.trim();
    const link      = document.getElementById('legLink').value.trim();
    const categoria = document.getElementById('legCategoria').value.trim();
    const editId    = document.getElementById('legEditId').value;

    if (!nome) { showToast('Informe o nome do documento!', 'error'); return; }
    if (!link) { showToast('Informe o link do documento!', 'error'); return; }

    const lista = getLegislacaoData();
    const entry = { nome, link, categoria };
    if (editId !== '') {
        const idx = parseInt(editId);
        if (idx >= 0 && idx < lista.length) { lista[idx] = entry; showToast('Documento atualizado! ✅', 'success'); }
        else { showToast('Erro ao atualizar.', 'error'); return; }
    } else {
        lista.push(entry);
        showToast('Documento adicionado! ✅', 'success');
    }
    saveLegislacaoData(lista);
    closeModal('modalLegislacao');
    renderLegislacao();
}

function removeLegislacao(index) {
    if (!confirm('Remover este documento da biblioteca?')) return;
    const lista = getLegislacaoData();
    lista.splice(index, 1);
    saveLegislacaoData(lista);
    renderLegislacao();
    showToast('Documento removido.', 'success');
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
function renderConfig() { renderBairroTags(); updateConfigStats(); initConfigSwitches(); }

function initConfigSwitches() {
    const switchCpf      = document.getElementById('switchCpfObrigatorio');
    const switchExclusao = document.getElementById('switchPermitirExclusao');
    if (switchCpf)      switchCpf.checked      = getConfig().cpfObrigatorio !== false;
    if (switchExclusao) switchExclusao.checked  = getConfig().permitirExclusaoInativos === true;
}

function handleSwitchChange(switchEl, configKey) {
    const newValue = switchEl.checked;
    switchEl.checked = !newValue; // reverte visualmente até confirmar senha

    promptAdminPassword(
        () => {
            switchEl.checked = newValue;
            if (configKey === 'cpfObrigatorio') {
                _fbCache.config.cpfObrigatorio = newValue;
                _saveField('config', _fbCache.config);
                updateCpfLabel();
                showToast(newValue ? 'CPF/CNPJ agora é obrigatório.' : 'CPF/CNPJ não é mais obrigatório.', 'success');
            } else if (configKey === 'permitirExclusao') {
                _fbCache.config.permitirExclusaoInativos = newValue;
                _saveField('config', _fbCache.config);
                showToast(newValue ? 'Exclusão permanente habilitada.' : 'Exclusão permanente desabilitada.', 'success');
                if (currentPage === 'inativos') renderInativos();
            }
        },
        () => {}
    );
}

function renderBairroTags() {
    const list = document.getElementById('bairroTagList');
    if (!list) return;
    const bairros = getBairros().slice().sort((a, b) => a.localeCompare(b));
    list.innerHTML = bairros.length
        ? bairros.map(b => {
            const escapedName = esc(b).replace(/'/g, "\\'");
            return `<span class="bairro-tag">📍 ${esc(b)}<button onclick="removeBairroByName('${escapedName}')" title="Remover">✕</button></span>`;
          }).join('')
        : '<span style="font-size:13px;color:var(--text-muted)">Nenhuma localidade cadastrada.</span>';
}

let _pendingDelBairroName = null;

function addBairro() {
    const input = document.getElementById('newBairroName');
    const name  = input?.value.trim().toUpperCase();
    if (!name) { showToast('Informe o nome da localidade!', 'error'); return; }
    const bairros = getBairros();
    if (bairros.some(b => b.toUpperCase() === name)) { showToast('Localidade já cadastrada!', 'error'); return; }
    bairros.push(name);
    saveBairros(bairros);
    if (input) input.value = '';
    renderBairroTags();
    refreshAllBairroDropdowns();
    showToast('Localidade adicionada! ✅', 'success');
}

function removeBairroByName(nome) {
    const bairros = getBairros();
    const idx     = bairros.findIndex(b => b === nome);
    if (idx === -1) { showToast('Localidade não encontrada.', 'error'); return; }
    const vinculados = DADOS.filter(d => d.bairro === nome).length;
    if (vinculados > 0) {
        showToast(`Não é possível excluir: ${vinculados} estabelecimento${vinculados > 1 ? 's' : ''} vinculado${vinculados > 1 ? 's' : ''} a "${nome}".`, 'error');
        return;
    }
    _pendingDelBairroName = nome;
    document.getElementById('delBairroLabel').textContent = nome;
    openModal('modalConfirmDelBairro');
}

function confirmRemoveBairro() {
    const nome    = _pendingDelBairroName;
    if (!nome) return;
    const bairros = getBairros();
    const idx     = bairros.findIndex(b => b === nome);
    if (idx !== -1) {
        bairros.splice(idx, 1);
        saveBairros(bairros);
        renderBairroTags();
        refreshAllBairroDropdowns();
        showToast('Localidade removida.', 'success');
    } else {
        showToast('Localidade não encontrada para remoção.', 'error');
    }
    closeModal('modalConfirmDelBairro');
    _pendingDelBairroName = null;
}

function updateConfigStats() {
    const estabs  = DADOS.filter(r => !isDisabled(r.id)).length;
    const inativos = DADOS.filter(r => isDisabled(r.id)).length;
    const edited  = Object.keys(getEditedMap()).length;
    const el = document.getElementById('configStats');
    if (el) el.innerHTML = `Sistema: <strong>${estabs}</strong> estabelecimentos ativos &nbsp;|&nbsp; <strong>${inativos}</strong> inativos &nbsp;|&nbsp; <span style="color:#3a7dc9">${edited} editados</span>`;
}

// ============================================================
// BACKUP
// ============================================================
async function backupData() {
    const disabledSet = new Set(getDisabledIds().map(String));
    const data = {
        version:           5,
        exportedAt:        new Date().toISOString(),
        config:            getConfig(),
        custom:            getCustom(),
        deleted:           getDeletedIds(),
        disabled:          getDisabledIds(),
        edited:            getEditedMap(),
        bairros:           getBairros(),
        estabelecimentos:  _DADOS_ORIGINAL.filter(r => !disabledSet.has(String(r.id))),
        inativos_data:     getInativosData(),
        cronograma_data:   getCronogramaData(),
        legislacao_data:   getLegislacaoData(),
        fiscalizacoes_data: getFiscalizacoesData()
    };
    downloadJSON(data, 'backup_completo_visa_careiro_' + new Date().toISOString().slice(0, 10) + '.json');
    showToast('Backup completo exportado! ✅', 'success');
}

function importBackup() { document.getElementById('importFile').click(); }

function doImport(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    readJSON(file, async data => {
        try {
            const summary = {};
            if (data.config)   { _fbCache.config = data.config; _saveField('config', data.config); }
            if (data.custom)   saveCustom(data.custom);
            if (data.deleted)  saveDeletedIds(data.deleted);
            if (data.disabled) saveDisabledIds(data.disabled);
            if (data.edited)   saveEditedMap(data.edited);

            if (data.bairros?.length)           { saveBairros(data.bairros);            summary.bairros      = data.bairros.length; }
            if (data.cronograma_data?.length)    { saveCronogramaData(data.cronograma_data);   summary.cronograma   = data.cronograma_data.length; }
            if (data.legislacao_data?.length)    { saveLegislacaoData(data.legislacao_data);   summary.legislacao   = data.legislacao_data.length; }
            if (data.fiscalizacoes_data?.length) { saveFiscalizacoesData(data.fiscalizacoes_data); summary.fiscalizacoes = data.fiscalizacoes_data.length; }

            if (Array.isArray(data.estabelecimentos) && data.estabelecimentos.length) {
                const disabledSet  = new Set((data.disabled || []).map(String));
                const apenasAtivos = data.estabelecimentos.filter(r => !disabledSet.has(String(r.id)));
                await _BASE_REF.set({ estabelecimentos: apenasAtivos, importedAt: new Date().toISOString(), total: apenasAtivos.length });
                _DADOS_ORIGINAL.length = 0;
                apenasAtivos.forEach(r => _DADOS_ORIGINAL.push(r));
                summary.ativos = apenasAtivos.length;
            }

            if (Array.isArray(data.inativos_data) && data.inativos_data.length) {
                await saveInativosData(data.inativos_data);
                summary.inativos = data.inativos_data.length;
            }

            rebuildDADOS();
            refreshAllCategoryDropdowns();
            refreshAllBairroDropdowns();
            renderConfig();
            refreshAfterChange();

            const resultEl = document.getElementById('backupImportResult');
            if (resultEl) {
                const linhas = [
                    summary.ativos      != null ? `🏢 <strong>${summary.ativos}</strong> estabelecimento${summary.ativos !== 1 ? 's' : ''} ativo${summary.ativos !== 1 ? 's' : ''}` : null,
                    summary.inativos    != null ? `🚫 <strong>${summary.inativos}</strong> estabelecimento${summary.inativos !== 1 ? 's' : ''} inativo${summary.inativos !== 1 ? 's' : ''}` : null,
                    summary.bairros     != null ? `📍 <strong>${summary.bairros}</strong> localidade${summary.bairros !== 1 ? 's' : ''}` : null,
                    summary.cronograma  != null ? `📅 <strong>${summary.cronograma}</strong> registros de cronograma` : null,
                    summary.legislacao  != null ? `📚 <strong>${summary.legislacao}</strong> documentos de legislação` : null,
                    summary.fiscalizacoes != null ? `📋 <strong>${summary.fiscalizacoes}</strong> ações de fiscalização` : null,
                ].filter(Boolean);
                resultEl.style.display    = 'block';
                resultEl.style.background = 'var(--success-bg)';
                resultEl.style.border     = '1.5px solid var(--success)';
                resultEl.innerHTML = `<div style="font-weight:700;font-size:14px;margin-bottom:10px">✅ Backup restaurado com sucesso!</div>
                    <div style="display:flex;flex-direction:column;gap:5px">${linhas.map(r => `<div>${r}</div>`).join('')}</div>`;
            }
            showToast('Backup universal restaurado! ✅', 'success');
        } catch (err) {
            showToast('Arquivo inválido: ' + err.message, 'error');
        }
    });
}
