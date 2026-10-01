// ============================================================
// Cap Table BIF -- crida al proxy /api/query (la credencial de
// Neon nomes viu al servidor, mai aqui). Cal contrasenya per
// accedir a les dades.
// ============================================================
function demanaContrasenya() {
  let pwd = sessionStorage.getItem('bif_pwd');
  if (!pwd) {
    pwd = prompt('Contrasenya d\'acces:') || '';
    sessionStorage.setItem('bif_pwd', pwd);
  }
  return pwd;
}

async function apiQuery(action, payload) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-password': demanaContrasenya() },
    body: JSON.stringify({ action, payload }),
  });
  if (res.status === 401) {
    sessionStorage.removeItem('bif_pwd');
    throw new Error('Contrasenya incorrecta');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data.rows;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatNum(v) {
  if (v === null || v === undefined || v === '') return '';
  return Number(v).toLocaleString('ca-ES');
}

function formatPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '';
  return v.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

function formatData(v) {
  if (!v) return '';
  const d = new Date(v);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// ---------------- Inversors ----------------

let dades = [];
let ordreCol = 'id_inversor';
let ordreAsc = true;

function render() {
  const tbody = document.getElementById('tbody');
  const filtre = document.getElementById('cerca').value.trim().toLowerCase();

  let files = dades;
  if (filtre) {
    files = files.filter(r =>
      ['id_inversor', 'inversor', 'id_tipo', 'id_num', 'nacionalidad', 'dom_agrupado', 'email', 'telf']
        .some(c => (r[c] !== null && r[c] !== undefined) && String(r[c]).toLowerCase().includes(filtre))
    );
  }

  files = [...files].sort((a, b) => {
    const va = a[ordreCol], vb = b[ordreCol];
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ca');
    return ordreAsc ? cmp : -cmp;
  });

  document.getElementById('comptador').textContent = `${files.length} de ${dades.length} inversors`;

  if (files.length === 0) {
    tbody.innerHTML = '<tr><td class="empty" colspan="9">Cap resultat</td></tr>';
    return;
  }

  tbody.innerHTML = files.map(r => `
    <tr>
      <td>${escapeHtml(r.id_inversor)}</td>
      <td>${escapeHtml(r.inversor)}</td>
      <td>${escapeHtml(r.id_tipo)}</td>
      <td>${escapeHtml(r.id_num)}</td>
      <td>${escapeHtml(r.nacionalidad)}</td>
      <td>${escapeHtml(r.dom_agrupado)}</td>
      <td>${escapeHtml(r.email)}</td>
      <td>${escapeHtml(r.telf)}</td>
      <td><button class="btn petit secundari" data-edit-inversor="${r.id_inversor}">Edita</button></td>
    </tr>
  `).join('');
}

function marcarOrdre() {
  document.querySelectorAll('#taula th[data-col]').forEach(th => {
    th.classList.toggle('sorted', th.dataset.col === ordreCol);
    th.classList.toggle('asc', th.dataset.col === ordreCol && ordreAsc);
  });
}

async function carregar() {
  try {
    dades = await apiQuery('listInversors');
    marcarOrdre();
    render();
  } catch (e) {
    document.getElementById('tbody').innerHTML =
      `<tr><td class="error" colspan="9">Error carregant dades: ${escapeHtml(e.message)}</td></tr>`;
  }
}

function actualitzaCreuCerca() {
  document.getElementById('cercaWrap').classList.toggle('te-text', document.getElementById('cerca').value.length > 0);
}

document.getElementById('cerca').addEventListener('input', () => {
  actualitzaCreuCerca();
  render();
});

document.getElementById('cercaNeteja').addEventListener('click', () => {
  const input = document.getElementById('cerca');
  input.value = '';
  input.focus();
  actualitzaCreuCerca();
  render();
});
document.querySelectorAll('#taula th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (ordreCol === col) ordreAsc = !ordreAsc;
    else { ordreCol = col; ordreAsc = true; }
    marcarOrdre();
    render();
  });
});

