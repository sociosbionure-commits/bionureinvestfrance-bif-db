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

document.getElementById('cerca').addEventListener('input', render);
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
  document.getElementById('comptadorTitols').textContent = `${dadesTitols.length} moviments`;

  const suma = dadesTitols.reduce((acc, r) => acc + (Number(r.total_acc) || 0), 0);
  document.getElementById('totalAcc').textContent = formatNum(suma);

  if (dadesTitols.length === 0) {
    tbody.innerHTML = '<tr><td class="empty" colspan="9">Cap moviment</td></tr>';
    return;
  }
  tbody.innerHTML = dadesTitols.map(r => `
    <tr>
      <td>${formatNum(r.num_orden)}</td>
      <td>${escapeHtml(r.inversor)}</td>
      <td>${formatData(r.fecha)}</td>
      <td>${formatNum(r.adquisicion)}</td>
      <td>${formatNum(r.enajenacion)}</td>
      <td>${formatNum(r.de)}</td>
      <td>${formatNum(r.a)}</td>
      <td>${escapeHtml(r.titulo)}</td>
      <td>${formatNum(r.total_acc)}</td>
    </tr>
  `).join('');
}

async function carregarTitols() {
  try {
    dadesTitols = await apiQuery('listTitols');
    renderTitols();
  } catch (e) {
    document.getElementById('tbodyTitols').innerHTML =
      `<tr><td class="error" colspan="9">Error carregant dades: ${escapeHtml(e.message)}</td></tr>`;
  }
}

document.getElementById('btnMoviments').addEventListener('click', () => {
  document.getElementById('barraInversors').classList.add('oculta');
  document.getElementById('vistaInversors').classList.add('oculta');
  document.getElementById('barraTitols').classList.remove('oculta');
  document.getElementById('vistaTitols').classList.remove('oculta');
  carregarTitols();
});

document.getElementById('btnInversors').addEventListener('click', () => {
  document.getElementById('barraTitols').classList.add('oculta');
  document.getElementById('vistaTitols').classList.add('oculta');
  document.getElementById('barraInversors').classList.remove('oculta');
  document.getElementById('vistaInversors').classList.remove('oculta');
});

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
