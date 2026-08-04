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

async function apiQuery(action) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-password': demanaContrasenya() },
    body: JSON.stringify({ action }),
  });
  if (res.status === 401) {
    sessionStorage.removeItem('bif_pwd');
    throw new Error('Contrasenya incorrecta');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data.rows;
}

let dades = [];
let ordreCol = 'id_inversor';
let ordreAsc = true;

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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
    tbody.innerHTML = '<tr><td class="empty" colspan="8">Cap resultat</td></tr>';
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
    </tr>
  `).join('');
}

function marcarOrdre() {
  document.querySelectorAll('th[data-col]').forEach(th => {
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
      `<tr><td class="error" colspan="8">Error carregant dades: ${escapeHtml(e.message)}</td></tr>`;
  }
}

document.getElementById('cerca').addEventListener('input', render);
document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (ordreCol === col) ordreAsc = !ordreAsc;
    else { ordreCol = col; ordreAsc = true; }
    marcarOrdre();
    render();
  });
});

carregar();
