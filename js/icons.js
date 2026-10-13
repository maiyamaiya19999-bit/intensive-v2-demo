/* Иконки: SVG-набор из макета + PNG-иконки Майи, превращённые в маски. */
(function () {
  const ICON = {
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    unlock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.3"/><rect x="8.5" y="11.5" width="7" height="5.5"/><path d="M10 11.5V9.5a2 2 0 0 1 3.8-.8"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.3"/><path d="M7.5 12.5l3 3L16.5 9"/></svg>',
    play: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
    text: '<svg viewBox="0 0 24 24"><path d="M5 6h14M5 10h14M5 14h10M5 18h7"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v11H3z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z"/><path d="M20 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M8 11l4 4 4-4M5 20h14"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="M12 4 3 9l9 5 9-5z"/><path d="M3 14l9 5 9-5"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    gift: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="11"/><path d="M3 14h18M12 10v11M12 10c-3 0-5-1-5-3a2 2 0 0 1 4 0c0 2 1 3 1 3zm0 0c3 0 5-1 5-3a2 2 0 0 0-4 0c0 2-1 3-1 3z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.3"/><path d="M8.5 12h7M13 9.5l2.5 2.5-2.5 2.5"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11"/><path d="M15 9V4H4v11h5"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/></svg>'
  };
  const ico = (k, cls = '') => `<span class="ico ${cls}">${ICON[k] || ICON.text}</span>`;

  /* PNG-иконки из набора Майи: grid, home, book, user, folder, arrow, close.
     Пробуем обрезать поля через canvas; если браузер не даёт (file://), берём PNG как маску напрямую. */
  const RAW = ['grid', 'home', 'book', 'user', 'folder', 'arrow', 'close'];
  const MASK = {};
  function loadMasks(onReady) {
    RAW.forEach(k => {
      const src = `assets/icons/${k}.png`;
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0);
          const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
          let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
          for (let i = 0; i < p.length; i += 4) {
            const a = p[i + 3]; p[i] = p[i + 1] = p[i + 2] = 0;
            if (a > 24) { const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width); if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
          }
          x.putImageData(d, 0, 0);
          const w = maxX - minX + 1, h = maxY - minY + 1, sz = Math.max(w, h), o = document.createElement('canvas');
          o.width = o.height = sz; o.getContext('2d').drawImage(c, minX, minY, w, h, (sz - w) / 2, (sz - h) / 2, w, h);
          MASK[k] = o.toDataURL('image/png');
        } catch (e) { MASK[k] = src; }
        // маска один раз кладётся в CSS-переменную, чтобы не раздувать HTML повторами data-URL
        document.documentElement.style.setProperty('--mask-' + k, `url(${MASK[k]})`);
        onReady && onReady();
      };
      im.onerror = () => { MASK[k] = null; };
      im.src = src;
    });
  }
  const micon = k => MASK[k] ? `<span class="micon" style="--m:var(--mask-${k})"></span>` : ico(k === 'close' ? 'lock' : k);
  const ticon = k => MASK[k] ? `<span class="ticon" style="--m:var(--mask-${k})"></span>` : ico(k);

  window.ICON = ICON; window.ico = ico; window.MASK = MASK; window.micon = micon; window.ticon = ticon; window.loadMasks = loadMasks;
})();
