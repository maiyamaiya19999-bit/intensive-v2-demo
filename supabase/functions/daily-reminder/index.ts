// Раз в день: кто 14 дней ничего не сдавал — открываем все шаги, продлеваем доступ на 14 дней, шлём напоминание.
// Деплой: supabase functions deploy daily-reminder
// Запуск по расписанию (Supabase → Database → Cron, или SQL):
//   select cron.schedule('daily-reminder', '0 7 * * *',
//     $$ select net.http_post(url := 'https://<project>.supabase.co/functions/v1/daily-reminder',
//        headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb) $$);
// Секреты: REMINDER_CHANNEL (log | telegram | email), TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID — канал уточним.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const IDLE_DAYS = 14;
const EXTEND_DAYS = 14;

// Заглушка отправки. Сейчас: пишет в лог и (если настроен) шлёт в Telegram Майе список.
// Когда определимся с каналом для учениц (письмо / бот), заменить тело этой функции.
async function sendReminder(student: { email: string; name: string | null }, text: string) {
  const channel = Deno.env.get("REMINDER_CHANNEL") || "log";
  console.log(`[напоминание → ${student.email}] ${text}`);
  if (channel === "telegram") {
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN"), chat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
    if (token && chat) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: `Напоминание для ${student.name || ""} (${student.email}):\n${text}` }),
      });
    }
  }
  // channel === "email": подключить Resend / SMTP, когда выберем сервис
}

Deno.serve(async (_req) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: rows, error } = await sb.from("idle_students").select("*");
  if (error) return new Response(error.message, { status: 500 });

  const now = Date.now();
  const report: string[] = [];
  for (const s of rows || []) {
    const idle = (now - new Date(s.last_activity).getTime()) / 86400000;
    if (idle < IDLE_DAYS || s.auto_opened) continue;

    const until = new Date(new Date(s.access_until).getTime() + EXTEND_DAYS * 86400000).toISOString().slice(0, 10);
    const { error: upErr } = await sb.from("users_profile")
      .update({ auto_opened: true, auto_opened_at: new Date().toISOString(), access_until: until, last_reminder_at: new Date().toISOString() })
      .eq("id", s.id);
    if (upErr) { console.error(upErr); continue; }

    await sendReminder(s, `Ты ${IDLE_DAYS} дней ничего не сдавала, поэтому я открыла тебе все шаги и продлила доступ до ${until}. ` +
      `Задания всё равно лучше сдать: без них ассистенты не узнают тебя. Начни с распаковки, это один вечер.`);
    report.push(`${s.email}: открыто всё, доступ до ${until}`);
  }
  return new Response(JSON.stringify({ processed: report.length, report }), { headers: { "content-type": "application/json" } });
});
