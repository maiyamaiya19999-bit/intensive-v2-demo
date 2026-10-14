/* Памятки кабинета: возврат в кабинет, чек-листы с памятью, копирование текста и таблиц. */
(function () {
  var CABINET = '../../index.html';

  // «← Вернуться в кабинет»: если есть история — назад; если страница открыта в новой вкладке — закрыть её; иначе открыть кабинет
  window.goBack = function () {
    if (history.length > 1) { history.back(); return false; }
    try { window.close(); } catch (e) {}
    setTimeout(function () { location.href = CABINET; }, 200);
    return false;
  };

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; }
  }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('Не получилось. Выдели текст и скопируй вручную'); }
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    else fallback();
  }

  // Чек-листы: состояние каждой галочки в localStorage
  var page = document.body.getAttribute('data-page') || 'memo';
  document.querySelectorAll('ul.check').forEach(function (list) {
    var id = list.getAttribute('data-id') || 'c';
    var boxes = list.querySelectorAll('input[type=checkbox]');
    var bar = list.nextElementSibling && list.nextElementSibling.classList.contains('checkbar') ? list.nextElementSibling : null;
    function key(i) { return 'memo:' + page + ':' + id + ':' + i; }
    function update() {
      if (!bar) return;
      var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
      var c = bar.querySelector('.count');
      c.textContent = n === boxes.length ? 'Готово: всё отмечено' : 'Отмечено ' + n + ' из ' + boxes.length;
      c.classList.toggle('done-msg', n === boxes.length);
    }
    boxes.forEach(function (b, i) {
      b.checked = store(key(i)) === '1';
      b.addEventListener('change', function () { store(key(i), b.checked ? '1' : null); update(); });
    });
    if (bar) bar.querySelector('button').addEventListener('click', function () {
      boxes.forEach(function (b, i) { b.checked = false; store(key(i), null); }); update();
    });
    update();
  });

  // Кнопки «Скопировать»: data-copy="id элемента" или data-tsv="готовый текст"
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy],[data-tsv]');
    if (!b) return;
    if (b.hasAttribute('data-tsv')) copyText(b.getAttribute('data-tsv'), 'Таблица скопирована. Вставь её в ячейку A1');
    else { var el = document.getElementById(b.getAttribute('data-copy')); if (el) copyText(el.innerText.trim(), 'Скопировано'); }
  });
})();

/* защита */
(function(){var ok=function(t){return t&&t.closest&&t.closest('input,textarea');};['copy','cut','contextmenu','dragstart'].forEach(function(ev){document.addEventListener(ev,function(e){if(!ok(e.target))e.preventDefault();});});})();
