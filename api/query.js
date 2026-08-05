// ============================================================
// Proxy servidor per a Neon: la credencial viu nomes aqui
// (variables d'entorn de Vercel), mai al codi client.
// Nomes s'executen les consultes predefinides a ACTIONS,
// mai SQL arbitrari vingut del navegador.
// ============================================================
const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metode no permes' });
    return;
  }

  if (req.headers['x-app-password'] !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'Contrasenya incorrecta' });
    return;
  }

  const { action } = req.body || {};
  const sql = neon(process.env.NEON_CONN);

  const ACTIONS = {
    listInversors: () => sql`SELECT * FROM v_inversor_bif ORDER BY id_inversor`,
    listInversorFinan: () => sql`SELECT * FROM v_inversor_bif_infofin ORDER BY id_inversor`,
    listTitols: () => sql`SELECT * FROM v_titulos_bif ORDER BY num_orden`,
  };

  const run = ACTIONS[action];
  if (!run) {
    res.status(400).json({ error: 'Accio desconeguda' });
    return;
  }

  try {
    const rows = await run();
    res.status(200).json({ rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
