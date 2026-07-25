// ============================================================
// Cap Table BIF -- connexio directa a Neon (sense backend)
// Rol restringit "bif_app": nomes SELECT/INSERT/UPDATE/DELETE
// sobre les taules d'aquesta app, sense permisos per esborrar
// taules ni tocar res mes del projecte de Neon.
// ============================================================
const NEON_CONN = 'postgresql://bif_app:s8AZVN10yEXmMxZnFbWWf9U@ep-late-wildflower-za5orgw1-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

let neonSql = null;
async function initNeon() {
  if (neonSql) return;
  const { neon } = await import('https://esm.sh/@neondatabase/serverless');
  neonSql = neon(NEON_CONN);
}
async function neonQuery(sql, params = []) {
  await initNeon();
  return params.length ? await neonSql.query(sql, params) : await neonSql.query(sql);
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
    const res = await neonQuery('SELECT * FROM v_inversor_bif ORDER BY id_inversor');
    dades = res.rows || res;
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