// ---------------- Modal inversor ----------------

const campsInversor = ['id_inversor', 'inversor_nom', 'inversor_cnom_rs', 'id_tipo', 'id_num', 'nacionalidad',
  'administracion', 'administrador', 'co_cargo_dni', 'k_social', 'domicilio', 'cp',
  'ciudad_pob', 'provincia', 'pais_es', 'email', 'email_idioma', 'telf', 'notas'];

function obrirModalInversor(registre) {
  document.getElementById('errorInversor').textContent = '';
  const esEdicio = !!registre;
  document.getElementById('titolModalInversor').textContent = esEdicio ? `Edita inversor ${registre.id_inversor}` : 'Nou inversor';
  campsInversor.forEach(c => {
    document.getElementById('f_' + c).value = (registre && registre[c] !== null && registre[c] !== undefined) ? registre[c] : '';
  });
  document.getElementById('f_id_inversor').disabled = esEdicio;
  document.getElementById('overlayInversor').dataset.mode = esEdicio ? 'edit' : 'new';
  document.getElementById('overlayInversor').classList.remove('oculta');
}

function tancarModalInversor() {
  document.getElementById('overlayInversor').classList.add('oculta');
}

document.getElementById('btnNouInversor').addEventListener('click', () => obrirModalInversor(null));
document.getElementById('btnCancelarInversor').addEventListener('click', tancarModalInversor);

document.getElementById('tbody').addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-edit-inversor]');
  if (!btn) return;
  const id = Number(btn.dataset.editInversor);
  const registre = dades.find(r => r.id_inversor === id);
  if (registre) obrirModalInversor(registre);
});

document.getElementById('btnGuardarInversor').addEventListener('click', async () => {
  const errorEl = document.getElementById('errorInversor');
  errorEl.textContent = '';
  const payload = {};
  campsInversor.forEach(c => { payload[c] = document.getElementById('f_' + c).value; });
  if (!payload.id_inversor) {
    errorEl.textContent = 'Cal indicar un ID d\'inversor.';
    return;
  }
  const mode = document.getElementById('overlayInversor').dataset.mode;
  try {
    await apiQuery(mode === 'edit' ? 'updateInversor' : 'addInversor', payload);
    tancarModalInversor();
    await carregar();
  } catch (e) {
    errorEl.textContent = e.message;
  }
});

// ---------------- Titols ----------------

let dadesTitols = [];

function renderTitols() {
  const tbody = document.getElementById('tbodyTitols');

  const suma = dadesTitols.reduce((acc, r) => acc + (Number(r.total_acc) || 0), 0);
  const ultimaAccio = dadesTitols.reduce((max, r) => Math.max(max, Number(r.a) || 0), 0);

  const totalsPerInversor = new Map();
  dadesTitols.forEach(r => {
    totalsPerInversor.set(r.id_inversor, (totalsPerInversor.get(r.id_inversor) || 0) + (Number(r.total_acc) || 0));
  });

  document.getElementById('kpiMoviments').textContent = `${dadesTitols.length} moviments`;
  document.getElementById('kpiTotalAcc').textContent = `${formatNum(suma)} accions`;
  document.getElementById('kpiUltimaAccio').textContent = `Ultima accio: ${formatNum(ultimaAccio)}`;
  document.getElementById('totalAcc').textContent = formatNum(suma);
  document.getElementById('totalPctTitols').textContent = suma ? formatPct(100) : '';

  if (dadesTitols.length === 0) {
    tbody.innerHTML = '<tr><td class="empty" colspan="11">Cap moviment</td></tr>';
    return;
  }
  tbody.innerHTML = dadesTitols.map(r => {
    const pct = suma ? (totalsPerInversor.get(r.id_inversor) / suma) * 100 : 0;
    return `
    <tr>
      <td>${formatNum(r.id_inversor)}</td>
      <td>${escapeHtml(r.inversor)}</td>
      <td>${formatData(r.fecha)}</td>
      <td>${formatNum(r.adquisicion)}</td>
      <td>${formatNum(r.enajenacion)}</td>
      <td>${formatNum(r.de)}</td>
      <td>${formatNum(r.a)}</td>
      <td>${escapeHtml(r.titulo)}</td>
      <td>${formatNum(r.total_acc)}</td>
      <td>${formatPct(pct)}</td>
      <td>${formatNum(r.num_orden)}</td>
    </tr>
  `;
  }).join('');
}

