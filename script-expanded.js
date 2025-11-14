/**
 * Code.gs - Apps Script para receber o Relatório Mensal (formulário GitHub Pages)
 * - Grava resumo em RESPONSES (uma linha por envio)
 * - Desagrega e grava linhas em abas: AAT, TB_BOV, TB_AV, B19, RB51, ANTIRRABICA, PASTA
 * - Procura e-mail do escritório local em aba "Municipios" (Col A = Municipio, Col B = Email)
 * - Gera PDF-resumo (Google Doc temporário convertido em PDF)
 * - Envia e-mail ao escritório local com cópia para o estabelecimento
 *
 * Substitua os placeholders abaixo antes de usar.
 */

const SPREADSHEET_ID = '1m1odoRLWNvpEZIFmgUCPQHrPBAf1chCZFZrFQRQ1uZM'; // <<--- substitua pelo ID da planilha
const RESPONSES_SHEET_NAME = 'Responses';
const MUNICIPIOS_SHEET_NAME = 'Municipios';
const DEFAULT_OFFICE_EMAIL = 'produtos.vet@adapar.pr.gov.br'; // fallback

const TAB_CONFIG = [
  {name: 'AAT', fields: ['tipo','data','nf','vet','crmv','fabricante','n_frascos','n_doses','partida','estabelecimento','mes_ano','timestamp']},
  {name: 'TB_BOV', fields: ['tipo','data','nf','vet','crmv','fabricante','n_frascos','n_doses','partida','estabelecimento','mes_ano','timestamp']},
  {name: 'TB_AV', fields: ['tipo','data','nf','vet','crmv','fabricante','n_frascos','n_doses','partida','estabelecimento','mes_ano','timestamp']},
  {name: 'B19', fields: ['tipo','data','nf','vet','crmv','fabricante','n_frascos','n_doses','partida','estabelecimento','mes_ano','timestamp']},
  {name: 'RB51', fields: ['tipo','data','nf','vet','crmv','fabricante','n_frascos','n_doses','partida','estabelecimento','mes_ano','timestamp']},
  {name: 'ANTIRRABICA', fields: ['data','nome_produtor','municipio','localidade','telefone','laboratorio','partida','validade','frascos_25','frascos_50','especie','quant_animais','estabelecimento','mes_ano','timestamp']},
  {name: 'PASTA', fields: ['data','nome_produtor','municipio','localidade','telefone','n_tubos','laboratorio','partida','validade','especie','quant_animais','estabelecimento','mes_ano','timestamp']}
];

