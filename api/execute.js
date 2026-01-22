module.exports = async (req, res) => {
  // Logs SIEMPRE
  console.log("PATH:", req.url);
  console.log("BODY_IN:", JSON.stringify(req.body ?? {}, null, 2));

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    // 1) Aceptar:
    // - Opción A (SFMC): { inArguments: [ { ... } ], journeyId, activityId, ... }
    // - Opción B (PLANO): { request_id: ..., contactListId: ..., journeyId, activityId, ... }
    let merged = req.body || {};

    if (Array.isArray(req.body?.inArguments) && req.body.inArguments.length > 0) {
      // ✅ importante: conservar también campos root (journeyId/activityId) + merge inArguments
      merged = req.body.inArguments.reduce((acc, item) => {
        if (item && typeof item === "object") Object.assign(acc, item);
        return acc;
      }, { ...req.body });
    }

    // 2) Construir objeto FINAL PLANO (Opción B) para enviar al servicio que inserta
    const event = {
      request_id: merged.request_id ?? null,
      contact_key: merged.contact_key ?? null,
      phone_number: merged.phone_number ?? null,

      // ✅ FIJO: siempre RECEIVED (NO se mapea)
      status: "RECEIVED",

      contactListId: merged.contactListId ?? null,
      campaignId: merged.campaignId ?? null,
      useNewList: !!merged.useNewList,
      newListName: merged.newListName ?? "",

      // ✅ NUEVO: para agrupar en BD
      journeyId: merged.journeyId ?? null,
      activityId: merged.activityId ?? null
    };

    console.log("EVENT_OUT (PLANO):", JSON.stringify(event, null, 2));

    // Validación mínima para NO mandar nulls
    if (!event.contactListId) throw new Error("Missing contactListId");
    if (!event.campaignId) throw new Error("Missing campaignId");

    // ✅ si vas a agrupar por estos, déjalos obligatorios:
    if (!event.journeyId) throw new Error("Missing journeyId");
    if (!event.activityId) throw new Error("Missing activityId");

    const base = process.env.EVENTS_API_BASE; // https://custom-activity-service-demo.vercel.app
    if (!base) throw new Error("Missing env EVENTS_API_BASE");

    const r = await fetch(`${base}/api/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event) // ✅ PLANO SIEMPRE
    });

    const txt = await r.text().catch(() => "");
    if (!r.ok) {
      console.error("EVENTS_API error:", r.status, txt);
      return res.status(500).json({ ok: false, error: "events_api_failed", details: txt });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("EXECUTE ERROR:", e);
    return res.status(500).json({ ok: false, error: "execute_failed", details: String(e?.message || e) });
  }
};