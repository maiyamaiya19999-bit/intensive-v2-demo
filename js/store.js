/* Хранилище данных ученицы. Два режима:
   - demo: всё в localStorage браузера (для показа и тестов, ?demo=1 или пустые ключи в config.js);
   - supabase: Postgres + Auth (magic link) + Storage.
   Наружу одинаковый интерфейс, остальной код не знает, какой режим включён. */
(function () {
  const DEMO_KEY = 'kabinet_v2_demo';
  const today = () => new Date().toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

  /* ---------- демо: localStorage ---------- */
  const Demo = {
    data: null,
    read() {
      if (this.data) return this.data;
      try { this.data = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch (e) { this.data = null; }
      if (!this.data) this.data = { profile: null, submissions: [], progress: [] };
      return this.data;
    },
    write() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(this.data)); } catch (e) { /* приватный режим */ } },
    async init() { this.read(); return { id: 'demo', email: 'demo@example.com' }; },
    async signIn() { return { ok: true }; },
    async signOut() { },
    async getProfile() { return this.read().profile; },
    async saveProfile(patch) {
      const d = this.read(); d.profile = Object.assign({}, d.profile || {}, patch); this.write(); return d.profile;
    },
    async listSubmissions() { return this.read().submissions.slice(); },
    async submit(key, { text, file }) {
      const d = this.read();
      const version = d.submissions.filter(s => s.task_key === key).length + 1;
      const row = { id: 'd' + Date.now(), task_key: key, text: text || '', file_name: file ? file.name : null, file_path: null, version, created_at: new Date().toISOString() };
      d.submissions.push(row); this.write(); return row;
    },
    async fileUrl() { return null; },
    async getProgress() { return this.read().progress.slice(); },
    async setProgress(module_id, step_id, status) {
      const d = this.read();
      let row = d.progress.find(p => p.step_id === step_id);
      if (!row) { row = { module_id, step_id, status, updated_at: '' }; d.progress.push(row); }
      if (row.status === 'done' && status !== 'done') { row.updated_at = new Date().toISOString(); this.write(); return row; }
      row.status = status; row.updated_at = new Date().toISOString(); this.write(); return row;
    },
    /* только для демо-панели */
    reset() { this.data = { profile: null, submissions: [], progress: [] }; this.write(); },
    unsubmit(key) { const d = this.read(); d.submissions = d.submissions.filter(s => s.task_key !== key); this.write(); },
    quickProfile(tariffs) {
      const t = 'money';
      return this.saveProfile({ email: 'demo@example.com', name: 'Лена', nick: '@lena_psy', niche: 'психолог, консультации', track: 'product', tariff: t, has_computer: true, ai: 'claude', plan: 'paid', start_date: today(), access_until: addDays(today(), tariffs[t].days), consent_pd: true, consent_case: false, auto_opened: false, answers: {} });
    }
  };

  /* ---------- Supabase ---------- */
  const Sb = {
    client: null, user: null,
    async init() {
      if (!window.supabase) throw new Error('Библиотека supabase-js не загрузилась. Проверь интернет.');
      this.client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      const { data } = await this.client.auth.getSession();
      this.user = data.session ? data.session.user : null;
      this.client.auth.onAuthStateChange((_e, session) => {
        const was = this.user && this.user.id, now = session && session.user && session.user.id;
        this.user = session ? session.user : null;
        if (was !== now && window.App) window.App.reload();
      });
      return this.user;
    },
    async signIn(email) {
      const { error } = await this.client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: CONFIG.APP_URL || location.href.split('#')[0] } });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    async signOut() { await this.client.auth.signOut(); },
    async getProfile() {
      const { data, error } = await this.client.from('users_profile').select('*').eq('id', this.user.id).maybeSingle();
      if (error) throw error; return data;
    },
    async saveProfile(patch) {
      const row = Object.assign({ id: this.user.id, email: this.user.email }, patch);
      const { data, error } = await this.client.from('users_profile').upsert(row).select().single();
      if (error) throw error; return data;
    },
    async listSubmissions() {
      const { data, error } = await this.client.from('submissions').select('*').eq('user_id', this.user.id).order('created_at');
      if (error) throw error; return data || [];
    },
    async submit(key, { text, file }) {
      const existing = await this.listSubmissions();
      const version = existing.filter(s => s.task_key === key).length + 1;
      let file_path = null, file_name = null;
      if (file) {
        const safe = file.name.replace(/[^\w.\-а-яА-ЯёЁ]/g, '_');
        file_path = `${this.user.id}/${key}-v${version}-${safe}`; file_name = file.name;
        const { error } = await this.client.storage.from(CONFIG.STORAGE_BUCKET).upload(file_path, file, { upsert: false });
        if (error) throw error;
      }
      const { data, error } = await this.client.from('submissions').insert({ user_id: this.user.id, task_key: key, text: text || '', file_path, file_name, version }).select().single();
      if (error) throw error; return data;
    },
    async fileUrl(sub) {
      if (!sub.file_path) return null;
      const { data } = await this.client.storage.from(CONFIG.STORAGE_BUCKET).createSignedUrl(sub.file_path, 3600);
      return data ? data.signedUrl : null;
    },
    async getProgress() {
      const { data, error } = await this.client.from('progress').select('*').eq('user_id', this.user.id);
      if (error) throw error; return data || [];
    },
    async setProgress(module_id, step_id, status) {
      const { data, error } = await this.client.from('progress').upsert({ user_id: this.user.id, module_id, step_id, status, updated_at: new Date().toISOString() }, { onConflict: 'user_id,step_id' }).select().single();
      if (error) throw error; return data;
    }
  };

  const Store = {
    mode: 'demo', impl: Demo,
    async init(mode) { this.mode = mode; this.impl = mode === 'supabase' ? Sb : Demo; return this.impl.init(); },
    get user() { return this.mode === 'supabase' ? Sb.user : { id: 'demo', email: 'demo@example.com' }; },
    signIn(email) { return this.impl.signIn(email); },
    signOut() { return this.impl.signOut(); },
    getProfile() { return this.impl.getProfile(); },
    saveProfile(p) { return this.impl.saveProfile(p); },
    listSubmissions() { return this.impl.listSubmissions(); },
    submit(k, o) { return this.impl.submit(k, o); },
    fileUrl(s) { return this.impl.fileUrl(s); },
    getProgress() { return this.impl.getProgress(); },
    setProgress(m, s, st) { return this.impl.setProgress(m, s, st); },
    demo: Demo
  };
  window.Store = Store;
})();
