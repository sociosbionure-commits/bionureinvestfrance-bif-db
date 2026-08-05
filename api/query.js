// ============================================================
// Proxy servidor per a Neon: la credencial viu nomes aqui
// (variables d'entorn de Vercel), mai al codi client.
// Nomes s'executen les accions predefinides a ACTIONS, amb
// parametres, mai SQL arbitrari vingut del navegador.
//
// Regla de titulos_bif.num_orden: es el numero d'assentament
// al Registre Mercantil frances, consecutiu i immutable.
// - addTitol calcula sempre MAX(num_orden)+1, l'usuari no el pot triar.
// - updateLastTitol nomes permet tocar la fila amb num_orden = MAX,
//   mai una intermedia.
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

  const { action, payload } = req.body || {};
  const p = payload || {};
  const n = (v) => (v === undefined || v === '' ? null : v);
  const sql = neon(process.env.NEON_CONN);

  const ACTIONS = {
    listInversors: () => sql`SELECT * FROM v_inversor_bif ORDER BY id_inversor`,
    listInversorFinan: () => sql`SELECT * FROM v_inversor_bif_infofin ORDER BY id_inversor`,
    listTitols: () => sql`SELECT * FROM v_titulos_bif ORDER BY num_orden`,

    addInversor: () => sql`
      INSERT INTO inversor_bif
        (id_inversor, inversor_nom, inversor_cnom_rs, id_tipo, id_num, nacionalidad,
         administracion, administrador, co_cargo_dni, k_social, domicilio, cp,
         ciudad_pob, provincia, pais_es, email, email_idioma, telf, notas)
      VALUES
        (${n(p.id_inversor)}, ${n(p.inversor_nom)}, ${n(p.inversor_cnom_rs)}, ${n(p.id_tipo)}, ${n(p.id_num)}, ${n(p.nacionalidad)},
         ${n(p.administracion)}, ${n(p.administrador)}, ${n(p.co_cargo_dni)}, ${n(p.k_social)}, ${n(p.domicilio)}, ${n(p.cp)},
         ${n(p.ciudad_pob)}, ${n(p.provincia)}, ${n(p.pais_es)}, ${n(p.email)}, ${n(p.email_idioma)}, ${n(p.telf)}, ${n(p.notas)})
      RETURNING id_inversor`,

    updateInversor: () => sql`
      UPDATE inversor_bif SET
        inversor_nom=${n(p.inversor_nom)}, inversor_cnom_rs=${n(p.inversor_cnom_rs)}, id_tipo=${n(p.id_tipo)}, id_num=${n(p.id_num)},
        nacionalidad=${n(p.nacionalidad)}, administracion=${n(p.administracion)}, administrador=${n(p.administrador)},
        co_cargo_dni=${n(p.co_cargo_dni)}, k_social=${n(p.k_social)}, domicilio=${n(p.domicilio)}, cp=${n(p.cp)},
        ciudad_pob=${n(p.ciudad_pob)}, provincia=${n(p.provincia)}, pais_es=${n(p.pais_es)}, email=${n(p.email)},
        email_idioma=${n(p.email_idioma)}, telf=${n(p.telf)}, notas=${n(p.notas)}
      WHERE id_inversor=${n(p.id_inversor)}
      RETURNING id_inversor`,

    addTitol: () => sql`
      INSERT INTO titulos_bif (num_orden, id_inversor, adquisicion, enajenacion, de, a, titulo, fecha)
      SELECT COALESCE(MAX(num_orden), -1) + 1, ${n(p.id_inversor)}, ${n(p.adquisicion)}, ${n(p.enajenacion)},
             ${n(p.de)}, ${n(p.a)}, ${n(p.titulo)}, ${n(p.fecha)}
      FROM titulos_bif
      RETURNING num_orden`,

    updateLastTitol: () => sql`
      UPDATE titulos_bif SET
        id_inversor=${n(p.id_inversor)}, adquisicion=${n(p.adquisicion)}, enajenacion=${n(p.enajenacion)},
        de=${n(p.de)}, a=${n(p.a)}, titulo=${n(p.titulo)}, fecha=${n(p.fecha)}
      WHERE num_orden = (SELECT MAX(num_orden) FROM titulos_bif)
      RETURNING num_orden`,
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
    const msg = e.code === '23505' ? `Ja existeix un registre amb aquest identificador (${e.message})` : e.message;
    res.status(500).json({ error: msg });
  }
};
