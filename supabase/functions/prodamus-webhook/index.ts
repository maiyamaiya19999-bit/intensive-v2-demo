// Вебхук Продамус об оплате → создаёт ученицу с тарифом и датами доступа → шлёт magic link.
// Деплой: supabase functions deploy prodamus-webhook --no-verify-jwt
// Секреты (supabase secrets set ...):
//   PRODAMUS_SECRET  — секретный ключ из настроек формы Продамус (для проверки подписи)
//   APP_URL          — адрес кабинета, куда ведёт ссылка из письма, напр. https://maysoulme.ru/kabinet/
//   TARIFF_MAP       — (необязательно) JSON: {"4990":"grow","6990":"money","89990":"vip","2000":"upgrade"} — тариф по сумме,
//                      либо {"sku:rost":"grow", ...} по артикулу товара. Ниже есть значения по умолчанию.
// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY подставляются Supabase автоматически.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const TARIFF_DAYS: Record<string, number> = { grow: 45, money: 180, vip: 365 };
const DEFAULT_MAP: Record<string, string> = { "4990": "grow", "6990": "money", "89990": "vip", "2000": "upgrade" };

// Разбирает тело вида products[0][name]=... во вложенный объект
function parseForm(body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of new URLSearchParams(body)) {
    const path = rawKey.replace(/\]/g, "").split("[");
    let cur: any = out;
    path.forEach((k, i) => {
      if (i === path.length - 1) cur[k] = value;
      else { if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {}; cur = cur[k]; }
    });
  }
  return out;
}

// Подпись Продамус: рекурсивно отсортировать ключи, все значения в строки, JSON без экранирования юникода, HMAC-SHA256.
// Проверено по их PHP-библиотеке Hmac; на первой тестовой оплате сверить и при расхождении поправить здесь.
function sortDeep(v: any): any {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    Object.keys(v).sort().forEach((k) => { o[k] = sortDeep(v[k]); });
    return o;
  }
  return v === null || v === undefined ? "" : String(v);
}
async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verify(data: Record<string, unknown>, sign: string, secret: string): Promise<boolean> {
  const copy: Record<string, unknown> = { ...data };
  delete copy.signature;
  const expected = await hmac(JSON.stringify(sortDeep(copy)), secret);
  return expected.toLowerCase() === (sign || "").toLowerCase();
}

function detectTariff(data: any): string | null {
  const map = { ...DEFAULT_MAP, ...(JSON.parse(Deno.env.get("TARIFF_MAP") || "{}")) };
  const products = Object.values(data.products || {}) as any[];
  for (const p of products) {
    if (p?.sku && map["sku:" + p.sku]) return map["sku:" + p.sku];
    const price = String(Math.round(Number(p?.price || p?.sum || 0)));
    if (map[price]) return map[price];
  }
  const sum = String(Math.round(Number(data.sum || 0)));
  return map[sum] || null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });
  const secret = Deno.env.get("PRODAMUS_SECRET") || "";
  const raw = await req.text();
  const ct = req.headers.get("content-type") || "";
  const data: any = ct.includes("application/json") ? JSON.parse(raw) : parseForm(raw);
  const sign = req.headers.get("Sign") || req.headers.get("sign") || data.signature || "";

  if (!secret) return new Response("PRODAMUS_SECRET не задан", { status: 500 });
  if (!(await verify(data, sign, secret))) {
    console.warn("Плохая подпись", { order: data.order_id });
    return new Response("bad signature", { status: 403 });
  }
  if (data.payment_status && data.payment_status !== "success") return new Response("ignored: " + data.payment_status, { status: 200 });

  const email = String(data.customer_email || data.email || "").trim().toLowerCase();
  const tariff = detectTariff(data);
  if (!email || !tariff) {
    console.error("Не определили почту или тариф", { email, sum: data.sum });
    return new Response("no email or tariff", { status: 200 }); // 200, чтобы Продамус не долбил повторами
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // защита от повторной доставки одного и того же заказа
  const orderId = String(data.order_id || data.order_num || "");
  if (orderId) {
    const { data: dup } = await sb.from("payments").select("id").eq("order_id", orderId).maybeSingle();
    if (dup) return new Response("already processed", { status: 200 });
  }

  // пользователь в Auth: находим или создаём (без пароля, вход только по ссылке)
  let userId: string | null = null;
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
  if (existing) userId = existing.id;
  else {
    const { data: created, error } = await sb.auth.admin.createUser({ email, email_confirm: true });
    if (error) { console.error(error); return new Response("auth error", { status: 500 }); }
    userId = created.user.id;
  }

  // профиль: новый — с датами по тарифу; доплата (upgrade) — поднимаем тариф и продлеваем до 180 дней от старта
  const { data: prof } = await sb.from("users_profile").select("*").eq("id", userId).maybeSingle();
  const today = new Date();
  const plus = (d: Date, n: number) => new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);
  let finalTariff = tariff;
  if (tariff === "upgrade") {
    if (!prof) return new Response("upgrade without profile", { status: 200 });
    finalTariff = prof.tariff === "vip" ? "vip" : "money";
    const start = new Date(prof.start_date);
    const until = new Date(Math.max(new Date(prof.access_until).getTime(), start.getTime() + TARIFF_DAYS.money * 86400000));
    await sb.from("users_profile").update({ tariff: finalTariff, access_until: until.toISOString().slice(0, 10) }).eq("id", userId);
  } else if (!prof) {
    await sb.from("users_profile").insert({ id: userId, email, tariff, start_date: plus(today, 0), access_until: plus(today, TARIFF_DAYS[tariff]) });
  } else {
    // повторная покупка: поднимаем тариф, если выше, и продлеваем доступ от сегодняшнего дня
    const level: Record<string, number> = { grow: 1, money: 2, vip: 3 };
    const t = level[tariff] > level[prof.tariff] ? tariff : prof.tariff;
    await sb.from("users_profile").update({ tariff: t, access_until: plus(today, TARIFF_DAYS[t]), auto_opened: false }).eq("id", userId);
    finalTariff = t;
  }

  await sb.from("payments").insert({ order_id: orderId || null, email, amount: Number(data.sum || 0), tariff: finalTariff, raw: data });

  // письмо со ссылкой для входа
  const appUrl = Deno.env.get("APP_URL") || "";
  const { error: linkErr } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: appUrl } });
  if (linkErr) console.error("magic link", linkErr);

  return new Response("ok", { status: 200 });
});