/**
 * Ponto de entrada para POST do formulário.
 * Recebe JSON (payload) e processa.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Nenhum POST recebido ou payload vazio.');
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Garantir abas
    ensureSheetExists(ss, RESPONSES_SHEET, [
      'Timestamp','NomeEstabelecimento','CNPJ','Telefone','MesAno','Endereco','Municipio','UF','RegistroADAPAR',
      'VetResponsavel','Proprietario','EmailEstabelecimento','AAT_SaldoAnterior','AAT_Recebidos_NF','AAT_Resumo',
      'TB_BOV_SaldoAnterior','TB_BOV_Recebidos_NF','TB_BOV_Resumo',
      'TB_AV_SaldoAnterior','TB_AV_Recebidos_NF','TB_AV_Resumo',
      'B19_SaldoFinal','RB51_SaldoFinal','Antirrabica_Estoque25','Antirrabica_Estoque50','Pasta_Estoque','Temperaturas_JSON','Raw_JSON'
    ]);

    // Garante abas para cada tabela (AAT, TB_BOV, etc.)
    TAB_CONFIG.forEach(cfg => ensureSheetExists(ss, cfg.name, cfg.fields));

    // Inserir linha resumo em RESPONSES
    const responsesSheet = ss.getSheetByName(RESPONSES_SHEET);
    const timestamp = new Date();
    const row = [
      timestamp,
      data.nome_estabelecimento || '',
      data.cnpj || '',
      data.telefone || '',
      data.mes_ano || '',
      data.endereco || '',
      data.municipio || '',
      data.uf || '',
      data.registro_adapar || '',
      data.vet_responsavel || '',
      data.proprietario || '',
      data.email_estabelecimento || '',
      data.aat_saldo_anterior || '',
      data.aat_recebidos_nf || '',
      data.aat_resumo || '',
      data.tb_bov_saldo_anterior || '',
      data.tb_bov_recebidos_nf || '',
      data.tb_bov_resumo || '',
      data.tb_av_saldo_anterior || '',
      data.tb_av_recebidos_nf || '',
      data.tb_av_resumo || '',
      data.b19_saldo_final || '',
      data.rb51_saldo_final || '',
      data.antirrabica_estoque_25 || '',
      data.antirrabica_estoque_50 || '',
      data.pasta_estoque_atual || '',
      JSON.stringify(data.temperaturas || []),
      JSON.stringify(data)
    ];
    responsesSheet.appendRow(row);

    // Desagregar e salvar linhas das tabelas
    saveTableRows(ss, 'AAT', data.aat_rows || [], data);
    saveTableRows(ss, 'TB_BOV', data.tb_bov_rows || [], data);
    saveTableRows(ss, 'TB_AV', data.tb_av_rows || [], data);
    saveTableRows(ss, 'B19', data.b19_rows || [], data);
    saveTableRows(ss, 'RB51', data.rb51_rows || [], data);
    saveTableRows(ss, 'ANTIRRABICA', data.antirrabica_rows || [], data);
    saveTableRows(ss, 'PASTA', data.pasta_rows || [], data);

    // Busca e-mail do município
    const officeEmail = findOfficeEmail(ss, data.municipio) || DEFAULT_OFFICE_EMAIL;

    // Gera PDF resumo
    const pdfBlob = generatePdfSummary(data);

    // Monta destinatários
    const to = officeEmail;
    const cc = [];
    if (data.email_estabelecimento) cc.push(data.email_estabelecimento);
    // Se desejar adicionar administrador, descomente e edite:
    // cc.push('seu.adm@adapar.pr.gov.br');

    const subject = `Relatório Mensal - ${data.nome_estabelecimento || 'Estabelecimento'} - ${data.mes_ano || ''}`;
    const body = 'Prezados,\n\nSegue em anexo o Relatório Mensal preenchido.\n\nAtenciosamente,\nSistema ADAPAR';
    const htmlBody = buildHtmlEmailBody(data);

    MailApp.sendEmail({
      to: to,
      cc: cc.join(','),
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      attachments: [pdfBlob]
    });

    return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('Erro em doPost: ' + (err.stack || err.message));
    return ContentService.createTextOutput(JSON.stringify({success:false, error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Salva linhas em uma aba específica.
 * rows = array de objetos (cada objeto é uma linha com chaves)
 * data = payload inteiro (para adicionar estabelecimento, mes_ano e timestamp)
 */
function saveTableRows(ss, sheetName, rows, data) {
  if (!rows || rows.length === 0) return;
  const sh = ss.getSheetByName(sheetName);
  if (!sh) {
    Logger.log('Aba não encontrada: ' + sheetName);
    return;
  }
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0] || [];
  rows.forEach(rowObj => {
    const row = [];
    const timestamp = new Date();
    headers.forEach(h => {
      // tenta mapear campo do rowObj; campos adicionais: estabelecimento, mes_ano, timestamp
      if (h === 'estabelecimento') {
        row.push(data.nome_estabelecimento || '');
      } else if (h === 'mes_ano') {
        row.push(data.mes_ano || '');
      } else if (h === 'timestamp') {
        row.push(timestamp);
      } else {
        row.push(rowObj[h] !== undefined ? rowObj[h] : '');
      }
    });
    sh.appendRow(row);
  });
}

