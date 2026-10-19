/* Настройки кабинета. Это единственный файл, куда надо вставить ключи.
   Если SUPABASE_URL и SUPABASE_ANON_KEY пустые — кабинет работает в демо-режиме (всё хранится в браузере). */
window.CONFIG = {
  // Из Supabase → Project Settings → API
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // Адрес, где лежит кабинет (нужен для ссылки входа из письма). Например: "https://maysoulme.ru/kabinet/"
  APP_URL: "",

  // Ссылки, которые показываются в кабинете
  LINKS: {
    chat: "",        // чат участниц (Telegram)
    support: "",     // куда писать в поддержку
    upgrade: "",     // страница доплаты до тарифа «Блог как бизнес»
    buy: ""          // страница покупки (на случай, если доступ закончился)
  },

  // Хранилище файлов заданий в Supabase Storage
  STORAGE_BUCKET: "submissions",

  // Плеер Kinescope: к этому адресу добавляется id видео
  KINESCOPE_EMBED: "https://kinescope.io/embed/"
};
