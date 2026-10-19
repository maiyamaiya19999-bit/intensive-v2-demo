/* Экраны кабинета. Каждая функция возвращает HTML. Данные берутся из App.c (контекст доступа) и App.S (состояние экрана). */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? b : c;
  const bg = k => k ? `style="background-image:url(assets/img/${k}.jpg)"` : '';
  const fmtDate = d => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const pad = n => String(n).padStart(2, '0');
  const typeWord = x => ({ video: 'видео', audio: 'подкаст', task: 'задание', guide: 'гайд' }[x.format] || 'текст');
  const typeIcon = x => x.format === 'task' ? 'pen' : (x.format === 'video' || x.format === 'audio') ? 'play' : x.format === 'guide' ? 'book' : 'text';
  const KIND = { pdf: ['file', 'PDF'], guide: ['book', 'гайд'], check: ['check', 'чек-лист'], slides: ['layers', 'презентация'], example: ['book', 'пример'], table: ['grid', 'таблица'], template: ['file', 'шаблон'], audio: ['play', 'аудио'], prompt: ['spark', 'готовое сообщение'], bonus: ['gift', 'бонус'], link: ['arrow', 'ссылка'], image: ['file', 'картинка'], video: ['play', 'видео'] };
  const link = (url, inner, cls) => url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>` : `<span class="${cls}" style="cursor:default">${inner}</span>`;

  /* ---------- вход ---------- */
  function screenLogin() {
    const S = App.S;
    return `<div class="login">
      <div><span class="badge">Кабинет интенсива</span><h1>Вход <em style="font-style:italic;font-weight:400;color:var(--bordo)">по письму</em></h1></div>
      <div class="note">Введи почту, на которую покупала. Пароля нет: придёт письмо со ссылкой, по ней кабинет откроется.</div>
      ${S.loginSent ? `<div class="card key"><span class="badge">${ico('mail', 'sm')} Письмо отправлено</span><div>Открой почту <b>${esc(S.loginSent)}</b> и нажми ссылку в письме. Если письма нет пару минут — проверь «Спам».</div></div>`
      : `<form id="loginForm" class="section" style="gap:14px"><div class="field"><label class="q" for="loginEmail">Почта</label><input type="email" id="loginEmail" required placeholder="lena@mail.ru" autocomplete="email"></div>
         ${S.loginError ? `<div class="err">${esc(S.loginError)}</div>` : ''}
         <div><button class="btn" type="submit">Получить ссылку для входа</button></div></form>`}
      <div class="meta">Нет доступа? ${CONFIG.LINKS.buy ? `<a href="${esc(CONFIG.LINKS.buy)}" style="color:var(--bordo)">Купить интенсив</a>` : 'Напиши в поддержку.'}</div>
    </div>`;
  }

  /* ---------- анкета ---------- */
  function screenAnketa() {
    const P = App.P, a = (App.c.profile && App.c.profile.answers) || {};
    const opt = (name, v, txt, cur) => `<label class="opt ${cur === v ? 'on' : ''}"><input type="radio" name="${name}" value="${v}" ${cur === v ? 'checked' : ''}><span>${txt}</span></label>`;
    const cb = (arr, id) => arr.map((x, i) => `<label class="opt"><input type="checkbox" name="${id}" value="${esc(x)}" ${(a[id] || []).includes(x) ? 'checked' : ''}><span>${x}</span></label>`).join('');
    const sel = (id, opts, cur) => `<select name="${id}">${opts.map(o => `<option ${cur === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    const track = (App.c.profile && App.c.profile.track) || 'expert';
    return `
    <div class="band tall" ${bg('l')}><span class="big">01</span><div class="kicker"><span class="badge">Перед входом · три минуты</span></div><h1>Ответь на вопросы, и кабинет <em>настроится под тебя</em></h1><p>Три минуты. По ответам кабинет покажет только то, что нужно именно тебе.</p></div>
    <form id="anketaForm" class="section" style="gap:26px">
    <div class="section"><div class="divider">О тебе</div>
      <div class="field"><label class="q"><b>1</b>Имя и ник в Instagram или Telegram</label><div class="grid2"><input type="text" name="name" required placeholder="Лена" value="${esc(a.name || '')}"><input type="text" name="nick" placeholder="@lena_psy" value="${esc(a.nick || '')}"></div></div>
      <div class="field"><label class="q"><b>2</b>О чём твой блог?</label><div class="opts">${opt('track', 'life', 'Про мою жизнь: хочу подписчиков и показать себя', track === 'product' ? 'expert' : track)}${opt('track', 'expert', 'Про мою тему: я в чём-то разбираюсь и хочу этим делиться', track === 'product' ? 'expert' : track)}</div><div class="hint">От этого ответа зависит, какие примеры ты увидишь. Продавать или нет, решает твой тариф.</div></div>
      <div class="field"><label class="q"><b>3</b>Тема блога и что продаёшь, если есть</label><input type="text" name="niche" required placeholder="Нутрициолог, консультации по 4.000 ₽" value="${esc(a.niche || '')}"><div class="hint">Это подставится во все готовые сообщения для нейросети.</div></div>
    </div>
    <div class="section"><div class="divider">Как будешь работать</div>
      <div class="field"><label class="q"><b>4</b>Где будешь проходить интенсив?</label><div class="opts">${opt('device', 'computer', 'Есть компьютер или ноутбук', a.device || 'computer')}${opt('device', 'phone', 'Только телефон', a.device)}</div><div class="hint">С компьютера ИИ-команда сможет монтировать и оформлять за тебя. С телефона тоже всё пройдёшь.</div></div>
      <div class="field"><label class="q"><b>5</b>С какой нейросетью будешь работать?</label><div class="opts">${opt('ai', 'chatgpt', 'ChatGPT', a.ai)}${opt('ai', 'claude', 'Claude', a.ai)}${opt('ai', 'want_claude', 'Хочу Claude, но ещё не пробовала', a.ai)}${opt('ai', 'none', 'Пока ни с какой', a.ai || 'none')}</div><div class="hint">Рекомендуем Claude: он лучше пишет по-русски и умеет работать за тебя на компьютере.</div></div>
      <div class="field"><label class="q"><b>6</b>Есть платная подписка?</label><div class="opts">${opt('plan', 'paid', 'Да, есть платная', a.plan)}${opt('plan', 'want_paid', 'Нет, но хочу оформить', a.plan || 'want_paid')}${opt('plan', 'free', 'Нет, буду в бесплатной', a.plan)}</div><div class="hint">В первом модуле покажем, как оплатить из России. В бесплатной версии тоже всё работает, кабинет подстроит сообщения.</div></div>
    </div>
    <div class="section"><div class="divider">Где ты сейчас</div>
      <div class="field"><label class="q"><b>7</b>Подписчики и просмотры</label><div class="grid2">${sel('subs', ['Подписчиков', 'до 500', '500–3.000', '3.000–10.000', '10.000+'], a.subs)}${sel('views', ['Просмотры reels', 'нет роликов', 'до 500', '500–3.000', '3.000+'], a.views)}</div></div>
      <div class="field"><label class="q"><b>8</b>Что болит сильнее всего? Выбери до трёх</label><div class="opts">${cb(['Делаю много, а результата ноль', 'Не понимаю, что залетает у других', 'Нет времени на блог', 'Боюсь камеры и что подумают знакомые', 'Подписчики есть, денег нет', 'Клиенты приходят нестабильно', 'Не понимаю, о чём писать', 'Стыдно продавать', 'Площадки блокируют, не знаю, где вести', 'Уже сливала деньги на курсы'], 'pains')}</div></div>
      <div class="field"><label class="q"><b>9</b>Сколько блог приносит сейчас в месяц</label>${sel('income', ['Можно не отвечать', 'Ничего', 'до 30.000 ₽', '30.000–100.000 ₽', '100.000 ₽ и больше'], a.income)}</div>
      <div class="field"><label class="q"><b>10</b>Что уже пробовала?</label><div class="opts">${cb(['Курсы по блогу', 'Таргет или реклама у блогера', 'Наставник', 'Нейросети сама', 'Ничего из этого'], 'tried')}</div></div>
    </div>
    <div class="section"><div class="divider">Чего хочешь</div>
      <div class="field"><label class="q"><b>11</b>Какой результат хочешь через полтора месяца? Одним предложением</label><textarea name="goal" placeholder="Чтобы заявки шли из блога, а не только по сарафану">${esc(a.goal || '')}</textarea></div>
      <div class="field"><label class="q"><b>12</b>Что стало последней каплей, почему купила именно сейчас?</label><textarea name="trigger" placeholder="Ролик набрал 100 просмотров, клиентка отменила запись…">${esc(a.trigger || '')}</textarea></div>
      <div class="field"><label class="q"><b>13</b>Откуда узнала обо мне?</label>${sel('source', ['Reels', 'Telegram-канал', 'Бот', 'Рекомендация', 'Другое'], a.source)}</div>
    </div>
    <div class="card"><label class="check"><input type="checkbox" name="consent_pd" required><span>Даю согласие на обработку персональных данных. Без этого кабинет не откроется.</span></label><label class="check"><input type="checkbox" name="consent_case"><span style="color:var(--soft);font-size:12.5px">Можно использовать мой результат как кейс с моим ником. По желанию, необязательно, можно отозвать в профиле в любой момент.</span></label></div>
    <div><button class="btn" type="submit">Сохранить и открыть кабинет</button></div>
    </form>`;
  }

  /* ---------- главная ---------- */
  function screenHome() {
    const c = App.c, P = App.P, tf = c.tf, tr = c.tr;
    const cur = Access.currentStep(c), pr = Access.pct(c), days = Access.daysLeft(c);
    let html = `
    <div class="welcome"><div class="hi"><span>Добро пожаловать,</span><span class="hand">${esc(c.profile.name || '')}</span></div><div class="sub">${esc(tr.from)}</div></div>`;
    if (c.expired) html += expiredCard();
    html += `<div class="duo">
      <div class="mini"><span class="k">Доступ к кабинету</span><span class="v">${days}<small>${plural(days, 'день', 'дня', 'дней')}</small></span><span class="a">до ${fmtDate(Access.accessUntil(c))}</span></div>
      <button class="mini" data-open-step="${cur.mod.id}:${cur.id}"><span class="k">Ты остановилась</span><span class="t">${esc(cur.title)}</span><span class="a">продолжить ${ico('arrow', 'sm')}</span></button>
    </div>
    <div><div class="row" style="margin-bottom:8px"><span class="meta">Пройдено ${pr.done} из ${pr.total} шагов · ${pr.pct}%</span></div><div class="line"><i style="width:${pr.pct}%"></i></div></div>`;
    if (c.autoOpened && tf.key !== 'vip') html += `<div class="note">Ты ничего не сдавала ${P.auto_open_days} дней, поэтому все шаги открыты, а доступ продлён на ${P.auto_extend_days} дней. Задания всё равно лучше сдать: без них ассистенты не узнают тебя.</div>`;

    const mods = c.modules;
    const intro = mods.filter(m => m.intro), base = mods.filter(m => !m.intro && !m.final && !m.na), money = mods.filter(m => (m.tariff || 1) >= 2), fin = mods.filter(m => m.final);
    const card = (m, cls = '') => {
      const st = Access.modState(c, m), n = m.steps.length, mins = m.steps.reduce((a, s) => a + (s.minutes || 0), 0);
      const foot = st === 'na' ? `<span>${micon('close')}в тарифе выше</span>` : st === 'locked' ? `<span>${micon('close')}пока закрыт</span>` : st === 'done' ? `<span>${ico('check')}сделано</span>` : st === 'cur' ? `<span>${ico('check')}ты здесь</span>` : `<span>${ico('check')}можно</span>`;
      return `<button class="mcard ${st} ${cls}" ${bg(m.img)} data-open-mod="${m.id}"><span class="num">${pad(m.id)}</span><span class="name">${esc(m.title)}</span><span class="desc">${m.employee ? esc(m.employee) + ' · ' : ''}${n} ${plural(n, 'шаг', 'шага', 'шагов')} · ${mins} мин</span><div class="bar"><i style="width:${Access.modPct(c, m)}%"></i></div><span class="foot">${foot}<span>${Access.modPct(c, m)}%</span></span></button>`;
    };
    if (intro.length) html += `<div class="sect"><div class="sect-h"><h2>Начни <em>отсюда</em></h2></div><div class="grid">${intro.map(m => card(m, 'wide')).join('')}</div></div>`;
    html += `<div class="sect"><div class="sect-h"><h2>Твоя <em>команда</em></h2><span class="meta">${base.length} ${plural(base.length, 'сотрудник', 'сотрудника', 'сотрудников')}</span></div><div class="grid">${base.map(m => card(m)).join('')}</div></div>`;
    if (tf.level < 2) html += `<div class="sect"><div class="sect-h"><h2>Блог <em>как бизнес</em></h2><span class="meta">в тарифе ${esc(P.tariffs.money.name)}</span></div>${upgradeCard('Продукт, воронка и прогрев')}</div>`;
    html += `<div class="sect"><div class="sect-h"><h2>Финал</h2></div><div class="grid">${fin.map(m => card(m, 'wide')).join('')}</div></div>`;
    html += `<div class="links">
      <a class="linkcard" href="#services"><span class="ic">${ico('gift')}</span><span><div class="t">Бонусы</div><div class="s">${tf.level >= 2 ? P.bonuses.length + ' бонусов открыты' : 'доступны в тарифе Блог как бизнес'}</div></span><span class="go">${ico('arrow')}</span></a>
      ${link(CONFIG.LINKS.chat, `<span class="ic">${ico('chat')}</span><span><div class="t">Чат участниц</div><div class="s">вопросы и ответы, Майя в чате</div></span><span class="go">${ico('arrow')}</span>`, 'linkcard')}
      ${link(CONFIG.LINKS.support, `<span class="ic">${ico('user')}</span><span><div class="t">Поддержка</div><div class="s">${esc(P.support.hours)}</div></span><span class="go">${ico('arrow')}</span>`, 'linkcard')}
    </div>`;
    return html;
  }

  function expiredCard() {
    const c = App.c;
    return `<div class="expired"><span class="badge">${ico('clock', 'sm')} Доступ закончился ${fmtDate(Access.accessUntil(c))}</span><h3>Кабинет открыт только для чтения</h3><div>Твои файлы остаются с тобой в разделе «Мои файлы». Чтобы продолжить по шагам, продли доступ.</div>${CONFIG.LINKS.buy ? `<div><a class="btn" href="${esc(CONFIG.LINKS.buy)}" target="_blank" rel="noopener">Продлить доступ</a></div>` : ''}</div>`;
  }
  function upgradeCard(what) {
    const P = App.P, tf = App.c.tf;
    return `<div class="card key"><span class="badge">${what} нет в твоём тарифе</span><h3>Есть в тарифе <em>${esc(P.tariffs.money.name)}</em></h3><div>Продукт и оффер, бесплатный урок с ботом, прогрев на месяц, плюс ${P.bonuses.length} бонусов и доступ на 6 месяцев.${tf.upgrade_price ? ` Доплата ${tf.upgrade_price}, в любой момент.` : ''}</div>${CONFIG.LINKS.upgrade ? `<div><a class="btn" href="${esc(CONFIG.LINKS.upgrade)}" target="_blank" rel="noopener">Перейти на тариф выше</a></div>` : ''}</div>`;
  }
  function lockedCard() {
    const c = App.c, lk = Access.lockStep(c);
    if (!lk) return '';
    return `<div class="card key"><span class="badge">${ico('lock', 'sm')} Пока закрыт</span><h3>Что сделать, чтобы открыть</h3><div>Сдай задание «${esc(c.P.tasks[lk.task.key].name)}» в шаге ${lk.id}. Шаги идут по порядку, чтобы команда собралась правильно.</div><div><button class="btn ghost" data-open-step="${lk.mod.id}:${lk.id}">Перейти к заданию</button></div></div>`;
  }

  /* ---------- модуль ---------- */
  function screenModule() {
    const c = App.c, mods = c.modules, m = mods.find(x => x.id === App.S.modId) || mods[0];
    const st = Access.modState(c, m), L = c.flat.filter(x => x.mod.id === m.id);
    const n = L.length, mins = L.reduce((a, s) => a + (s.minutes || 0), 0), hws = L.filter(s => s.task).length;
    const kicker = m.intro ? 'Начни отсюда' : (m.tariff || 1) >= 2 ? 'Блог как бизнес' : m.final ? 'Финал' : 'Твоя команда';
    let html = `<div class="lnav"><button class="linkbtn" data-screen="home">← Все модули</button><span class="meta">${m.intro ? 'вводный' : 'модуль ' + m.id + ' из ' + mods.filter(x => !x.intro).length}</span></div>
    <div class="band" ${bg(m.img)}><span class="big">${pad(m.id)}</span><div class="kicker"><span class="badge">${kicker}${m.employee && !m.intro ? ' · ' + esc(m.employee) : ''}</span></div><h1>${esc(m.title)}</h1></div>
    <div class="promise">${esc(m.desc)}</div>
    <div class="mfacts"><span class="pill">${ico('layers')}${n} ${plural(n, 'шаг', 'шага', 'шагов')}</span><span class="pill">${ico('clock')}${mins} мин</span>${hws ? `<span class="pill">${ico('pen')}${hws} ${plural(hws, 'задание', 'задания', 'заданий')}</span>` : ''}</div>`;
    if (c.expired) html += expiredCard();
    else if (st === 'na') html += upgradeCard('Этого модуля');
    else if (st === 'locked') html += lockedCard();
    html += `<div><div class="divider">Шаги по порядку</div><div class="path">${L.map(x => {
      const s = Access.stateOf(c, x);
      const stt = s === 'na' || s === 'locked' ? micon('close') : s === 'done' ? ico('check') + '<i>сделано</i>' : s === 'cur' ? ico('check') + '<i>ты здесь</i>' : ico('check');
      return `<button class="srow ${s}" data-open-step="${m.id}:${x.id}"><span class="n">${x.j + 1}</span><span><div class="t">${esc(x.title)}</div><div class="m">${ico(typeIcon(x))}${typeWord(x)}${x.minutes ? ' · ' + x.minutes + ' мин' : ''}${x.task ? ` · ${ico(x.task.lock ? 'lock' : 'pen')}задание` : ''}${x.assistant ? ` · ${ico('spark')}ассистент` : ''}</div></span><span class="st">${stt}</span></button>`;
    }).join('')}</div></div>`;
    const i = mods.indexOf(m), prev = mods.slice(0, i).reverse().find(x => !x.na), next = mods.slice(i + 1).find(x => !x.na); /* модули чужого тарифа пропускаем */
    html += `<div class="pager">${prev ? `<button class="pbtn" data-open-mod="${prev.id}"><span class="pk">← ${prev.intro ? 'Вводный' : 'Модуль ' + prev.id}</span><span class="pt">${esc(prev.title)}</span></button>` : '<span></span>'}${next ? `<button class="pbtn right" data-open-mod="${next.id}"><span class="pk">Модуль ${next.id} →</span><span class="pt">${esc(next.title)}</span></button>` : ''}</div>`;
    return html;
  }

  /* ---------- шаг ---------- */
  function screenStep() {
    const c = App.c, S = App.S, P = App.P, tf = c.tf, tr = c.tr;
    const m = c.modules.find(x => x.id === S.modId) || c.modules[0];
    const L = c.flat.filter(x => x.mod.id === m.id);
    const x = L.find(s => s.id === S.stepId) || L[0];
    const st = Access.stateOf(c, x);
    let html = `<div class="lnav"><button class="linkbtn" data-open-mod="${m.id}">← ${m.intro ? 'Вводный урок' : 'Модуль ' + m.id + ' · ' + esc(m.employee)}</button><span class="meta">шаг ${x.j + 1} из ${L.length}</span></div>
    <div><h1 style="font-size:24px">${esc(x.title)}</h1></div>
    <div class="resline">${ico('arrow')}<span>${esc(x.result)}</span></div>
    <div class="pills"><span class="pill">${ico(typeIcon(x))}${typeWord(x)}${x.minutes ? ' · ' + x.minutes + ' мин' : ''}</span>${x.task ? (x.task.lock ? `<span class="pill lock">${ico('lock')}задание с замком</span>` : `<span class="pill">${ico('pen')}задание</span>`) : ''}${x.assistant ? `<span class="pill">${ico('spark')}ассистент</span>` : ''}${x.skill ? `<span class="pill">${ico('bolt')}скилл</span>` : ''}</div>`;
    if (c.expired) return html + expiredCard() + pager();
    if (st === 'na') return html + upgradeCard('Этого шага') + pager();
    if (st === 'locked') return html + lockedCard() + pager();

    if (x.from_maya) html += `<div class="why"><span class="hand">Майя</span><p>${esc(x.from_maya)}</p></div>`;
    if (x.video || x.format === 'video' || x.format === 'audio') html += videoBlock(x);
    /* примечание к шагу: пометки кабинета к старым видео */
    if (x.note) html += `<div class="note" style="white-space:pre-line">${esc(x.note)}</div>`;

    /* что сделать по порядку: обычный список или два пути А/Б */
    const todoList = (todo) => `<div class="guide">${todo.map((h, i) => `<div class="gstep"><span class="gn">${i + 1}</span><span><div class="gt">${esc(h)}</div></span></div>`).join('')}</div>`;
    if (x.paths) {
      const key = S.path || (c.profile.has_computer === false ? 'b' : 'a'), p = x.paths[key] || x.paths.a;
      html += `<div class="paths"><div class="divider">Что сделать, по порядку</div><div class="pathtabs">${['a', 'b'].filter(k => x.paths[k]).map(k => `<button data-path="${k}" class="${k === key ? 'on' : ''}"><span class="k">Путь ${k === 'a' ? 'А' : 'Б'}</span>${esc(x.paths[k].title)}</button>`).join('')}</div>${todoList(p.todo || [])}<div><button class="btn quiet" data-copy-list="1">${ico('copy', 'sm')} Скопировать список</button></div></div>`;
      x._todoText = (p.todo || []).map((h, i) => `${i + 1}. ${h}`).join('\n');
    } else if (x.todo && x.todo.length) {
      html += `<div><div class="divider">${(x.format === 'video' || x.format === 'audio') ? 'Что сделать после урока' : 'Что сделать, по порядку'}</div>${todoList(x.todo)}<div style="margin-top:10px"><button class="btn quiet" data-copy-list="1">${ico('copy', 'sm')} Скопировать список</button></div></div>`;
      x._todoText = x.todo.map((h, i) => `${i + 1}. ${h}`).join('\n');
    }
    App.todoText = x._todoText || '';

    if (x.assistant) html += myMessageBlock(x);
    if (x.pack) { const D = Pack.docs(c), n = Pack.assistantIds(c).length; html += `<div class="card key"><span class="badge">${ico('download', 'sm')} Твой пакет</span><h3>${n} ${plural(n, 'помощник', 'помощника', 'помощников')} и ${D.length} ${plural(D.length, 'файл', 'файла', 'файлов')} о тебе</h3><div>${D.length ? 'Внутри: ' + D.map(d => esc(d.title)).join(', ') + ', анкета и все помощники твоего тарифа.' : 'Сначала сдай задание «Распаковка», без него пакет не собрать.'}</div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-pack="zip">${ico('download', 'sm')} Скачать мой пакет</button><button class="btn ghost" data-pack="txt">${ico('file', 'sm')} Одним файлом для телефона</button></div><div class="meta">Первая кнопка для Claude Code на компьютере: архив с папкой «Моя ИИ-команда». Вторая для телефона: файл «Мой пакет».</div></div>`; }
    if (x.check) html += `<div class="donecheck"><span class="badge">${ico('check', 'sm')} Как понять, что получилось</span><div style="font-family:var(--serif);font-size:15.5px;color:var(--ink)">${esc(x.check)}</div></div>`;
    if (x.files && x.files.length) html += `<div class="matsbox"><span class="badge">${ico('file', 'sm')} Файлы к шагу</span><div class="mats">${x.files.map(f => { const k = KIND[f.kind] || ['file', f.kind || 'файл']; const closed = f.kind === 'bonus' && c.tf.level < 2; /* бонусы открыты только на «Блоге как бизнес» */ const u = closed ? '' : f.url && f.url.startsWith('content/files/') && !f.url.includes('?') ? f.url + '?t=' + c.tf.key : f.url; return link(u, `<span class="ic">${ico(closed ? 'lock' : k[0])}</span><span><div class="t">${esc(f.title.replace(/\s*\(тариф «Блог как бизнес»\)/, ''))}</div><div class="s">${k[1]}${closed ? ' · в тарифе «' + esc(P.tariffs.money.name) + '»' : f.url ? '' : ' · скоро'}</div></span><span class="a">${closed ? '' : ico('arrow')}</span>`, 'mat'); }).join('')}</div></div>`;
    if (x.skill) html += `<div class="card"><span class="badge">${ico('bolt', 'sm')} Скилл к шагу: ${esc(x.skill.name)}</span><div>Для Claude Code на компьютере. Ставится одной командой, и дальше Claude делает это за тебя.</div>${x.skill.command ? `<div class="prompt">${esc(x.skill.command)}</div><div><button class="btn ghost" data-copy-text="${esc(x.skill.command)}">${ico('copy', 'sm')} Скопировать команду</button></div>` : `<div class="meta">Команда установки появится здесь.</div>`}</div>`;
    if (x.task) html += taskBlock(x);
    html += `<div class="support"><span><div class="t">Что-то не получается на этом шаге?</div><div class="s">Напиши, ответим ${esc(P.support.hours)}</div></span>${link(CONFIG.LINKS.support, `${ico('chat')} Написать`, 'btn ghost')}</div>`;
    return html + pager();

    function pager() {
      const p = L[x.j - 1], n = L[x.j + 1], mi = c.modules.indexOf(m), nm = c.modules.slice(mi + 1).find(z => !z.na && c.flat.some(s => s.mod.id === z.id)), nmFirst = nm && c.flat.find(s => s.mod.id === nm.id);
      return `<div class="pager">${p ? `<button class="pbtn" data-open-step="${m.id}:${p.id}"><span class="pk">← Назад</span><span class="pt">${esc(p.title)}</span></button>` : `<button class="pbtn" data-open-mod="${m.id}"><span class="pk">← Модуль</span><span class="pt">${esc(m.title)}</span></button>`}${n ? `<button class="pbtn right" data-next="${m.id}:${n.id}"><span class="pk">Дальше →</span><span class="pt">${esc(n.title)}</span></button>` : nm ? `<button class="pbtn right" data-next="${nm.id}:${nmFirst.id}"><span class="pk">Модуль пройден →</span><span class="pt">${esc(nm.title)}</span></button>` : `<button class="pbtn right" data-next="home"><span class="pk">Это последний шаг</span><span class="pt">На главную</span></button>`}</div>`;
    }
  }

  function videoBlock(x) {
    const id = x.video && x.video.kinescope_id, label = x.format === 'audio' ? 'подкаст' : 'урок';
    if (id) { const who = [App.c.profile.email, App.c.profile.nick].filter(Boolean).join(' · '); return `<div class="video"><iframe src="${esc(CONFIG.KINESCOPE_EMBED + id)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="${esc(x.title)}"></iframe><span class="vwm">${esc(who)}</span></div>`; }
    return `<div class="video"><button class="playbtn" disabled style="opacity:.7">${ico('play')} ${label}${x.minutes ? ' · ' + x.minutes + ' мин' : ''}</button><span class="lbl" style="position:absolute;left:14px;bottom:10px">видео появится здесь</span><span class="wm">${esc(App.c.profile.nick || '')} · защищено</span></div>`;
  }

  /* «Скопировать моё сообщение» */
  function myMessageBlock(x) {
    const S = App.S, pv = S.msg && S.msg.assistant === x.assistant ? S.msg : null;
    let html = `<div class="mymsg"><span class="badge">${ico('spark', 'sm')} Готовое сообщение для нейросети</span><div class="t">${x.assistant_howto ? esc(x.assistant_howto) : 'Нажми кнопку — и в буфере будет сообщение, в котором уже есть твои файлы, имя и ниша. Останется вставить в нейросеть и отправить.'}</div>`;
    if (pv && pv.missing.length) html += `<div class="miss">Пока не хватает: ${pv.missing.map(mm => mm.step ? `задание «${esc(mm.name)}» (шаг ${mm.step.id}) — <button class="linkbtn" style="color:var(--bordo)" data-open-step="${mm.step.mod.id}:${mm.step.id}">сдать</button>` : `«${esc(mm.name)}»`).join('; ')}. Сообщение скопировано с пометкой, где должен быть файл.</div>`;
    html += `<div class="row"><button class="btn" data-copy-msg="${esc(x.assistant)}">${ico('copy', 'sm')} Скопировать моё сообщение</button>${pv ? `<span class="meta" style="color:var(--ok)">${ico('check', 'sm')} скопировано · ${pv.text.length} знаков</span>` : ''}</div>`;
    if (pv) html += `<details><summary>Посмотреть, что скопировалось</summary><pre>${esc(pv.text)}</pre></details>`;
    return html + `</div>`;
  }

  /* задание */
  function taskBlock(x) {
    const c = App.c, P = App.P, S = App.S, t = x.task, info = P.tasks[t.key] || { name: t.key }, sub = c.subMap[t.key], left = Access.editsLeft(c, t.key);
    const editing = S.editing === t.key;
    let html = `<div class="card ${t.lock ? 'key' : ''}"><span class="badge">${ico('pen', 'sm')} Задание</span><h3>${esc(info.name)}</h3>${t.lock ? `<div class="meta">${ico('unlock', 'sm')} после сдачи откроются следующие шаги</div>` : ''}`;
    if (sub && !editing) {
      html += `<div class="meta" style="color:var(--ok)">${ico('check', 'sm')} Сдано ${fmtDate(sub.latest.created_at)}${sub.count > 1 ? ' · версия ' + sub.count : ''}. Лежит в «Мои файлы».</div>`;
      if (sub.latest.text) html += `<div class="sub-text">${esc(sub.latest.text)}</div>`;
      if (sub.latest.file_name) html += `<div class="meta">${ico('file', 'sm')} ${esc(sub.latest.file_name)}</div>`;
      html += `<div class="row"><button class="btn quiet" data-edit="${t.key}" ${left > 0 ? '' : 'disabled'}>${ico('pen', 'sm')} Поменять или дополнить</button><span class="meta">${left > 0 ? `можно поменять ещё: ${left}` : 'поменять больше нельзя'}</span></div>`;
    } else {
      const checks = (t.selfcheck || []).map(s => s.replace('{{ПРИМЕРЫ}}', c.tr.examples));
      html += `<div>${sub ? `Это будет версия ${sub.count + 1}. После неё поменять можно ещё: ${left - 1}.` : `Сдать можно один раз. Потом поменять ещё ${Access.editsWord(c.tf)}.`} ${t.lock ? 'Из этого файла ассистенты узнают тебя, поэтому пиши подробно и честно.' : ''}</div>
        ${checks.length ? `<div class="field"><span class="q" style="font-size:14.5px">Проверь перед сдачей</span>${checks.map(s => `<label class="check"><input type="checkbox" class="selfcheck">${esc(s)}</label>`).join('')}</div>` : ''}
        <form id="hwForm" class="field" data-key="${t.key}"><span class="q" style="font-size:14.5px">${t.type === 'link' ? 'Вставь ссылку' : 'Вставь текст или прикрепи файл'}</span><textarea id="hwtext" name="text" placeholder="${t.type === 'link' ? 'https://…' : 'Скопируй сюда ответ нейросети целиком'}">${sub && sub.latest.text ? esc(sub.latest.text) : ''}</textarea>${t.type !== 'link' ? `<input type="file" name="file" accept=".txt,.md,.pdf,.doc,.docx,.rtf,.png,.jpg,.jpeg">` : ''}
        <div class="row" style="margin-top:6px"><button class="btn" type="submit" id="submitHw" ${checks.length ? 'disabled' : ''}>Сдать задание</button>${editing ? `<button class="linkbtn" type="button" data-cancel-edit="1">отмена</button>` : ''}</div>${checks.length ? `<div class="meta">Кнопка включится, когда отметишь все пункты.</div>` : ''}</form>`;
    }
    return html + `</div>`;
  }

  /* ---------- мои файлы ---------- */
  function screenFiles() {
    const c = App.c, P = App.P;
    const rows = [{ name: 'Анкета при входе', st: 'сдано', ok: true }];
    c.flat.filter(x => x.task && !x.na).forEach(x => { const s = c.subMap[x.task.key]; rows.push({ name: P.tasks[x.task.key].name, key: x.task.key, st: s ? 'сдано · ' + fmtDate(s.latest.created_at) + (s.count > 1 ? ' · v' + s.count : '') : 'ждёт · шаг ' + x.id, ok: !!s, sub: s && s.latest, step: x }); });
    const n = rows.filter(r => r.ok).length;
    return `<div class="band" ${bg('m')}><span class="big">${pad(n)}</span><div class="kicker"><span class="badge">Мои файлы</span><span class="meta">из ${rows.length}</span></div><h1>Здесь лежит всё, <em>что ты сдала</em></h1><p>Из этих файлов собираются все готовые сообщения для нейросети. В финале из них соберётся твой пакет ассистентов. Папка останется у тебя навсегда.</p></div>
    <div class="list">${rows.map(r => `<div class="item"><span><div class="t">${esc(r.name)}</div>${r.sub && r.sub.file_name ? `<div class="s">${ico('file', 'sm')} ${esc(r.sub.file_name)}${r.sub.file_path ? ` · <a href="#" data-file-of="${esc(r.key)}">открыть</a>` : ''}</div>` : ''}</span><span class="st ${r.ok ? 'ok' : ''}">${r.step ? `<button class="linkbtn" data-open-step="${r.step.mod.id}:${r.step.id}" style="font-family:var(--meta);font-style:italic;font-size:12.5px;color:${r.ok ? 'var(--ok)' : 'var(--soft)'}">${r.st}</button>` : r.st}</span></div>`).join('')}</div>
    <div><button class="btn ghost" data-download-all="1">${ico('download')} Скачать всё одним файлом</button></div>
    <div class="note">Каждый файл сдаётся один раз. Поменять можно ${Access.editsWord(c.tf)}.</div>`;
  }

  /* ---------- сервисы и бонусы ---------- */
  function screenServices() {
    const c = App.c, P = App.P;
    let html = `<div class="band" ${bg('n')}><span class="big">00</span><div class="kicker"><span class="badge">Можно смотреть всегда</span></div><h1>Сервисы</h1><p>Ссылки на всё, что понадобится по ходу. Заданий здесь нет.</p></div>`;
    P.services.forEach(g => { html += `<div class="sgroup"><div class="divider">${esc(g.group)}</div><div class="sgrid">${g.items.map(x => link(x.url, `<span class="sname">${esc(x.name)}</span><span class="ssub">${esc(x.desc)}</span><span class="sfoot"><span class="smeta">${x.when ? 'понадобится в ' + esc(x.when.replace('модуль', 'модуле')) : 'с первого дня'}</span><span class="sgo">${ico('arrow')}</span></span>`, 'scard')).join('')}</div></div>`; });
    html += `<div class="sgroup"><div class="divider">Бонусы</div><div class="meta">${c.tf.level >= 2 ? 'Открыты на твоём тарифе' : 'Открываются в тарифе Блог как бизнес'}</div><div>${P.bonuses.map(b => `<div class="bonus"><span class="ic">${ico('gift')}</span><span><div class="t">${c.tf.level >= 2 && b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${esc(b.title)}</a>` : esc(b.title)}</div><div class="s">${esc(b.desc)}${c.tf.level >= 2 && !b.url ? ' · скоро' : ''}</div></span></div>`).join('')}</div></div>`;
    html += `<div class="meta">${esc(P.support.note_partner)}</div>`;
    return html;
  }

  /* ---------- профиль ---------- */
  function screenProfile() {
    const c = App.c, P = App.P, tf = c.tf, tr = c.tr, p = c.profile;
    return `<div class="band" ${bg('o')}><span class="hand" style="font-size:62px;position:absolute;right:22px;top:16px">${esc(p.name || '')}</span><div class="kicker"><span class="badge">Профиль</span></div><h1 style="font-size:22px">${esc(p.nick || p.email || '')}</h1><p>${esc(tf.name)} · ${esc(tr.name)}</p></div>
    <div class="list">
      <div class="item"><span class="t">Почта</span><span class="st">${esc(p.email || Store.user.email)}</span></div>
      <div class="item"><span class="t">Тариф</span><span class="st">${esc(tf.name)} · ${esc(tf.price)}</span></div>
      <div class="item"><span class="t">Доступ</span><span class="st">до ${fmtDate(Access.accessUntil(c))}</span></div>
      <div class="item"><span class="t">Маршрут</span><span class="st">${esc(tr.name)}</span></div>
      <div class="item"><span class="t">Нейросеть</span><span class="st">${{ claude: 'Claude', chatgpt: 'ChatGPT' }[p.ai] || 'ещё не выбрана'}</span></div>
      <div class="item"><span class="t">Компьютер</span><span class="st">${p.has_computer === false ? 'только телефон' : 'есть'}</span></div>
      <div class="item"><span class="t">Поменять задание можно</span><span class="st">${tf.edits >= 99 ? 'без ограничений' : Access.editsWord(tf)}</span></div>
    </div>
    <div class="row">${tf.key !== 'vip' && CONFIG.LINKS.upgrade ? `<a class="btn ghost" href="${esc(CONFIG.LINKS.upgrade)}" target="_blank" rel="noopener">Перейти на тариф выше</a>` : ''}<button class="btn quiet" data-screen="anketa">Посмотреть ответы анкеты</button>${App.mode === 'supabase' ? `<button class="btn quiet" data-signout="1">Выйти</button>` : ''}</div>
    <div class="how"><span class="badge">Как здесь всё работает</span><div class="how-steps"><span>${ico('play')}<span><b>1. Открываешь шаг</b>видео или текст на 5–15 минут</span></span><span>${ico('spark')}<span><b>2. Копируешь моё сообщение</b>в нём уже твои файлы, вставляешь в нейросеть</span></span><span>${ico('pen')}<span><b>3. Сдаёшь результат</b>если в шаге есть задание</span></span><span>${ico('unlock')}<span><b>4. Следующий шаг открывается сам</b>без проверки, сразу</span></span></div></div>
    <div class="note">${esc(P.locks_note)}</div>
    <div class="support"><span><div class="t">Поддержка</div><div class="s">Поможем с доступом и кабинетом. ${esc(P.support.hours)}</div></span>${link(CONFIG.LINKS.support, `${ico('chat')} Написать`, 'btn ghost')}</div>
    <div class="card"><label class="check"><input type="checkbox" id="consentCase" ${p.consent_case ? 'checked' : ''}><span style="font-size:13px">Можно использовать мой результат как кейс с моим ником. Можно отозвать в любой момент.</span></label></div>`;
  }

  function screenError(msg) {
    return `<div class="err"><b>Кабинет не открылся.</b><br>${esc(msg)}<br><br>Если ты открыла файл двойным кликом — запусти <code>старт.command</code> рядом с index.html или открой кабинет по адресу сайта.</div>`;
  }

  window.Screens = { login: screenLogin, anketa: screenAnketa, home: screenHome, module: screenModule, step: screenStep, files: screenFiles, services: screenServices, profile: screenProfile, error: screenError, esc };
})();
