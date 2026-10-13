/* Загрузка контента: content/program.json и content/assistants/*.md.
   Сначала пробуем fetch (работает на GitHub Pages и с локального сервера).
   Если открыли двойным кликом (file://) и fetch запрещён — подгружаем content/inline.js,
   это копия тех же файлов, собранная скриптом tools/обновить-контент.command. */
(function () {
  const cache = {};
  let inlineLoaded = false;

  function loadInline() {
    if (inlineLoaded) return Promise.resolve(window.CONTENT_INLINE || {});
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'content/inline.js';
      s.onload = () => { inlineLoaded = true; resolve(window.CONTENT_INLINE || {}); };
      s.onerror = () => reject(new Error('Не удалось загрузить content/inline.js'));
      document.head.appendChild(s);
    });
  }

  async function text(path) {
    if (cache[path] !== undefined) return cache[path];
    let out = null;
    try {
      const r = await fetch('content/' + path, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status + ' ' + path);
      out = await r.text();
    } catch (e) {
      const inline = await loadInline().catch(() => ({}));
      if (inline[path] === undefined) throw new Error('Нет файла content/' + path + ' (' + e.message + ')');
      out = inline[path];
      Content.fromInline = true;
    }
    cache[path] = out;
    return out;
  }

  const Content = {
    program: null,
    fromInline: false,
    async load() {
      const raw = await text('program.json');
      try { Content.program = JSON.parse(raw); }
      catch (e) { throw new Error('Ошибка в content/program.json: ' + e.message); }
      return Content.program;
    },
    async assistant(id) { return text('assistants/' + id + '.md'); },
    async rules() { return text('assistants/00_правила_письма.md'); }
  };
  window.Content = Content;
})();
