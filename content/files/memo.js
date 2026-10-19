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

  // Бонусы тарифа «Блог как бизнес»: на тарифе «Растущий блог» (?t=grow) вместо памятки короткая заглушка
  var BONUS = ['50-reels', 'akkaunt-pod-zashchitoy', 'neyrofoto', 'put-cheloveka', 'raspakovka-za-vecher', 'semochnyy-den-polnyy', 'zakrep'];
  var fileName = (location.pathname.split('/').pop() || '').replace('.html', '');
  if (BONUS.indexOf(fileName) >= 0 && /[?&]t=grow\b/.test(location.search)) {
    var main = document.querySelector('main') || document.body;
    main.innerHTML = '<div style="max-width:560px;margin:60px auto;padding:0 16px;font-family:Inter,system-ui,sans-serif">' +
      '<h1 style="font-family:\'Libre Baskerville\',serif;font-weight:400;font-size:26px;margin:0 0 14px">Это бонус тарифа «Блог как бизнес»</h1>' +
      '<p style="line-height:1.6;color:#444">Он откроется, если перейти на тариф выше. Перейти можно в любой момент в кабинете, на главной, в блоке «Блог как бизнес».</p>' +
      '<p><a href="#" onclick="return goBack()" style="color:#710C04">← Вернуться в кабинет</a></p></div>';
    return;
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
