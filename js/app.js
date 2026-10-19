/* Каркас кабинета: загрузка, вход, маршруты (#home, #module/2, #step/2/2.1, #files, #services, #profile, #anketa),
   обработка кликов и форм, демо-панель. */
(function () {
  const App = window.App = {
    S: { screen: 'home', modId: 0, stepId: null, path: null, demoBar: false, msg: null, editing: null, loginSent: null, loginError: null },
    P: null, c: null, mode: 'demo', profile: null, subs: [], progress: [], todoText: '', ready: false, error: null
  };
  const $ = id => document.getElementById(id);
  const esc = s => Screens.esc(s);

  /* ---------- всплывашка ---------- */
  let toastT = null;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
  App.toast = toast;

  /* ---------- данные ---------- */
  async function loadData() {
    App.profile = await Store.getProfile();
    if (App.profile) { App.subs = await Store.listSubmissions(); App.progress = await Store.getProgress(); }
    else { App.subs = []; App.progress = []; }
    App.c = Access.ctx(App.P, App.profile || {}, App.subs, App.progress);
  }
  App.reload = async function () { try { await loadData(); } catch (e) { App.error = e.message; } render(); };

  /* ---------- маршруты ---------- */
  function route() {
    const h = (location.hash || '#home').slice(1);
    if (/access_token|refresh_token|error_description/.test(h)) return; // хвост magic link от Supabase
    const [screen, a, b] = h.split('/');
    const S = App.S;
    S.msg = null; S.editing = null;
    if (screen === 'module') { S.screen = 'module'; S.modId = +a; }
    else if (screen === 'step') { S.screen = 'step'; S.modId = +a; S.stepId = b; S.path = null; }
    else if (['home', 'files', 'services', 'profile', 'anketa'].includes(screen)) S.screen = screen;
    else S.screen = 'home';
  }
  function go(hash) { if (location.hash === '#' + hash) { route(); render(); } else location.hash = hash; }
  window.addEventListener('hashchange', () => { route(); render(); });

  /* ---------- рендер ---------- */
  function render() {
    const S = App.S, c = App.c, content = $('content');
    if (App.error) { content.innerHTML = Screens.error(App.error); return; }
    if (!App.ready) { content.innerHTML = '<div class="loading">Открываю кабинет…</div>'; return; }
    let screen = S.screen;
    if (App.mode === 'supabase' && !Store.user) screen = 'login';
    else if (!App.profile && App.mode === 'supabase') screen = 'nopay';
    else if (!App.profile || !App.profile.consent_pd) screen = 'anketa';

    if (screen === 'login') content.innerHTML = Screens.login();
    else if (screen === 'nopay') content.innerHTML = `<div class="login"><span class="badge">Кабинет интенсива</span><h1>Не нашли оплату для <em style="font-style:italic;font-weight:400;color:var(--bordo)">${esc(Store.user.email)}</em></h1><div class="note">Если платила с другой почты — напиши в поддержку, перенесём. ${CONFIG.LINKS.support ? `<a href="${esc(CONFIG.LINKS.support)}" style="color:var(--bordo)">Написать</a>.` : ''}</div><div><button class="btn quiet" data-signout="1">Выйти</button></div></div>`;
    else content.innerHTML = Screens[screen]();

    const logged = screen !== 'login' && screen !== 'nopay';
    $('who').textContent = logged && App.profile ? (App.profile.nick || App.profile.name || '') : '';
    const tabs = ['home', 'files', 'services', 'profile'], TI = { home: 'home', files: 'folder', services: 'grid', profile: 'user' }, TN = { home: 'Главная', files: 'Мои файлы', services: 'Сервисы', profile: 'Профиль' };
    const act = k => S.screen === k || ((S.screen === 'step' || S.screen === 'module') && k === 'home');
    $('tabs').innerHTML = logged && screen !== 'anketa' ? tabs.map(k => `<button class="${act(k) ? 'on' : ''}" data-screen="${k}">${ticon(TI[k])}${TN[k]}</button>`).join('') : '';
    $('rail').innerHTML = logged && c && App.profile ? `<div><div style="font-family:var(--serif);color:var(--ink);font-size:17px">${esc(App.profile.name || '')}</div><div class="meta">${esc(c.tf.name)} · ${esc(c.tr.name)}</div></div><nav>${tabs.map(k => `<button class="${act(k) ? 'on' : ''}" data-screen="${k}">${TN[k]}</button>`).join('')}</nav><div class="meta" style="margin-top:auto">доступ до ${Access.accessUntil(c).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div><div class="hand" style="font-size:30px">Майя</div>` : '';
    renderDemoBar();
    window.scrollTo({ top: 0 });
  }
  App.render = render;

  function renderDemoBar() {
    const d = $('demo'), tg = $('demoToggle');
    tg.classList.toggle('hidden', App.mode !== 'demo');
    d.classList.toggle('on', App.mode === 'demo' && App.S.demoBar);
    if (App.mode !== 'demo' || !App.S.demoBar) return;
    const P = App.P, p = App.profile || {}, c = App.c;
    if (!App.profile) { d.innerHTML = `<span class="lbl">демо</span><button data-demo-quick="1">Заполнить анкету за меня</button>`; return; }
    d.innerHTML = `<span class="lbl">о чём блог</span>${Object.entries(P.tracks).filter(([k]) => k !== 'product').map(([k, v]) => `<button data-demo-track="${k}" class="${p.track === k ? 'on' : ''}">${esc(v.name)}</button>`).join('')}
      <span class="lbl">тариф</span>${Object.entries(P.tariffs).map(([k, v]) => `<button data-demo-tariff="${k}" class="${p.tariff === k ? 'on' : ''}">${esc(v.name)}</button>`).join('')}
      <span class="lbl">сдано</span>${Object.entries(P.tasks).filter(([, v]) => v.lock).map(([k, v]) => `<button data-demo-task="${k}" class="${c.subMap[k] ? 'on' : ''}">${esc(v.name)}</button>`).join('')}
      <button data-demo-idle="1" class="${p.auto_opened ? 'on' : ''}">14 дней без сдач</button><button data-demo-expired="1" class="${c.expired ? 'on' : ''}">доступ истёк</button>
      <button class="reset" data-demo-reset="1">Сбросить демо</button>`;
  }

  /* ---------- действия ---------- */
  async function openStep(spec) {
    const [mi, sid] = spec.split(':'); const c = App.c;
    const x = c.flat.find(s => s.id === sid);
    if (x && !c.expired) { const st = Access.stateOf(c, x); if (st !== 'locked' && st !== 'na' && st !== 'done') { await Store.setProgress(+mi, sid, 'visited'); await loadData(); } }
    go(`step/${mi}/${sid}`);
  }
  async function nextFrom(spec) {
    const S = App.S, c = App.c, x = c.flat.find(s => s.id === S.stepId);
    if (x && !c.expired && !x.na && Access.stateOf(c, x) !== 'locked') { await Store.setProgress(x.mod.id, x.id, 'done'); await loadData(); }
    if (spec === 'home') go('home'); else openStep(spec);
  }
  async function copyMessage(assistantId) {
    try {
      const r = await Prompt.build(assistantId, App.c);
      const ok = await Prompt.copy(r.text);
      App.S.msg = { assistant: assistantId, text: r.text, missing: r.missing };
      render();
      toast(ok ? (r.missing.length ? 'Скопировано, но не хватает файлов — смотри пометку' : 'Скопировано. Вставь в нейросеть и отправь') : 'Не удалось скопировать — выдели текст ниже и скопируй вручную');
    } catch (e) { toast('Не нашла текст ассистента: ' + e.message); }
  }
  async function submitTask(form) {
    const key = form.dataset.key, text = (form.text.value || '').trim(), file = form.file && form.file.files[0];
    if (!text && !file) { toast('Вставь текст или прикрепи файл'); return; }
    const left = Access.editsLeft(App.c, key);
    if (App.c.subMap[key] && left <= 0) { toast('Поменять больше нельзя'); return; }
    const btn = form.querySelector('#submitHw'); btn.disabled = true; btn.textContent = 'Сохраняю…';
    try {
      await Store.submit(key, { text, file });
      const x = Access.stepOfTask(App.c, key);
      if (x) await Store.setProgress(x.mod.id, x.id, 'done');
      App.S.editing = null;
      await loadData(); render();
      toast(App.P.tasks[key].lock ? 'Сдано. Следующие шаги открыты' : 'Сдано');
    } catch (e) { btn.disabled = false; btn.textContent = 'Сдать задание'; toast('Не сохранилось: ' + e.message); }
  }
  async function submitAnketa(form) {
    const fd = new FormData(form), answers = {};
    for (const [k, v] of fd.entries()) { if (answers[k] === undefined) answers[k] = v; else answers[k] = [].concat(answers[k], v); }
    ['pains', 'tried'].forEach(k => { answers[k] = answers[k] ? [].concat(answers[k]) : []; });
    const patch = { name: answers.name, nick: answers.nick || '', niche: answers.niche, track: answers.track || 'life', has_computer: answers.device !== 'phone', ai: answers.ai === 'want_claude' ? 'claude' : (answers.ai || 'none'), plan: answers.plan || 'want_paid', consent_pd: !!fd.get('consent_pd'), consent_case: !!fd.get('consent_case'), answers };
    if (App.mode === 'demo' && !(App.profile && App.profile.tariff)) {
      const t = 'money', today = new Date(), until = new Date(today.getTime() + App.P.tariffs[t].days * 86400000);
      Object.assign(patch, { email: 'demo@example.com', tariff: t, start_date: today.toISOString().slice(0, 10), access_until: until.toISOString().slice(0, 10), auto_opened: false });
    }
    if (App.profile && App.profile.consent_pd) { delete patch.consent_pd; } // анкету уже сдавали: обновляем ответы, согласие не трогаем
    try { await Store.saveProfile(patch); await loadData(); go('home'); render(); toast('Кабинет настроен под тебя'); }
    catch (e) { toast('Не сохранилось: ' + e.message); }
  }
  async function downloadAll() {
    const c = App.c, parts = [`Мои файлы · ${c.profile.name || ''} · ${new Date().toLocaleDateString('ru-RU')}`, ''];
    c.flat.filter(x => x.task && c.subMap[x.task.key]).forEach(x => { const s = c.subMap[x.task.key].latest; parts.push(`===== ${App.P.tasks[x.task.key].name} (шаг ${x.id}) =====`, s.text || (s.file_name ? `[файл: ${s.file_name}]` : ''), ''); });
    if (parts.length <= 2) { toast('Пока нечего скачивать'); return; }
    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'мои-файлы.txt'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- демо-панель ---------- */
  async function demoAction(b) {
    const D = Store.demo, p = App.profile || {}, P = App.P;
    const setTariff = async (t) => { const start = p.start_date || new Date().toISOString().slice(0, 10); const until = new Date(new Date(start).getTime() + P.tariffs[t].days * 86400000).toISOString().slice(0, 10); await D.saveProfile({ tariff: t, access_until: until }); };
    if (b.dataset.demoQuick) await D.quickProfile(P.tariffs);
    else if (b.dataset.demoTrack) await D.saveProfile({ track: b.dataset.demoTrack });
    else if (b.dataset.demoTariff) await setTariff(b.dataset.demoTariff);
    else if (b.dataset.demoTask) { const k = b.dataset.demoTask; if (App.c.subMap[k]) D.unsubmit(k); else await D.submit(k, { text: `[демо] текст задания «${P.tasks[k].name}»` }); }
    else if (b.dataset.demoIdle) await D.saveProfile({ auto_opened: !p.auto_opened });
    else if (b.dataset.demoExpired) { if (App.c.expired) await setTariff(p.tariff || 'money'); else await D.saveProfile({ access_until: '2020-01-01' }); }
    else if (b.dataset.demoReset) { D.reset(); location.hash = '#home'; }
    await loadData(); render();
  }

  /* ---------- события ---------- */
  document.addEventListener('click', async e => {
    const q = sel => e.target.closest(sel); let b;
    if (q('#demoToggle')) { App.S.demoBar = !App.S.demoBar; renderDemoBar(); return; }
    if (b = q('[data-demo-quick],[data-demo-track],[data-demo-tariff],[data-demo-task],[data-demo-idle],[data-demo-expired],[data-demo-reset]')) { demoAction(b); return; }
    if (b = q('[data-screen]')) { go(b.dataset.screen); return; }
    if (b = q('[data-open-mod]')) { go('module/' + b.dataset.openMod); return; }
    if (b = q('[data-open-step]')) { openStep(b.dataset.openStep); return; }
    if (b = q('[data-next]')) { nextFrom(b.dataset.next); return; }
    if (b = q('[data-path]')) { App.S.path = b.dataset.path; render(); return; }
    if (b = q('[data-copy-msg]')) { copyMessage(b.dataset.copyMsg); return; }
    if (b = q('[data-copy-list]')) { toast((await Prompt.copy(App.todoText)) ? 'Список скопирован' : 'Не удалось скопировать'); return; }
    if (b = q('[data-copy-text]')) { toast((await Prompt.copy(b.dataset.copyText)) ? 'Скопировано' : 'Не удалось скопировать'); return; }
    if (b = q('[data-edit]')) { if (b.disabled) return; App.S.editing = b.dataset.edit; render(); return; }
    if (b = q('[data-cancel-edit]')) { App.S.editing = null; render(); return; }
    if (b = q('[data-download-all]')) { downloadAll(); return; }
    if (b = q('[data-pack]')) { (b.dataset.pack === 'zip' ? Pack.downloadZip(App.c) : Pack.downloadTxt(App.c)).then(err => toast(err || 'Пакет скачан')).catch(e => toast('Не получилось собрать пакет: ' + e.message)); return; }
    if (b = q('[data-file-of]')) { e.preventDefault(); const s = App.c.subMap[b.dataset.fileOf]; const url = s && await Store.fileUrl(s.latest); if (url) window.open(url, '_blank'); else toast('Файл недоступен'); return; }
    if (b = q('[data-signout]')) { await Store.signOut(); App.profile = null; location.hash = '#home'; render(); return; }
  });
  document.addEventListener('submit', async e => {
    const f = e.target;
    if (f.id === 'loginForm') { e.preventDefault(); const email = f.loginEmail.value.trim(); const r = await Store.signIn(email); App.S.loginSent = r.ok ? email : null; App.S.loginError = r.ok ? null : 'Не получилось отправить письмо: ' + r.error; render(); return; }
    if (f.id === 'anketaForm') { e.preventDefault(); submitAnketa(f); return; }
    if (f.id === 'hwForm') { e.preventDefault(); submitTask(f); return; }
  });
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.classList.contains('selfcheck')) { const all = [...document.querySelectorAll('.selfcheck')].every(c => c.checked); const btn = $('submitHw'); if (btn) btn.disabled = !all; return; }
    if (['track','ai','device','plan'].includes(t.name)) { document.querySelectorAll(`input[name=${t.name}]`).forEach(i => i.closest('.opt').classList.toggle('on', i.checked)); return; }
    if (t.id === 'consentCase') { await Store.saveProfile({ consent_case: t.checked }); await loadData(); toast(t.checked ? 'Спасибо, согласие сохранено' : 'Согласие отозвано'); return; }
  });
  let ticking = false; window.addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { document.documentElement.style.setProperty('--py', String(window.scrollY)); ticking = false; }); }, { passive: true });

  /* ---------- старт ---------- */
  (async function boot() {
    const params = new URLSearchParams(location.search);
    App.mode = (params.get('demo') === '1' || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) ? 'demo' : 'supabase';
    document.body.classList.toggle('is-demo', App.mode === 'demo');
    loadMasks(() => { if (App.ready) render(); });
    render();
    try {
      App.P = await Content.load();
      await Store.init(App.mode);
      if (App.mode === 'demo' || Store.user) await loadData();
      App.ready = true;
      route();
    } catch (e) { App.error = e.message; }
    render();
  })();
})();

/* защита: копировать можно только кнопками кабинета и из полей ввода */
(function () {
  const okField = t => t && t.closest && t.closest('input,textarea,select,[contenteditable]');
  ['copy', 'cut'].forEach(ev => document.addEventListener(ev, e => { if (!okField(e.target)) e.preventDefault(); }));
  document.addEventListener('contextmenu', e => { if (!okField(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (!okField(e.target)) e.preventDefault(); });
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase())) e.preventDefault(); });
  setInterval(() => { document.querySelectorAll('.video .vwm').forEach(w => { w.style.top = (8 + Math.random() * 70) + '%'; w.style.left = (5 + Math.random() * 55) + '%'; }); }, 15000);
})();
