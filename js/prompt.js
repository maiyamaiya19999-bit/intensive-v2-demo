/* Механика «Скопировать моё сообщение».
   Берём текст ассистента из content/assistants/<id>.md, подставляем вместо {{ПЛЕЙСХОЛДЕРОВ}}
   тексты, которые ученица сдала в заданиях, имя и нишу из анкеты, общие правила письма —
   и копируем в буфер. Если нужного файла нет, говорим, какое задание сдать. */
(function () {
  const RE = /\{\{([А-ЯЁA-Z_]+)\}\}/g;

  /* какие плейсхолдеры есть в тексте */
  function placeholders(text) { const out = new Set(); let m; while ((m = RE.exec(text))) out.add(m[1]); RE.lastIndex = 0; return [...out]; }

  /* значение плейсхолдера: из задания, из анкеты или из общего файла правил */
  function valueOf(name, c, rules) {
    const p = c.profile || {};
    if (name === 'ИМЯ') return p.name || '';
    if (name === 'НИША') return p.niche || '';
    if (name === 'ПРАВИЛА_ПИСЬМА') return rules || '';
    if (name === 'ПРИМЕРЫ') return c.tr.examples || '';
    if (p.plan === 'free' && ['РАСПАКОВКА', 'АУДИТОРИЯ'].includes(name) && c.subMap.passport) {
      /* бесплатная нейросеть: вместо двух самых длинных файлов (распаковка и аудитория) один паспорт.
         Позиционирование, продукт и оффер короткие и собираются после паспорта (шаги 3.1–3.3),
         поэтому они подставляются как есть, своими файлами. */
      return name === 'РАСПАКОВКА' ? (c.subMap.passport.latest.text || '') : '[аудитория уже есть в паспорте выше]';
    }
    const key = Object.keys(c.P.tasks).find(k => c.P.tasks[k].placeholder === name);
    if (!key) return null;
    const st = Access.stepOfTask(c, key);
    if (!st || st.na) return ''; /* файла нет в тарифе: дальше подставится пометка «блог без продукта» */
    const m = c.subMap[key];
    return m ? (m.latest.text || (m.latest.file_name ? `[файл ${m.latest.file_name}]` : '')) : '';
  }

  /* собирает сообщение; missing — задания, которых не хватает */
  /* файл ассистента = «## Как пользоваться» + «---» + «## Готовое сообщение» + текст.
     В буфер идёт только текст после заголовка «## Готовое сообщение» (если заголовка нет — весь файл).
     Правила письма берутся из 00_правила_письма.md начиная со строки «## Правила письма». */
  function messageOf(src) {
    const i = src.indexOf('## Готовое сообщение');
    return i < 0 ? src : src.slice(i).replace(/^## Готовое сообщение[^\n]*\n+/, '');
  }
  function rulesOf(src) { const i = src.indexOf('## Правила письма'); return (i < 0 ? src : src.slice(i)).trim(); }

  /* документы ({{РАСПАКОВКА}} и т.п.) подставляются только там, где плейсхолдер стоит отдельной строкой;
     упоминание внутри фразы (например, в Сборщике пакета: «места для вставки вида {{РАСПАКОВКА}}») не трогаем.
     {{ИМЯ}} и {{НИША}} подставляются везде. */
  const INLINE_OK = { 'ИМЯ': 1, 'НИША': 1, 'ПРИМЕРЫ': 1 };
  const RE_LINE = /^[ \t]*\{\{([А-ЯЁA-Z_]+)\}\}[ \t]*$|\{\{([А-ЯЁA-Z_]+)\}\}/gm;

  async function build(assistantId, c) {
    const src = messageOf(await Content.assistant(assistantId));
    const needRules = /^\s*\{\{ПРАВИЛА_ПИСЬМА\}\}\s*$/m.test(src);
    const rules = needRules ? rulesOf(await Content.rules()) : '';
    const missing = [];
    const text = src.replace(RE_LINE, (all, lineName, inlineName) => {
      const name = lineName || inlineName;
      if (inlineName && !INLINE_OK[inlineName]) return all;
      const v = valueOf(name, c, rules);
      if (v === null) return all;
      if (!v) {
        const key = Object.keys(c.P.tasks).find(k => c.P.tasks[k].placeholder === name);
        if (key) { const st = Access.stepOfTask(c, key); if (!st || st.na) return `[файла «${c.P.tasks[key].name}» нет: блог без продукта]`; missing.push({ key, name: c.P.tasks[key].name, step: st }); return `[здесь будет твой файл «${c.P.tasks[key].name}»]`; }
        return '';
      }
      return v.trim();
    }).replace(/\n{3,}/g, '\n\n');
    const seen = {};
    return { text, missing: missing.filter(m => !seen[m.key] && (seen[m.key] = true)) };
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { }
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
    } catch (e) { return false; }
  }

  window.Prompt = { build, copy, placeholders };
})();