/**
 * Gera PDF-resumo: cria temporariamente um Document, escreve conteúdo estruturado,
 * converte em PDF e move para Blob para anexar ao e-mail. Em seguida, apaga o doc.
 */
function generatePdfSummary(data) {
  const docName = 'Relatorio_temp_' + (data.nome_estabelecimento||'') + '_' + new Date().getTime();
  const doc = DocumentApp.create(docName);
  const body = doc.getBody();

  body.appendParagraph('Relatório Mensal - ADAPAR').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('');
  body.appendParagraph('Estabelecimento: ' + (data.nome_estabelecimento || ''));
  body.appendParagraph('CNPJ: ' + (data.cnpj || ''));
  body.appendParagraph('Mês/Ano: ' + (data.mes_ano || ''));
  body.appendParagraph('Municipio: ' + (data.municipio || '') + ' - UF: ' + (data.uf || ''));
  body.appendParagraph('');
  body.appendParagraph('--- Identificação ---').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Telefone: ' + (data.telefone || ''));
  body.appendParagraph('Registro ADAPAR: ' + (data.registro_adapar || ''));
  body.appendParagraph('Vet Responsável: ' + (data.vet_responsavel || ''));
  body.appendParagraph('Proprietário: ' + (data.proprietario || ''));
  body.appendParagraph('');

  // AAT resumo
  body.appendParagraph('--- AAT (Resumo) ---').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (data.aat_resumo) body.appendParagraph(data.aat_resumo);
  if (data.aat_rows && data.aat_rows.length>0) {
    body.appendParagraph('Registros de AAT:');
    data.aat_rows.forEach(r=>{
      body.appendParagraph(formatTableRow(r));
    });
  }

  // TB_BOV
  body.appendParagraph('').appendParagraph('--- Tuberculina Bovina ---').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (data.tb_bov_resumo) body.appendParagraph(data.tb_bov_resumo);
  if (data.tb_bov_rows && data.tb_bov_rows.length>0) {
    data.tb_bov_rows.forEach(r=> body.appendParagraph(formatTableRow(r)));
  }

  // TB_AV
  body.appendParagraph('').appendParagraph('--- Tuberculina Aviária ---').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (data.tb_av_resumo) body.appendParagraph(data.tb_av_resumo);
  if (data.tb_av_rows && data.tb_av_rows.length>0) {
    data.tb_av_rows.forEach(r=> body.appendParagraph(formatTableRow(r)));
  }

  // B19 / RB51
  body.appendParagraph('').appendParagraph('--- B19 / RB51 ---').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (data.b19_rows && data.b19_rows.length>0) {
    body.appendParagraph('B19:');
    data.b19_rows.forEach(r=> body.appendParagraph(formatTableRow(r)));
  }
  if (data.rb51_rows && data.rb51_rows.length>0) {
    body.appendParagraph('RB51:');
    data.rb51_rows.forEach(r=> body.appendParagraph(formatTableRow(r)));
  }

  // Antirrábica (breve lista)
  body.appendParagraph('').appendParagraph('--- Vacina Antirrábica (Resumo) ---').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (data.antirrabica_rows && data.antirrabica_rows.length>0) {
    data.antirrabica_rows.forEach(r=> body.appendParagraph(formatTableRow(r)));
  }
  body.appendParagraph('Estoque atual 25 doses: ' + (data.antirrabica_estoque_25 || ''));
  body.appendParagraph('Estoque atual 50 doses: ' + (data.antirrabica_estoque_50 || ''));

  // Pasta vampiricida
  body.appendParagraph('').appendParagraph('--- Pasta Vampiricida (Resumo) ---').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (data.pasta_rows && data.pasta_rows.length>0) {
    data.pasta_rows.forEach(r=> body.appendParagraph(formatTableRow(r)));
  }
  body.appendParagraph('Estoque atual (tubos): ' + (data.pasta_estoque_atual || ''));

  // Temperaturas: adiciona resumo do primeiro refrigerador (se houver)
  if (data.temperaturas && data.temperaturas.length>0) {
    body.appendParagraph('').appendParagraph('--- Demonstrativo de Temperatura (Resumo) ---').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    data.temperaturas.forEach((ref, idx) => {
      body.appendParagraph('Refrigerador: ' + (ref.identificacao || ('Refrigerador ' + (idx+1))));
      // incluir apenas dias com valores preenchidos
      const dias = (ref.dias || []).filter(d => d.max || d.min || d.atual);
      if (dias.length === 0) {
        body.appendParagraph('Nenhuma leitura registrada.');
      } else {
        dias.forEach(d => {
          body.appendParagraph('Dia ' + d.dia + ': Máx ' + (d.max||'-') + ' / Mín ' + (d.min||'-') + ' / Atual ' + (d.atual||'-'));
        });
      }
    });
  }

  body.appendParagraph('');
  body.appendParagraph('Relatório enviado automaticamente pelo sistema ADAPAR.');

  doc.saveAndClose();

  // Converter em PDF
  const pdfBlob = DriveApp.getFileById(doc.getId()).getAs('application/pdf').setName(
    `Relatorio_ADAPAR_${(data.nome_estabelecimento||'').replace(/[^a-zA-Z0-9_\- ]/g,'')}_${(data.mes_ano||'')}.pdf`
  );

  // Mover para lixeira (apagar) o doc temporário
  DriveApp.getFileById(doc.getId()).setTrashed(true);

  return pdfBlob;
}