async function carregarTitols() {
  try {
    dadesTitols = await apiQuery('listTitols');
    renderTitols();
  } catch (e) {
    document.getElementById('tbodyTitols').innerHTML =
      `<tr><td class="error" colspan="10">Error carregant dades: ${escapeHtml(e.message)}</td></tr>`;
  }
}

const VISTES = {
  inversors: { barra: 'barraInversors', vista: 'vistaInversors' },
  titols: { barra: 'barraTitols', vista: 'vistaTitols' },
  perInversor: { barra: 'barraPerInversor', vista: 'vistaPerInversor' },
  certificats: { barra: 'barraCertificats', vista: 'vistaCertificats' },
};

function mostrarVista(nom) {
  Object.values(VISTES).forEach(v => {
    document.getElementById(v.barra).classList.add('oculta');
    document.getElementById(v.vista).classList.add('oculta');
  });
  document.getElementById(VISTES[nom].barra).classList.remove('oculta');
  document.getElementById(VISTES[nom].vista).classList.remove('oculta');
}

document.getElementById('btnMoviments').addEventListener('click', () => {
  mostrarVista('titols');
  carregarTitols();
});

document.getElementById('btnInversors').addEventListener('click', () => mostrarVista('inversors'));
document.getElementById('btnPerInversorInversors').addEventListener('click', () => mostrarVista('inversors'));
document.getElementById('btnPerInversorMoviments').addEventListener('click', () => mostrarVista('titols'));

document.getElementById('btnPerInversor').addEventListener('click', () => {
  mostrarVista('perInversor');
  renderPerInversor();
});

document.getElementById('btnPerInversorCertificats').addEventListener('click', async () => {
  mostrarVista('certificats');
  if (dadesTitols.length === 0) await carregarTitols();
  omplePiDatalist();
  document.getElementById('llistaInversorsCert').innerHTML = document.getElementById('llistaInversorsPi').innerHTML;
});
document.getElementById('btnCertPerInversor').addEventListener('click', () => mostrarVista('perInversor'));
document.getElementById('btnCertInversors').addEventListener('click', () => mostrarVista('inversors'));

document.getElementById('cercaCertificat').addEventListener('input', () => {
  document.getElementById('cercaCertWrap').classList.toggle('te-text', document.getElementById('cercaCertificat').value.length > 0);
});
document.getElementById('cercaCertNeteja').addEventListener('click', () => {
  const input = document.getElementById('cercaCertificat');
  input.value = '';
  input.focus();
  document.getElementById('cercaCertWrap').classList.remove('te-text');
});

const LOGO_BIONURE_B64 = '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';

