/* «Скачать мой пакет» (модуль 11).
   zip: папка «Моя ИИ-команда» для Claude Code: УСТАНОВЩИК.md, Мои файлы/, Ассистенты/, Голосовые/, Готовое/
        (устройство описано в content/assistants/13_установщик_claude_code.md).
   txt: один файл «Мой пакет» для телефона: документы и тексты помощников подряд, его читает Сборщик пакета (12).
   В пакет идут только помощники, которые есть в тарифе ученицы. Архив собирается в браузере без сжатия, без внешних библиотек. */
(function () {
  const DOCS = [['РАСПАКОВКА', 'РАСПАКОВКА.md'], ['АУДИТОРИЯ', 'АУДИТОРИЯ.md'], ['ПОЗИЦИОНИРОВАНИЕ', 'ПОЗИЦИОНИРОВАНИЕ.md'], ['ПРОДУКТ', 'ПРОДУКТ.md'], ['ОФФЕР', 'ОФФЕР.md']];
  const ORDER = ['01_', '02_', '03_', '04_', '05_', '06_', '07_', '08_', '09_', '10_', '11_', '15_', '16_', '17_', '18_'];

  /* сданные документы: [{ file, text }] */
  function docs(c) {
    const out = [];
    DOCS.forEach(([ph, file]) => {
      const key = Object.keys(c.P.tasks).find(k => c.P.tasks[k].placeholder === ph);
      const m = key && c.subMap[key], st = key && Access.stepOfTask(c, key);
      if (!m || !st || st.na) return; /* файл не из этого тарифа не кладём */
      const s = m.latest;
      out.push({ file, title: c.P.tasks[key].name, text: s.text || (s.file_name ? `[Здесь был прикреплён файл ${s.file_name}. Скачай его в кабинете в разделе «Мои файлы» и положи в эту папку под именем ${file}]` : '') });
    });
    return out;
  }

  function anketa(c) {
    const p = c.profile || {}, a = p.answers || {};
    const lines = ['# Анкета', '', `Имя: ${p.name || ''}`, `Ник: ${p.nick || ''}`, `Ниша: ${p.niche || ''}`, `О чём блог: ${c.tr.name}`, `Тариф: ${c.tf.name}`, `Устройство: ${p.has_computer === false ? 'телефон' : 'компьютер'}`, `Нейросеть: ${p.ai || ''}`, `Подписка: ${p.plan || ''}`, '', '## Все ответы анкеты', ''];
    Object.keys(a).forEach(k => { const v = a[k]; if (v === '' || v == null || k.startsWith('consent')) return; lines.push(`${k}: ${[].concat(v).join(', ')}`); });
    return lines.join('\n') + '\n';
  }

  /* помощники тарифа в порядке установщика */
  function assistantIds(c) {
    const have = new Set(c.flat.filter(x => x.assistant && !x.na).map(x => x.assistant));
    return [...have].filter(id => ORDER.some(p => id.startsWith(p))).sort((a, b) => ORDER.findIndex(p => a.startsWith(p)) - ORDER.findIndex(p => b.startsWith(p)));
  }

  async function installer() {
    const src = await Content.assistant('13_установщик_claude_code');
    const i = src.indexOf('## Текст файла УСТАНОВЩИК.md');
    const m = i >= 0 && src.slice(i).match(/```\n([\s\S]*?)\n```/);
    return m ? m[1] + '\n' : 'Прочитай файлы в этой папке и установи помощников из папки «Ассистенты» как скиллы Claude Code.\n';
  }

  /* ---------- zip без сжатия ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(entries) { /* entries: [{ name, data: Uint8Array | null (папка) }] */
    const enc = new TextEncoder(), chunks = [], central = []; let offset = 0;
    const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    entries.forEach(e => {
      const name = enc.encode(e.name), data = e.data || new Uint8Array(0), crc = e.data ? crc32(data) : 0, dir = !e.data;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      chunks.push(new Uint8Array(h.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, dir ? 0x10 : 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  function save(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function downloadZip(c) {
    const D = docs(c);
    if (!D.length) return 'Пока нечего скачивать: сдай задание «Распаковка»';
    const enc = new TextEncoder(), root = 'Моя ИИ-команда/', E = [{ name: root }];
    E.push({ name: root + 'УСТАНОВЩИК.md', data: enc.encode(await installer()) });
    E.push({ name: root + 'Мои файлы/' });
    D.forEach(d => E.push({ name: root + 'Мои файлы/' + d.file, data: enc.encode(d.text.trim() + '\n') }));
    E.push({ name: root + 'Мои файлы/АНКЕТА.md', data: enc.encode(anketa(c)) });
    E.push({ name: root + 'Ассистенты/' });
    E.push({ name: root + 'Ассистенты/00_правила_письма.md', data: enc.encode(await Content.rules()) });
    for (const id of assistantIds(c)) E.push({ name: root + 'Ассистенты/' + id + '.md', data: enc.encode(await Content.assistant(id)) });
    E.push({ name: root + 'Голосовые/' }, { name: root + 'Готовое/' });
    save(zip(E), 'Моя ИИ-команда.zip');
    return '';
  }

  async function downloadTxt(c) {
    const D = docs(c);
    if (!D.length) return 'Пока нечего скачивать: сдай задание «Распаковка»';
    const parts = [`МОЙ ПАКЕТ · ${c.profile.name || ''} · ${new Date().toLocaleDateString('ru-RU')}`, '', 'Часть 1. Мои документы', ''];
    D.forEach(d => parts.push(`===== ${d.title.toUpperCase()} =====`, d.text.trim(), ''));
    parts.push('===== АНКЕТА =====', anketa(c), '', 'Часть 2. Помощники', '');
    parts.push('===== 00 ПРАВИЛА ПИСЬМА =====', (await Content.rules()).trim(), '');
    for (const id of assistantIds(c)) parts.push(`===== ПОМОЩНИК ${id.replace(/_/g, ' ').toUpperCase()} =====`, (await Content.assistant(id)).trim(), '');
    save(new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' }), 'Мой пакет.txt');
    return '';
  }

  window.Pack = { downloadZip, downloadTxt, assistantIds, docs, _zip: zip };
})();
