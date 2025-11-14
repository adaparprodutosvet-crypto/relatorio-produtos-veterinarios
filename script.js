// script.js
const WEB_APP_URL = 'REPLACE_WEB_APP_URL'; // <<--- substituir pelo URL do Web App do Apps Script

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('relatorioForm');
  const tempTables = document.getElementById('tempTables');

  // Função para criar tabela de 31 dias (refrigerador)
  function createTempTable(idx = 1) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    wrapper.innerHTML = `
      <h3>Demonstrativo de Temperatura - Refrigerador ${idx}</h3>
      <p class="muted">Máx / Mín / Atual por dia</p>
      <div class="temp-grid" data-idx="${idx}">
        ${Array.from({length:31}, (_,i)=>`
          <label style="display:block;font-size:12px;margin-bottom:6px">
            Dia ${i+1}
            <div style="display:flex;gap:6px;margin-top:6px">
              <input name="temp_${idx}_dia_${i+1}_max" placeholder="Máx" style="width:33%">
              <input name="temp_${idx}_dia_${i+1}_min" placeholder="Mín" style="width:33%">
              <input name="temp_${idx}_dia_${i+1}_atual" placeholder="Atual" style="width:33%">
            </div>
          </label>
        `).join('')}
      </div>
    `;
    tempTables.appendChild(wrapper);
  }

  // default 1 refrigerador
  createTempTable(1);

  document.getElementById('addRefrigerator').addEventListener('click', () => {
    const existing = tempTables.querySelectorAll('.temp-grid').length;
    createTempTable(existing + 1);
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const status = document.getElementById('formStatus');
    status.textContent = 'Enviando...';

    // Coleta todos os inputs
    const formData = new FormData(form);
    const obj = {};
    for (const [k, v] of formData.entries()) {
      // Se mesmo nome repetir (ex. temp fields), vamos manter todos sob obj
      obj[k] = v;
    }

    // Captura temperaturas de forma estruturada
    obj.temperaturas = [];
    document.querySelectorAll('.temp-grid').forEach(grid => {
      const idx = grid.dataset.idx || '1';
      const dayArr = [];
      for (let d=1; d<=31; d++){
        const max = formData.get(`temp_${idx}_dia_${d}_max`) || '';
        const min = formData.get(`temp_${idx}_dia_${d}_min`) || '';
        const atual = formData.get(`temp_${idx}_dia_${d}_atual`) || '';
        dayArr.push({dia:d, max, min, atual});
      }
      obj.temperaturas.push({refrigerador: idx, dias: dayArr});
    });

    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(obj)
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        status.textContent = 'Enviado com sucesso. Recebemos seu relatório.';
        form.reset();
      } else {
        status.textContent = 'Ocorreu um erro: ' + (resJson.error || res.statusText);
      }
    } catch (err) {
      console.error(err);
      status.textContent = 'Erro ao enviar: ' + err.message;
    }
  });
});

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwPYx3EXpFQTNm3Ms9mFwk2sVRP5Zb_MokK9WeytCkT1p14xYctDPheJLpnB4tkSXfeyQ/exec";
