// Cuoricino: invio delle notifiche push.
// - dal telefono (con il login anonimo): avvisa il partner ("ha fatto le attività", "tocca a te")
// - dalla pianificazione (x-cron-secret): alle 8 promemoria, alle 20 sollecito se non hai finito
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:cuoricino@example.com", Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const NEW_DAY = "2026-11-05"; // dal giorno in cui le attività sono 3 domande (dy<data>q0..q2)

async function sendTo(uids: string[], p: { title: string; body: string; tag?: string; url?: string }) {
  if (!uids.length) return 0;
  const { data } = await sb.from("push_subs").select("uid,sub").in("uid", uids);
  let n = 0;
  for (const r of data ?? []) {
    try {
      await webpush.sendNotification(r.sub, JSON.stringify(p), { TTL: 6 * 3600 });
      n++;
    } catch (e) {
      const sc = (e as { statusCode?: number }).statusCode;
      if (sc === 404 || sc === 410) await sb.from("push_subs").delete().eq("uid", r.uid); // iscrizione scaduta
    }
  }
  return n;
}

function rome() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => parts.find((x) => x.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: +g("hour") % 24 };
}
const isMonthEnd = (d: string) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + 1); return t.getUTCDate() === 1; };

// Un telefono ha fatto "le cose di oggi"?
function doneToday(ans: Record<string, unknown> | undefined, date: string) {
  const a = ans ?? {};
  const has = (k: string) => a[k] !== undefined && a[k] !== null;
  if (isMonthEnd(date)) { const ym = date.slice(0, 7).replace("-", ""); return [0, 1, 2, 3, 4, 5].every((i) => has(`mr${ym}q${i}`)); }
  if (date >= NEW_DAY) return [0, 1, 2].every((i) => has(`dy${date}q${i}`));
  return has("d" + date);
}

async function tick() {
  const { date, hour } = rome();
  if (hour !== 8 && hour !== 20) return { skipped: true, hour };
  const { data: mem } = await sb.from("members").select("couple,uid");
  const byCouple = new Map<string, string[]>();
  for (const m of mem ?? []) byCouple.set(m.couple, [...(byCouple.get(m.couple) ?? []), m.uid]);
  let sent = 0;
  for (const [couple, uids] of byCouple) {
    if (hour === 8) {
      sent += await sendTo(uids, { title: "Buongiorno 💗", body: "Le attività di oggi ti aspettano: domanda del giorno e sfida di coppia.", tag: "morning", url: "./" });
      continue;
    }
    const { data: docs } = await sb.from("docs").select("path,data").eq("couple", couple).eq("deleted", false).or("path.like.slots/*,path.like.answers/*,path.eq.couple/profile");
    const slotOf: Record<string, string> = {}; const ans: Record<string, Record<string, unknown>> = {}; let names: Record<string, string> = {};
    for (const d of docs ?? []) {
      if (d.path.startsWith("slots/")) slotOf[d.path.slice(6)] = d.data?.s;
      else if (d.path.startsWith("answers/")) ans[d.path.slice(8)] = d.data ?? {};
      else if (d.path === "couple/profile") names = d.data?.names ?? {};
    }
    const done = (s?: string) => !!s && doneToday(ans[s], date);
    for (const uid of uids) {
      const me = slotOf[uid]; if (!me || done(me)) continue;
      const other = me === "A" ? "B" : "A";
      const body = done(other) ? `${names[other] ?? "Il tuo partner"} ha già fatto le attività di oggi. Tocca a te!` : "Non hai ancora fatto le attività di oggi: ti bastano pochi minuti.";
      sent += await sendTo([uid], { title: "Cuoricino 💗", body, tag: "evening", url: "./" });
    }
  }
  return { sent, hour };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const secret = Deno.env.get("CRON_SECRET");
    if (secret && req.headers.get("x-cron-secret") === secret) return json(await tick());
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: "non autorizzato" }, 401);
    if (body.type !== "partner") return json({ error: "tipo non valido" }, 400);
    const { data: mine } = await sb.from("members").select("couple").eq("uid", u.user.id);
    const couples = (mine ?? []).map((m) => m.couple);
    if (!couples.length) return json({ sent: 0 });
    const { data: mem } = await sb.from("members").select("uid").in("couple", couples).neq("uid", u.user.id);
    const sent = await sendTo([...new Set((mem ?? []).map((m) => m.uid))], {
      title: String(body.title ?? "Cuoricino").slice(0, 80), body: String(body.body ?? "").slice(0, 200), tag: String(body.tag ?? "cuoricino").slice(0, 40), url: String(body.url ?? "./").slice(0, 100),
    });
    return json({ sent });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