/** Formata objeto de linha para uma string legível no PDF */
function formatTableRow(r) {
  if (!r) return '';
  const parts = [];
  for (const k in r) {
    if (r.hasOwnProperty(k) && r[k] !== '') {
      parts.push(`${k}: ${r[k]}`);
    }
  }
  return parts.join(' | ');
}

/**
 * Busca e-mail do escritório local pelo nome do município.
 * Planilha "Municipios" deve ter:
 * Col A = Municipio (nome), Col B = Email
 */
function findOfficeEmail(ss, municipio) {
  try {
    if (!municipio) return null;
    const sh = ss.getSheetByName(MUNICIPIOS_SHEET);
    if (!sh) return null;
    const vals = sh.getRange(1,1,sh.getLastRow(),2).getValues();
    const lower = (x) => (x||'').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const target = lower(municipio);
    for (let i=0;i<vals.length;i++){
      if (lower(vals[i][0]) === target && vals[i][1]) {
        return vals[i][1].toString().trim();
      }
    }
    return null;
  } catch (err) {
    Logger.log('Erro em findOfficeEmail: ' + err);
    return null;
  }
}

/**
 * Garante que planilha/aba existe e, se vazia, adiciona cabeçalhos.
 */
function ensureSheetExists(ss, sheetName, headers) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
  }
  // Se a aba estiver em branco (lastRow = 0) ou sem cabeçalho, escreve-os
  const lastRow = sh.getLastRow();
  if (lastRow === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  } else {
    // se o número de colunas for menor que headers.length, amplia
    const lastCol = sh.getLastColumn();
    if (lastCol < headers.length) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
    }
  }
}

/**
 * Constroi um corpo HTML para e-mail (mais legível).
 */
function buildHtmlEmailBody(data) {
  return `
    <p>Prezados,</p>
    <p>Recebemos o Relatório Mensal referente a <b>${escapeHtml(data.mes_ano || '')}</b> do estabelecimento <b>${escapeHtml(data.nome_estabelecimento || '')}</b> (CNPJ: ${escapeHtml(data.cnpj || '')}).</p>
    <p>O PDF com o resumo está em anexo.</p>
    <p>Atenciosamente,<br/>Sistema ADAPAR</p>
  `;
}

/** Pequena função para evitar injeção em HTML do e-mail */
function escapeHtml(text) {
  return (text || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
