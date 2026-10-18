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
        (id_inversor, inversor_nom, inversor_cnom_rs, id_tipo, id_num, nacionalidad, fecha_nacimiento,
         administracion, administrador, tipo_id_admin, dni_admin, fecha_nac_admin, nacionalidad_admin, k_social, domicilio, cp,
         ciudad_pob, provincia, pais_es, email, email_idioma, telf, notas)
      VALUES
        (${n(p.id_inversor)}, ${n(p.inversor_nom)}, ${n(p.inversor_cnom_rs)}, ${n(p.id_tipo)}, ${n(p.id_num)}, ${n(p.nacionalidad)}, ${n(p.fecha_nacimiento)},
         ${n(p.administracion)}, ${n(p.administrador)}, ${n(p.tipo_id_admin)}, ${n(p.dni_admin)}, ${n(p.fecha_nac_admin)}, ${n(p.nacionalidad_admin)}, ${n(p.k_social)}, ${n(p.domicilio)}, ${n(p.cp)},
         ${n(p.ciudad_pob)}, ${n(p.provincia)}, ${n(p.pais_es)}, ${n(p.email)}, ${n(p.email_idioma)}, ${n(p.telf)}, ${n(p.notas)})
      RETURNING id_inversor`,

    updateInversor: () => sql`
      UPDATE inversor_bif SET
        inversor_nom=${n(p.inversor_nom)}, inversor_cnom_rs=${n(p.inversor_cnom_rs)}, id_tipo=${n(p.id_tipo)}, id_num=${n(p.id_num)},
        nacionalidad=${n(p.nacionalidad)}, fecha_nacimiento=${n(p.fecha_nacimiento)}, administracion=${n(p.administracion)}, administrador=${n(p.administrador)},
        tipo_id_admin=${n(p.tipo_id_admin)}, dni_admin=${n(p.dni_admin)}, fecha_nac_admin=${n(p.fecha_nac_admin)}, nacionalidad_admin=${n(p.nacionalidad_admin)},
        k_social=${n(p.k_social)}, domicilio=${n(p.domicilio)}, cp=${n(p.cp)},
        ciudad_pob=${n(p.ciudad_pob)}, provincia=${n(p.provincia)}, pais_es=${n(p.pais_es)}, email=${n(p.email)},
        email_idioma=${n(p.email_idioma)}, telf=${n(p.telf)}, notas=${n(p.notas)}
      WHERE id_inversor=${n(p.id_inversor)}
      RETURNING id_inversor`,

    // Importacio massiva d'inversors des d'Excel. Cada fila fa un UPSERT:
    // si l'ID ja existeix nomes actualitza els camps NO buits (COALESCE amb
    // el valor existent), si no existeix crea un inversor nou. Mai esborra
    // un valor existent amb una cel·la buida.
    bulkUpsertInversors: async () => {
      const rows = Array.isArray(p.rows) ? p.rows : [];
      const results = [];
      for (const f of rows) {
        try {
          const rows = await sql`
            INSERT INTO inversor_bif
              (id_inversor, inversor_nom, inversor_cnom_rs, id_tipo, id_num, nacionalidad, fecha_nacimiento,
               administracion, administrador, tipo_id_admin, dni_admin, fecha_nac_admin, nacionalidad_admin,
               domicilio, cp, ciudad_pob, provincia, pais_es, email, telf, notas)
            VALUES
              (${n(f.id_inversor)}, ${n(f.inversor_nom)}, ${n(f.inversor_cnom_rs)}, ${n(f.id_tipo)}, ${n(f.id_num)}, ${n(f.nacionalidad)}, ${n(f.fecha_nacimiento)},
               ${n(f.administracion)}, ${n(f.administrador)}, ${n(f.tipo_id_admin)}, ${n(f.dni_admin)}, ${n(f.fecha_nac_admin)}, ${n(f.nacionalidad_admin)},
               ${n(f.domicilio)}, ${n(f.cp)}, ${n(f.ciudad_pob)}, ${n(f.provincia)}, ${n(f.pais_es)}, ${n(f.email)}, ${n(f.telf)}, ${n(f.notas)})
            ON CONFLICT (id_inversor) DO UPDATE SET
              inversor_nom = COALESCE(EXCLUDED.inversor_nom, inversor_bif.inversor_nom),
              inversor_cnom_rs = COALESCE(EXCLUDED.inversor_cnom_rs, inversor_bif.inversor_cnom_rs),
              id_tipo = COALESCE(EXCLUDED.id_tipo, inversor_bif.id_tipo),
              id_num = COALESCE(EXCLUDED.id_num, inversor_bif.id_num),
              nacionalidad = COALESCE(EXCLUDED.nacionalidad, inversor_bif.nacionalidad),
              fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, inversor_bif.fecha_nacimiento),
              administracion = COALESCE(EXCLUDED.administracion, inversor_bif.administracion),
              administrador = COALESCE(EXCLUDED.administrador, inversor_bif.administrador),
              tipo_id_admin = COALESCE(EXCLUDED.tipo_id_admin, inversor_bif.tipo_id_admin),
              dni_admin = COALESCE(EXCLUDED.dni_admin, inversor_bif.dni_admin),
              fecha_nac_admin = COALESCE(EXCLUDED.fecha_nac_admin, inversor_bif.fecha_nac_admin),
              nacionalidad_admin = COALESCE(EXCLUDED.nacionalidad_admin, inversor_bif.nacionalidad_admin),
              domicilio = COALESCE(EXCLUDED.domicilio, inversor_bif.domicilio),
              cp = COALESCE(EXCLUDED.cp, inversor_bif.cp),
              ciudad_pob = COALESCE(EXCLUDED.ciudad_pob, inversor_bif.ciudad_pob),
              provincia = COALESCE(EXCLUDED.provincia, inversor_bif.provincia),
              pais_es = COALESCE(EXCLUDED.pais_es, inversor_bif.pais_es),
              email = COALESCE(EXCLUDED.email, inversor_bif.email),
              telf = COALESCE(EXCLUDED.telf, inversor_bif.telf),
              notas = COALESCE(EXCLUDED.notas, inversor_bif.notas)
            RETURNING id_inversor, (xmax = 0) AS inserted`;
          results.push({ id_inversor: f.id_inversor, status: rows[0].inserted ? 'creat' : 'actualitzat' });
        } catch (e) {
          results.push({ id_inversor: f.id_inversor, status: 'error', error: e.message });
        }
      }
      return results;
    },

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
