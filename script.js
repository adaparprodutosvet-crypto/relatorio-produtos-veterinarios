// script-expanded.js
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwPYx3EXpFQTNm3Ms9mFwk2sVRP5Zb_MokK9WeytCkT1p14xYctDPheJLpnB4tkSXfeyQ/exec';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('relatorioForm');
  const status = document.getElementById('formStatus');

  /* ---------------- TEMPERATURAS ---------------- */
  const tempContainer = document.getElementById('tempContainer');
  let tempCount = 0;
  function addTempBlock() {
    tempCount++;
    const id = `temp_${tempCount}`;
    const div = document.createElement('div');
    div.className = 'card';
    div.id = id;
    div.innerHTML = `<h3>Refrigerador ${tempCount}</h3>
      <label>Identificação do refrigerador<input name="${id}_ident" placeholder="ID (ex: REFR1)"></label>
      <div class="temp-days" data-idx="${tempCount}">
        ${Array.from({length:31}, (_,i)=>`
          <label style="display:block;font-size:12px;margin-bottom:6px">
            Dia ${i+1}
            <div style="display:flex;gap:6px;margin-top:6px">
              <input name="${id}_dia_${i+1}_max" placeholder="Máx" style="width:33%">
              <input name="${id}_dia_${i+1}_min" placeholder="Mín" style="width:33%">
              <input name="${id}_dia_${i+1}_atual" placeholder="Atual" style="width:33%">
            </div>
          </label>
        `).join('')}
      </div>`;
    tempContainer.appendChild(div);
  }
  function removeTempBlock() {
    if (tempCount===0) return;
    const el = document.getElementById(`temp_${tempCount}`);
    if (el) el.remove();
    tempCount--;
  }
  // default 1
  addTempBlock();
  document.getElementById('addTemp').addEventListener('click', addTempBlock);
  document.getElementById('removeTemp').addEventListener('click', removeTempBlock);

  /* ---------------- TABELAS DINÂMICAS (AAT, TB, etc) ---------------- */

  function createTableManager(containerId, columns) {
    const container = document.getElementById(containerId);
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.className = 'dynamic-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr>' + columns.map(c=>`<th style="text-align:left;padding:6px;border-bottom:1px solid #eee">${c.label}</th>`).join('') + '<th></th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    container.appendChild(table);

    function addRow(initial={}) {
      const tr = document.createElement('tr');
      tr.innerHTML = columns.map(c=>`<td style="padding:6px;border-bottom:1px solid #fafafa"><input name="${containerId}__${c.key}" value="${initial[c.key]||''}" placeholder="${c.placeholder||''}" style="width:100%"></td>`).join('') +
        `<td style="padding:6px;border-bottom:1px solid #fafafa"><button type="button" class="btn-small remove-row">Remover</button></td>`;
      tbody.appendChild(tr);
      tr.querySelector('.remove-row').addEventListener('click', ()=>tr.remove());
    }
    return {addRow, getRows: ()=> {
      const rows = [];
      tbody.querySelectorAll('tr').forEach(tr=>{
        const obj = {};
        columns.forEach((c,i)=>{
          const input = tr.children[i].querySelector('input');
          obj[c.key] = input ? input.value : '';
        });
        rows.push(obj);
      });
      return rows;
    }};
  }

  // Configura colunas para cada tipo de tabela conforme o PDF
  const aatCols = [
    {key:'tipo', label:'Tipo (Compra/Venda/Saldo)', placeholder:'Compra/Venda/Saldo'},
    {key:'data', label:'Data', placeholder:'DD/MM/YYYY'},
    {key:'nf', label:'NF/Requisição', placeholder:'NF ou N° Requisição'},
    {key:'vet', label:'Nome do Médico Veterinário', placeholder:'Nome'},
    {key:'crmv', label:'N° Habilitação CRMV', placeholder:'CRMV'},
    {key:'fabricante', label:'Fabricante', placeholder:''},
    {key:'n_frascos', label:'N° frascos', placeholder:''},
    {key:'n_doses', label:'N° doses', placeholder:''},
    {key:'partida', label:'Partida', placeholder:''}
  ];
  const tbCols = aatCols.slice(); // mesma estrutura
  const b19Cols = aatCols.slice();
  const rb51Cols = aatCols.slice();
  const antirrabicaCols = [
    {key:'data', label:'Data', placeholder:'DD/MM/YYYY'},
    {key:'nome_produtor', label:'Nome do Produtor', placeholder:''},
    {key:'municipio', label:'Município', placeholder:''},
    {key:'localidade', label:'Localidade', placeholder:''},
    {key:'telefone', label:'Telefone', placeholder:''},
    {key:'laboratorio', label:'Laboratório', placeholder:''},
    {key:'partida', label:'Partida', placeholder:''},
    {key:'validade', label:'Validade', placeholder:''},
    {key:'frascos_25', label:'25 doses (frascos vendidos)', placeholder:''},
    {key:'frascos_50', label:'50 doses (frascos vendidos)', placeholder:''},
    {key:'especie', label:'Espécie', placeholder:'Ex: Bovina, Ovina...'},
    {key:'quant_animais', label:'Quantidade de animais', placeholder:''}
  ];
  const pastaCols = [
    {key:'data', label:'Data', placeholder:'DD/MM/YYYY'},
    {key:'nome_produtor', label:'Nome do Produtor', placeholder:''},
    {key:'municipio', label:'Município', placeholder:''},
    {key:'localidade', label:'Localidade', placeholder:''},
    {key:'telefone', label:'Telefone', placeholder:''},
    {key:'n_tubos', label:'N° Tubos vendidos', placeholder:''},
    {key:'laboratorio', label:'Laboratório', placeholder:''},
    {key:'partida', label:'Partida', placeholder:''},
    {key:'validade', label:'Validade', placeholder:''},
    {key:'especie', label:'Espécie', placeholder:''},
    {key:'quant_animais', label:'Quantidade de animais', placeholder:''}
  ];

  // instanciar managers
  const aatManager = createTableManager('aatTableContainer', aatCols);
  const tbBovManager = createTableManager('tbBovTableContainer', tbCols);
  const tbAvManager = createTableManager('tbAvTableContainer', tbCols);
  const b19Manager = createTableManager('b19TableContainer', b19Cols);
  const rb51Manager = createTableManager('rb51TableContainer', rb51Cols);
  const antirrabicaManager = createTableManager('antirrabicaTableContainer', antirrabicaCols);
  const pastaManager = createTableManager('pastaTableContainer', pastaCols);

  // botoes add row
  document.getElementById('aatAddRow').addEventListener('click', ()=>aatManager.addRow());
  document.getElementById('tbBovAddRow').addEventListener('click', ()=>tbBovManager.addRow());
  document.getElementById('tbAvAddRow').addEventListener('click', ()=>tbAvManager.addRow());
  document.getElementById('b19AddRow').addEventListener('click', ()=>b19Manager.addRow());
  document.getElementById('rb51AddRow').addEventListener('click', ()=>rb51Manager.addRow());
  document.getElementById('antirrabicaAddRow').addEventListener('click', ()=>antirrabicaManager.addRow());
  document.getElementById('pastaAddRow').addEventListener('click', ()=>pastaManager.addRow());

  /* ---------------- SUBMIT: coletar dados e enviar JSON ---------------- */
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.textContent = 'Enviando...';

    // pega inputs simples
    const fd = new FormData(form);
    const simple = {};
    for (const [k,v] of fd.entries()) {
      // ignore table inner inputs (serão serializados separadamente)
      simple[k] = v;
    }

    // montar JSON final
    const payload = Object.assign({}, simple, {
      temperaturas: [],
      aat_rows: aatManager.getRows(),
      tb_bov_rows: tbBovManager.getRows(),
      tb_av_rows: tbAvManager.getRows(),
      b19_rows: b19Manager.getRows(),
      rb51_rows: rb51Manager.getRows(),
      antirrabica_rows: antirrabicaManager.getRows(),
      pasta_rows: pastaManager.getRows()
    });

    // coletar temperaturas
    for (let i=1;i<=tempCount;i++) {
      const ident = (form.querySelector(`[name=temp_${i}_ident]`) || {}).value || `Refrigerador ${i}`;
      const dias = [];
      for (let d=1; d<=31; d++) {
        const max = (form.querySelector(`[name=temp_${i}_dia_${d}_max]`) || {}).value || '';
        const min = (form.querySelector(`[name=temp_${i}_dia_${d}_min]`) || {}).value || '';
        const atual = (form.querySelector(`[name=temp_${i}_dia_${d}_atual]`) || {}).value || '';
        dias.push({dia:d, max, min, atual});
      }
      payload.temperaturas.push({identificacao: ident, dias});
    }

    try {
      const resp = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await resp.json();
      if (resp.ok && j.success) {
        status.textContent = 'Enviado com sucesso.';
        form.reset();
        // remove extra temp blocks and recreate 1 default
        while (tempCount>1) removeTempBlock();
      } else {
        status.textContent = 'Erro: ' + (j.error || resp.statusText);
      }
    } catch (err) {
      console.error(err);
      status.textContent = 'Erro ao enviar: ' + err.message;
    }
  });

  // helper to remove temp blocks (usado após envio)
  function removeTempBlock() {
    if (tempCount===0) return;
    const el = document.getElementById(`temp_${tempCount}`);
    if (el) el.remove();
    tempCount--;
  }
});
