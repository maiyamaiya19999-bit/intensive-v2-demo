/* Правила доступа. Чистые функции без обращения к сети.
   Контекст ctx = { P: программа, profile, subs: сданные задания, progress } собирается в Access.ctx().
   Правила:
   - модули с tariff: 2 закрыты на тарифе «Растущий блог» (состояние 'na');
   - замки: шаги после первого несданного задания с lock:true закрыты ('locked');
   - VIP и «автооткрытие через 14 дней без сдач» снимают замки;
   - правки задания: 1 раз на «Растущем блоге», 2 раза на «Блоге как бизнес»;
   - срок доступа: после access_until кабинет только для чтения. */
(function () {
  const DAY = 86400000;
  const tariffOf = (P, profile) => { const k = (profile && profile.tariff) || 'grow'; return Object.assign({ key: k }, P.tariffs[k] || P.tariffs.grow); };
  /* направление блога берётся из анкеты (life / expert); продукт добавляет тариф «Блог как бизнес», а не анкета */
  const trackOf = (P, profile, tf) => {
    let k = (profile && profile.track) || 'life'; if (k === 'product' || !P.tracks[k]) k = k === 'product' ? 'expert' : 'life';
    const base = Object.assign({ key: k }, P.tracks[k]);
    if (tf && tf.level >= 2 && P.tracks.product) Object.assign(base, { name: base.name + ' + продукт', examples: base.examples + ' и из работы с людьми', from: P.tracks.product.from });
    return base;
  };

  /* шаг с учётом варианта по нейросети (claude / chatgpt / none) */
  function applyVariant(step, profile) {
    if (!step.variants) return step;
    const ai = (profile && profile.ai) || 'none';
    const v = step.variants[ai] || step.variants.none;
    return v ? Object.assign({}, step, v, { variants: undefined }) : step;
  }

  function ctx(P, profile, subs, progress) {
    const tf = tariffOf(P, profile), tr = trackOf(P, profile, tf);
    const subMap = {};
    (subs || []).forEach(s => { const m = subMap[s.task_key] || (subMap[s.task_key] = { count: 0, latest: null }); m.count++; if (!m.latest || s.created_at > m.latest.created_at) m.latest = s; });
    const prog = {};
    (progress || []).forEach(p => { prog[p.step_id] = p; });

    const modules = P.modules.map((m, order) => Object.assign({}, m, (m.by_tariff && m.by_tariff[String(tf.level)]) || {}, { order, na: (m.tariff || 1) > tf.level }));
    const flat = [];
    const plan = (profile && profile.plan) || 'paid';
    modules.forEach(m => m.steps.filter(s0 => (!s0.only_plan || s0.only_plan === plan) && ![].concat(s0.skip_plan || []).includes(plan) && (!s0.only_tariff || tf.level >= s0.only_tariff)).forEach((s0, j) => {
      const s = applyVariant(s0, profile);
      flat.push(Object.assign({}, s, { mod: m, j, na: m.na, fi: flat.length }));
    }));

    const c = { P, profile: profile || {}, tf, tr, subMap, prog, modules, flat };
    c.autoOpened = isAutoOpened(c);
    c.lockIdx = lockIndex(c);
    c.expired = isExpired(c);
    return c;
  }

  const has = (c, key) => !!c.subMap[key];

  /* автооткрытие: сервер ставит profile.auto_opened; клиент дублирует правило, чтобы демо работало без сервера */
  function isAutoOpened(c) {
    if (c.profile.auto_opened) return true;
    const days = c.P.auto_open_days || 14;
    const start = c.profile.start_date ? new Date(c.profile.start_date) : null;
    if (!start) return false;
    let last = start.getTime();
    Object.values(c.subMap).forEach(m => { const t = new Date(m.latest.created_at).getTime(); if (t > last) last = t; });
    return (Date.now() - last) >= days * DAY;
  }

  function lockIndex(c) {
    if (c.tf.key === 'vip' || c.autoOpened) return Infinity;
    const i = c.flat.findIndex(x => x.task && x.task.lock && !x.na && !has(c, x.task.key));
    return i < 0 ? Infinity : i;
  }

  function accessUntil(c) {
    if (c.profile.access_until) return new Date(c.profile.access_until);
    const start = c.profile.start_date ? new Date(c.profile.start_date) : new Date();
    return new Date(start.getTime() + c.tf.days * DAY);
  }
  function isExpired(c) { return accessUntil(c).getTime() < Date.now() - DAY; }
  function daysLeft(c) { return Math.max(0, Math.ceil((accessUntil(c).getTime() - Date.now()) / DAY)); }

  const isDone = (c, x) => !!(c.prog[x.id] && c.prog[x.id].status === 'done');

  /* последний открытый шаг — «ты остановилась» */
  function currentStep(c) {
    if (c._cur !== undefined) return c._cur;
    let best = null;
    c.flat.forEach(x => { const p = c.prog[x.id]; if (p && (!best || p.updated_at > best.p.updated_at)) best = { x, p }; });
    let cur = c.flat[0];
    if (best) {
      cur = best.x;
      if (best.p.status === 'done') { const n = c.flat.find(y => y.fi > best.x.fi && !y.na && y.fi <= c.lockIdx && !isDone(c, y)); cur = n || best.x; }
    }
    c._cur = cur;
    return cur;
  }

  function stateOf(c, x) {
    if (x.na) return 'na';
    if (x.fi > c.lockIdx) return 'locked';
    if (isDone(c, x)) return 'done';
    const cur = currentStep(c);
    return cur && cur.id === x.id ? 'cur' : 'open';
  }
  function modState(c, m) {
    if (m.na) return 'na';
    const L = c.flat.filter(x => x.mod.id === m.id).map(x => stateOf(c, x));
    if (L.every(s => s === 'done')) return 'done';
    if (L.includes('cur')) return 'cur';
    if (L.some(s => s === 'open' || s === 'done')) return 'open';
    return 'locked';
  }
  function modPct(c, m) { const L = c.flat.filter(x => x.mod.id === m.id); return Math.round(L.filter(x => isDone(c, x)).length / Math.max(1, L.length) * 100); }
  function pct(c) { const L = c.flat.filter(x => !x.na); return { done: L.filter(x => isDone(c, x)).length, total: L.length, pct: Math.round(L.filter(x => isDone(c, x)).length / Math.max(1, L.length) * 100) }; }

  function editsLeft(c, key) { const m = c.subMap[key]; if (!m) return c.tf.edits; return Math.max(0, c.tf.edits - (m.count - 1)); }
  const editsWord = tf => tf.edits >= 99 ? 'сколько угодно' : tf.edits === 1 ? 'один раз' : 'два раза';

  /* шаг, в котором сдаётся задание с ключом key */
  const stepOfTask = (c, key) => c.flat.find(x => x.task && x.task.key === key);
  const lockStep = c => (c.lockIdx === Infinity ? null : c.flat[c.lockIdx]);

  window.Access = { ctx, has, stateOf, modState, modPct, pct, currentStep, editsLeft, editsWord, accessUntil, daysLeft, stepOfTask, lockStep, applyVariant, isDone, tariffOf, trackOf };
})();