const MESOS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESOS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function dataEs(d) {
  return `${d.getDate()} de ${MESOS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function dataFr(d) {
  return `${d.getDate()} ${MESOS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function generaCertificat(idInversor) {
  const errorEl = document.getElementById('certificatError');
  errorEl.textContent = '';

  const inv = dades.find(r => r.id_inversor === idInversor);
  if (!inv) {
    errorEl.textContent = `No s'ha trobat cap inversor amb ID ${idInversor}.`;
    return;
  }

  const totalAcc = dadesTitols
    .filter(r => r.id_inversor === idInversor)
    .reduce((acc, r) => acc + (Number(r.total_acc) || 0), 0);
  if (totalAcc <= 0) {
    errorEl.textContent = `L'inversor ${idInversor} no te accions registrades.`;
    return;
  }

  const capitalFinal = dadesTitols.reduce((acc, r) => acc + (Number(r.total_acc) || 0), 0);
  const pct = capitalFinal > 0 ? (totalAcc / capitalFinal) * 100 : 0;
  const participacions = totalAcc / 140;

  const esEmpresa = inv.id_tipo === 'NIF';
  const nomDestinatari = esEmpresa ? escapeHtml(inv.inversor) : `Sr/a / M./Mme ${escapeHtml(inv.inversor)}`;

  const avui = new Date();
  const dEs = dataEs(avui);
  const dFr = dataFr(avui);
  const totalAccFmt = formatNum(totalAcc);
  const participacionsFmt = participacions.toLocaleString('ca-ES', {
    minimumFractionDigits: participacions % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const pctFmt = formatPct(pct);
  const domicili = escapeHtml(inv.dom_agrupado || '');
  const tipusId = escapeHtml(inv.id_tipo || '');
  const numId = escapeHtml(inv.id_num || '');

  document.getElementById('certificatContingut').innerHTML = `
    <img class="cert-logo" src="data:image/png;base64,${LOGO_BIONURE_B64}" alt="Bionure">
    <div class="cert-cap-empresa">
      BIONURE INVESTISSEMENT FRANCE, S.A.S. au capital de 37 284 680,00 &euro; (fixe)<br>
      Si&egrave;ge social&nbsp;: 10 rue de Penthi&egrave;vre, 75008 Paris (France)<br>
      RCS de Paris sous le n&deg; 942 104 944
    </div>
    <div class="cert-dates">
      Barcelona, ${dEs}<br>
      Barcelone, le ${dFr}
    </div>
    <div class="cert-assumpte">
      Asunto:&nbsp; Certificado de acciones en Bionure Investment France<br>
      Objet&nbsp;:&nbsp; Attestation d'actions de Bionure Investment France
    </div>
    <div class="cert-destinatari">${nomDestinatari}</div>
    <div class="cert-cols">
      <div class="cert-col">
        <p class="cert-salutacio">Estimado accionista:</p>
        <p>Le certifico que, a fecha ${dEs}, con domicilio en ${domicili}, y n&uacute;mero de ${tipusId} ${numId}, es titular de ${totalAccFmt} acciones de Bionure Investment France (equivalente a las ${participacionsFmt} participaciones sociales de Bionure Therapeutics, S.L., que aport&oacute; a Bionure Investment Fance, S.A.S.), de un euro (1,00&nbsp;&euro;) de valor nominal cada una de ellas, representativas de un ${pctFmt} del capital social de Bionure Investment France, S.A.S.</p>
        <p>Y para que as&iacute; conste y surta los efectos oportunos, expido la presente certificaci&oacute;n, en Barcelona, a ${dEs}.</p>
        <p>Reciban un cordial saludo.</p>
      </div>
      <div class="cert-col">
        <p class="cert-salutacio">Cher actionnaire,</p>
        <p>Je certifie qu'&agrave; la date du ${dFr}, domicili&eacute;(e) &agrave; ${domicili} et titulaire de la carte d'identit&eacute; n&deg; ${tipusId} ${numId}, est titulaire de ${totalAccFmt} actions de Bionure Investment France (&eacute;quivalentes aux ${participacionsFmt} parts sociales de Bionure Therapeutics, SL qu'il a apport&eacute;es &agrave; Bionure Investment France, S.A.S.), d'une valeur nominale d'un euro (1,00&nbsp;&euro;) chacune, repr&eacute;sentant ${pctFmt} du capital social de Bionure Investment France, S.A.S.</p>
        <p>Et afin que cela soit consign&eacute; et produise les effets voulus, je d&eacute;livre la pr&eacute;sente attestation, &agrave; Barcelone, le ${dFr}.</p>
        <p>Veuillez agr&eacute;er nos salutations distingu&eacute;es.</p>
      </div>
    </div>
    <div class="cert-signatura">
      Pascal Nizet<br>
      Secretario/Secr&eacute;taire
    </div>
  `;
  document.getElementById('overlayCertificat').classList.remove('oculta');
}

document.getElementById('btnGenerarCertificat').addEventListener('click', () => {
  const errorEl = document.getElementById('certificatError');
  errorEl.textContent = '';
  const valor = document.getElementById('cercaCertificat').value.trim();
  const match = valor.match(/^(\d+)/);
  if (!match) {
    errorEl.textContent = 'Cerca i selecciona un inversor de la llista.';
    return;
  }
  generaCertificat(Number(match[1]));
});

document.getElementById('btnImprimirCertificat').addEventListener('click', () => window.print());
document.getElementById('btnTancarCertificat').addEventListener('click', () => {
  document.getElementById('overlayCertificat').classList.add('oculta');
});

document.getElementById('btnBaixTitols').addEventListener('click', () => {
  const el = document.getElementById('vistaTitols');
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
});

document.getElementById('btnBaixPerInversor').addEventListener('click', () => {
  const el = document.getElementById('vistaPerInversor');
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
});

document.getElementById('cercaPerInversor').addEventListener('input', () => {
  document.getElementById('cercaPiWrap').classList.toggle('te-text', document.getElementById('cercaPerInversor').value.length > 0);
  renderPerInversor();
});

document.getElementById('cercaPiNeteja').addEventListener('click', () => {
  const input = document.getElementById('cercaPerInversor');
  input.value = '';
  input.focus();
  document.getElementById('cercaPiWrap').classList.remove('te-text');
  renderPerInversor();
});

// ---------------- Moviments per Inversor ----------------

function omplePiDatalist() {
  const inversors = new Map();
  dadesTitols.forEach(r => inversors.set(r.id_inversor, r.inversor));
  const opcions = [...inversors.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, nom]) => `<option value="${escapeHtml(id + ' - ' + nom)}">`)
    .join('');
  document.getElementById('llistaInversorsPi').innerHTML = opcions;
}

function filtraDadesPerInversor(filtre) {
  const f = filtre.trim().toLowerCase();
  if (!f) return dadesTitols;
  return dadesTitols.filter(r =>
    String(r.id_inversor) === filtre.trim() ||
    r.inversor.toLowerCase().includes(f) ||
    (r.id_inversor + ' - ' + r.inversor).toLowerCase().includes(f)
  );
}

function renderPerInversor() {
  omplePiDatalist();
  const tbody = document.getElementById('tbodyPerInversor');
  const filtre = document.getElementById('cercaPerInversor').value;
  const dadesUsades = filtraDadesPerInversor(filtre);

  // El capital final sempre es calcula sobre TOTES les dades, no nomes les filtrades,
  // perque el % de cada inversor ha de ser sempre respecte al total real.
  const capitalFinal = dadesTitols.reduce((acc, r) => acc + (Number(r.total_acc) || 0), 0);

  const grups = new Map();
  dadesUsades.forEach(r => {
    if (!grups.has(r.id_inversor)) grups.set(r.id_inversor, []);
    grups.get(r.id_inversor).push(r);
  });
  const idsOrdenats = [...grups.keys()].sort((a, b) => a - b);

  if (idsOrdenats.length === 0) {
    tbody.innerHTML = '<tr><td class="empty" colspan="11">Cap moviment</td></tr>';
  }

  let totalAdq = 0, totalEna = 0, totalAcc = 0, totalTrams = 0, html = '';
  idsOrdenats.forEach(id => {
    const files = grups.get(id);
    let subAcc = 0;
    files.forEach(r => {
      totalAdq += Number(r.adquisicion) || 0;
      totalEna += Number(r.enajenacion) || 0;
      subAcc += Number(r.total_acc) || 0;
      html += `
        <tr>
          <td>${formatNum(r.id_inversor)}</td>
          <td>${escapeHtml(r.inversor)}</td>
          <td>${formatData(r.fecha)}</td>
          <td>${formatNum(r.adquisicion)}</td>
          <td>${formatNum(r.enajenacion)}</td>
          <td>${formatNum(r.de)}</td>
          <td>${formatNum(r.a)}</td>
          <td>${escapeHtml(r.titulo)}</td>
          <td>${formatNum(r.total_acc)}</td>
          <td></td>
          <td></td>
        </tr>`;
    });
    totalAcc += subAcc;
    totalTrams += files.length;
    const pctInversor = capitalFinal ? (subAcc / capitalFinal) * 100 : 0;
    html += `
      <tr class="subtotal">
        <td colspan="8" style="text-align:right;">Total ${escapeHtml(files[0].inversor)}</td>
        <td style="text-align:right;">${formatNum(subAcc)}</td>
        <td style="text-align:right;">${formatPct(pctInversor)}</td>
        <td style="text-align:right;">${files.length}</td>
      </tr>`;
  });

  if (idsOrdenats.length > 0) tbody.innerHTML = html;

  const pctGeneral = capitalFinal ? (totalAcc / capitalFinal) * 100 : 0;

  document.getElementById('kpiPiTotalAcc').textContent = `${formatNum(totalAcc)} accions`;
  document.getElementById('kpiPiAdquisicio').textContent = `${formatNum(totalAdq)} adquisicions`;
  document.getElementById('kpiPiEnajenacio').textContent = `${formatNum(totalEna)} enajenacions`;
  document.getElementById('totalGeneralAdq').textContent = formatNum(totalAdq);
  document.getElementById('totalGeneralEna').textContent = formatNum(totalEna);
  document.getElementById('totalGeneralAcc').textContent = formatNum(totalAcc);
  document.getElementById('totalGeneralPct').textContent = formatPct(pctGeneral);
  document.getElementById('totalGeneralTrams').textContent = formatNum(totalTrams);
}

// ---------------- Modal moviment de titols ----------------

const campsTitol = ['id_inversor', 'fecha', 'adquisicion', 'enajenacion', 'de', 'a', 'titulo'];

function obrirModalTitol(mode, registre) {
  document.getElementById('errorTitol').textContent = '';
  document.getElementById('titolModalTitol').textContent =
    mode === 'edit' ? `Edita l'ultim moviment (num. ordre ${registre.num_orden})` : 'Nou moviment';
  campsTitol.forEach(c => {
    let v = registre ? registre[c] : '';
    if (c === 'fecha' && v) v = new Date(v).toISOString().slice(0, 10);
    document.getElementById('t_' + c).value = (v === null || v === undefined) ? '' : v;
  });
  document.getElementById('overlayTitol').dataset.mode = mode;
  document.getElementById('overlayTitol').classList.remove('oculta');
}

function tancarModalTitol() {
  document.getElementById('overlayTitol').classList.add('oculta');
}

document.getElementById('btnNouMoviment').addEventListener('click', () => obrirModalTitol('new', null));
document.getElementById('btnCancelarTitol').addEventListener('click', tancarModalTitol);

document.getElementById('btnEditarUltim').addEventListener('click', async () => {
  if (dadesTitols.length === 0) {
    alert('Encara no hi ha cap moviment.');
    return;
  }
  const ultim = dadesTitols.reduce((max, r) => (r.num_orden > max.num_orden ? r : max), dadesTitols[0]);
  obrirModalTitol('edit', ultim);
});

document.getElementById('btnGuardarTitol').addEventListener('click', async () => {
  const errorEl = document.getElementById('errorTitol');
  errorEl.textContent = '';
  const payload = {};
  campsTitol.forEach(c => { payload[c] = document.getElementById('t_' + c).value; });
  if (!payload.id_inversor) {
    errorEl.textContent = 'Cal indicar l\'ID de l\'inversor.';
    return;
  }
  const mode = document.getElementById('overlayTitol').dataset.mode;
  try {
    await apiQuery(mode === 'edit' ? 'updateLastTitol' : 'addTitol', payload);
    tancarModalTitol();
    await carregarTitols();
  } catch (e) {
    errorEl.textContent = e.message;
  }
});

carregar();
