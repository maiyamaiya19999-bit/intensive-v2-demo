-- Схема базы кабинета интенсива. Выполнить один раз в Supabase → SQL Editor.
-- Три таблицы: профиль ученицы, сданные задания, прогресс по шагам. Плюс журнал оплат для вебхука.
-- Правило безопасности (RLS): ученица видит и пишет только своё. Создаёт профиль и меняет тариф только сервер (service role).

create extension if not exists pgcrypto;

-- ---------- профиль ----------
create table if not exists public.users_profile (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null unique,
  name             text,                                   -- имя (рукописное на главной)
  nick             text,                                   -- ник в Instagram / Telegram
  niche            text,                                   -- тема блога, подставляется как {{НИША}}
  track            text check (track in ('life','expert','product')),       -- маршрут из анкеты
  tariff           text not null default 'grow' check (tariff in ('grow','money','vip')),
  has_computer     boolean,
  ai               text check (ai in ('claude','chatgpt','none')),          -- в какой нейросети работает
  plan          text default 'want_paid',  -- paid / want_paid / free (free → «паспорт» вместо полных файлов)
  start_date       date not null default current_date,
  access_until     date not null default current_date + 45,
  consent_pd       boolean not null default false,         -- согласие на обработку ПД
  consent_case     boolean not null default false,         -- согласие на кейс с ником
  answers          jsonb not null default '{}'::jsonb,     -- все ответы анкеты
  auto_opened      boolean not null default false,         -- всё открыто после 14 дней без сдач
  auto_opened_at   timestamptz,
  last_reminder_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- сданные задания ----------
-- Каждая сдача — новая строка (версия). Лимит правок по тарифу считает приложение: 1 правка на «Растущем блоге», 2 на «Блоге как бизнес».
create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users_profile(id) on delete cascade,
  task_key    text not null,          -- unpack / audience / product / offer / lesson_plan / profile_link / ...
  text        text not null default '',
  file_path   text,                   -- путь в Storage: <user_id>/<task_key>-v<n>-<имя файла>
  file_name   text,
  version     int  not null default 1,
  created_at  timestamptz not null default now(),
  unique (user_id, task_key, version)
);
create index if not exists submissions_user_idx on public.submissions(user_id, task_key);

-- ---------- прогресс ----------
create table if not exists public.progress (
  user_id     uuid not null references public.users_profile(id) on delete cascade,
  module_id   int  not null,
  step_id     text not null,          -- "2.1"
  status      text not null check (status in ('visited','done')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, step_id)
);

-- ---------- журнал оплат (пишет только вебхук) ----------
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    text unique,            -- id заказа Продамус, защищает от повторной обработки
  email       text,
  amount      numeric,
  tariff      text,
  raw         jsonb,
  created_at  timestamptz not null default now()
);

-- updated_at автоматически
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists users_profile_touch on public.users_profile;
create trigger users_profile_touch before update on public.users_profile for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.users_profile enable row level security;
alter table public.submissions   enable row level security;
alter table public.progress      enable row level security;
alter table public.payments      enable row level security;

-- профиль: читать и менять только свой; создавать нельзя (создаёт вебхук через service role)
drop policy if exists "profile: свой — читать" on public.users_profile;
create policy "profile: свой — читать" on public.users_profile for select using (auth.uid() = id);
drop policy if exists "profile: свой — менять" on public.users_profile;
create policy "profile: свой — менять" on public.users_profile for update using (auth.uid() = id) with check (auth.uid() = id);

-- ученица не может сама поменять тариф, даты доступа и флаг автооткрытия
create or replace function public.guard_profile_fields() returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.tariff        := old.tariff;
    new.start_date    := old.start_date;
    new.access_until  := old.access_until;
    new.auto_opened   := old.auto_opened;
    new.auto_opened_at:= old.auto_opened_at;
    new.email         := old.email;
  end if;
  return new;
end $$;
drop trigger if exists users_profile_guard on public.users_profile;
create trigger users_profile_guard before update on public.users_profile for each row execute function public.guard_profile_fields();

-- задания: читать и добавлять свои; менять и удалять нельзя (история версий)
drop policy if exists "submissions: свои — читать" on public.submissions;
create policy "submissions: свои — читать" on public.submissions for select using (auth.uid() = user_id);
drop policy if exists "submissions: свои — добавлять" on public.submissions;
create policy "submissions: свои — добавлять" on public.submissions for insert with check (auth.uid() = user_id);

-- прогресс: свой — читать, добавлять, менять
drop policy if exists "progress: свой — всё" on public.progress;
create policy "progress: свой — всё" on public.progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- оплаты: ученицам не видны вообще (только service role)

-- ---------- Storage: файлы заданий ----------
-- Бакет приватный, каждая видит только папку со своим id.
insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false) on conflict (id) do nothing;
drop policy if exists "storage: свои файлы — читать" on storage.objects;
create policy "storage: свои файлы — читать" on storage.objects for select using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "storage: свои файлы — загружать" on storage.objects;
create policy "storage: свои файлы — загружать" on storage.objects for insert with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- для ежедневной функции: кто 14 дней ничего не сдавал ----------
create or replace view public.idle_students as
select p.id, p.email, p.name, p.tariff, p.access_until, p.auto_opened,
       greatest(p.start_date::timestamptz, coalesce(max(s.created_at), p.start_date::timestamptz)) as last_activity
from public.users_profile p
left join public.submissions s on s.user_id = p.id
where p.consent_pd and p.access_until >= current_date
group by p.id;
-- представление доступно только service role
revoke all on public.idle_students from anon, authenticated;
