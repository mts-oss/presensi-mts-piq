/* js/store.js */
/* State management: Supabase REST API (primary) + LocalStorage (cache/fallback) */

// =========================================
// KONFIGURASI SUPABASE (CLOUD)
// =========================================
const SUPABASE_URL = 'https://kbwrwopzodgxidhgmmpx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtid3J3b3B6b2RneGlkaGdtbXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzk3MDMsImV4cCI6MjEwMDgxNTcwM30.cGpvRcBr0AtA0d69d_zqyNJbWEpjKliDKuKibHiBuxk';
const REST_BASE = SUPABASE_URL + '/rest/v1';

// =========================================
// STORAGE KEYS (untuk cache lokal)
// =========================================
const K = {
  USERS:      'mts_piq_users',
  CLASSES:    'mts_piq_classes',
  STUDENTS:   'mts_piq_students',
  SUBJECTS:   'mts_piq_subjects',
  JAM:        'mts_piq_lesson_hours',
  SCHEDULES:  'mts_piq_schedules',
  SESSIONS:   'mts_piq_sessions',
  ATTENDANCES:'mts_piq_attendances',
  SESSION_USER:'mts_piq_current_user',
};

// =========================================
// SEED DATA (fallback jika cloud tidak tersedia)
// =========================================
const seedUsers = [
  { id:'usr-admin-1', kode:'admin', nama:'Administrator MTs PIQ', password_hash:'admin123', role:'admin' },
  { id:'usr-guru-G001', kode:'G001', nama:'Ustadz Ahmad Fauzi, S.Th.I.', password_hash:'guru123', role:'guru' },
  { id:'usr-guru-G002', kode:'G002', nama:'Ustadzah Siti Maryam, S.Pd.', password_hash:'guru123', role:'guru' },
  { id:'usr-guru-G003', kode:'G003', nama:'Ustadz Husein Ali, M.Ag.', password_hash:'guru123', role:'guru' },
  { id:'usr-guru-G004', kode:'G004', nama:'Ustadz Sholehuddin, S.Pd.I.', password_hash:'guru123', role:'guru' },
];

const seedClasses = [
  { id:1, kode:'7A', nama_kelas:'VII A' },
  { id:2, kode:'7B', nama_kelas:'VII B' },
  { id:3, kode:'8A', nama_kelas:'VIII A' },
  { id:4, kode:'8B', nama_kelas:'VIII B' },
  { id:5, kode:'9A', nama_kelas:'IX A' },
];

const seedStudents = [
  { id:1,  ids:'2324001', nama_siswa:'Muhammad Al-Fatih',       class_id:1, status:'aktif' },
  { id:2,  ids:'2324002', nama_siswa:'Abdurrahman Wahid',        class_id:1, status:'aktif' },
  { id:3,  ids:'2324003', nama_siswa:'Fatimah Az-Zahra',         class_id:1, status:'aktif' },
  { id:4,  ids:'2324004', nama_siswa:'Ali bin Abi Thalib',       class_id:1, status:'aktif' },
  { id:5,  ids:'2324005', nama_siswa:'Aisyah Humaira',           class_id:1, status:'aktif' },
  { id:6,  ids:'2324006', nama_siswa:'Yusuf Al-Makassari',       class_id:2, status:'aktif' },
  { id:7,  ids:'2324007', nama_siswa:'Khadijah Binti Khuwailid', class_id:2, status:'aktif' },
  { id:8,  ids:'2324008', nama_siswa:'Ibrahim bin Adham',        class_id:2, status:'aktif' },
  { id:9,  ids:'2223001', nama_siswa:'Salahuddin Al-Ayyubi',     class_id:3, status:'aktif' },
  { id:10, ids:'2223002', nama_siswa:'Rabiah Al-Adawiyah',       class_id:3, status:'aktif' },
  { id:11, ids:'2223003', nama_siswa:'Umar bin Khattab',         class_id:4, status:'aktif' },
  { id:12, ids:'2223004', nama_siswa:'Bilal bin Rabah',          class_id:4, status:'aktif' },
];

const seedSubjects = [
  { id:1, idm:'QUR', pelajaran:'Al-Quran Hadist' },
  { id:2, idm:'FIQ', pelajaran:'Fiqih' },
  { id:3, idm:'AQI', pelajaran:'Akidah Akhlak' },
  { id:4, idm:'ARB', pelajaran:'Bahasa Arab' },
  { id:5, idm:'MTK', pelajaran:'Matematika' },
  { id:6, idm:'IND', pelajaran:'Bahasa Indonesia' },
  { id:7, idm:'ING', pelajaran:'Bahasa Inggris' },
  { id:8, idm:'IPA', pelajaran:'IPA' },
];

const seedJam = [
  { id:1, nama:'Jam ke-1', jam_mulai:'07:00', jam_selesai:'07:40', urutan:1 },
  { id:2, nama:'Jam ke-2', jam_mulai:'07:40', jam_selesai:'08:20', urutan:2 },
  { id:3, nama:'Jam ke-3', jam_mulai:'08:20', jam_selesai:'09:00', urutan:3 },
  { id:4, nama:'Istirahat', jam_mulai:'09:00', jam_selesai:'09:20', urutan:4 },
  { id:5, nama:'Jam ke-4', jam_mulai:'09:20', jam_selesai:'10:00', urutan:5 },
  { id:6, nama:'Jam ke-5', jam_mulai:'10:00', jam_selesai:'10:40', urutan:6 },
  { id:7, nama:'Jam ke-6', jam_mulai:'10:40', jam_selesai:'11:20', urutan:7 },
  { id:8, nama:'Jam ke-7', jam_mulai:'11:20', jam_selesai:'12:00', urutan:8 },
];

const seedSchedules = [
  // Senin
  { id:1,  class_id:1, subject_id:1, teacher_id:'usr-guru-G001', hari:'Senin',  lesson_hour_id:1 },
  { id:2,  class_id:1, subject_id:2, teacher_id:'usr-guru-G002', hari:'Senin',  lesson_hour_id:2 },
  { id:3,  class_id:2, subject_id:3, teacher_id:'usr-guru-G003', hari:'Senin',  lesson_hour_id:1 },
  { id:4,  class_id:2, subject_id:4, teacher_id:'usr-guru-G004', hari:'Senin',  lesson_hour_id:2 },
  { id:5,  class_id:3, subject_id:5, teacher_id:'usr-guru-G001', hari:'Senin',  lesson_hour_id:5 },
  // Selasa
  { id:6,  class_id:1, subject_id:5, teacher_id:'usr-guru-G003', hari:'Selasa', lesson_hour_id:1 },
  { id:7,  class_id:1, subject_id:6, teacher_id:'usr-guru-G002', hari:'Selasa', lesson_hour_id:2 },
  { id:8,  class_id:3, subject_id:1, teacher_id:'usr-guru-G001', hari:'Selasa', lesson_hour_id:3 },
  // Rabu
  { id:9,  class_id:2, subject_id:5, teacher_id:'usr-guru-G003', hari:'Rabu',   lesson_hour_id:1 },
  { id:10, class_id:4, subject_id:7, teacher_id:'usr-guru-G002', hari:'Rabu',   lesson_hour_id:5 },
  // Kamis
  { id:11, class_id:1, subject_id:3, teacher_id:'usr-guru-G003', hari:'Kamis',  lesson_hour_id:2 },
  { id:12, class_id:3, subject_id:8, teacher_id:'usr-guru-G004', hari:'Kamis',  lesson_hour_id:6 },
  // Jumat
  { id:13, class_id:5, subject_id:1, teacher_id:'usr-guru-G001', hari:'Jumat',  lesson_hour_id:1 },
  { id:14, class_id:5, subject_id:2, teacher_id:'usr-guru-G002', hari:'Jumat',  lesson_hour_id:2 },
];

// =========================================
// LOCAL STORAGE HELPERS (cache only)
// =========================================
function ls_get(key, fallback) {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch { return fallback; }
}
function ls_set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { console.warn('LocalStorage write failed:', e); }
}

// =========================================
// SUPABASE REST API HELPERS
// =========================================
let _cloudReady = false;

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

/** Fetch dari Supabase REST API */
async function supaFetch(table, options = {}) {
  const { method = 'GET', body, params = '', prefer } = options;
  const url = `${REST_BASE}/${table}${params ? '?' + params : ''}`;
  const headers = { ...HEADERS };
  if (prefer) headers['Prefer'] = prefer;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Cloud] ${method} ${table} error:`, res.status, errText);
      let errMsg = errText;
      try { errMsg = JSON.parse(errText).message || errText; } catch(e){}
      if (window._toast) window._toast(`⚠ Gagal menyimpan ke cloud (${table}): ` + errMsg, 'error');
      return { data: null, error: errText };
    }
    // DELETE and some methods may return empty body
    const text = await res.text();
    const data = text ? JSON.parse(text) : [];
    return { data, error: null };
  } catch (e) {
    console.error(`[Cloud] fetch error (${table}):`, e);
    if (window._toast) window._toast(`⚠ Kesalahan jaringan ke cloud (${table}): ` + e.message, 'error');
    return { data: null, error: e.message };
  }
}

/** SELECT * from a table */
async function supaSelect(table, params = '') {
  return supaFetch(table, { method: 'GET', params: 'select=*' + (params ? '&' + params : '') });
}

/** UPSERT (insert or update) rows */
async function supaUpsert(table, rows) {
  if (!rows || rows.length === 0) return { data: [], error: null };
  // Remove created_at from data to let DB set it
  const cleaned = rows.map(r => {
    const copy = { ...r };
    delete copy.created_at;
    return copy;
  });
  return supaFetch(table, {
    method: 'POST',
    body: cleaned,
    prefer: 'resolution=merge-duplicates,return=representation',
  });
}

/** DELETE rows by IDs */
async function supaDelete(table, idCol, ids) {
  if (!ids || ids.length === 0) return { data: [], error: null };
  const idList = ids.map(id => typeof id === 'string' ? `"${id}"` : id).join(',');
  return supaFetch(table, {
    method: 'DELETE',
    params: `${idCol}=in.(${idList})`,
  });
}

// =========================================
// TABLE MAPPING
// =========================================
const TABLE_MAP = {
  [K.USERS]:      'users',
  [K.CLASSES]:    'classes',
  [K.STUDENTS]:   'students',
  [K.SUBJECTS]:   'subjects',
  [K.JAM]:        'lesson_hours',
  [K.SCHEDULES]:  'schedules',
  [K.SESSIONS]:   'attendance_sessions',
  [K.ATTENDANCES]:'attendances',
};

// =========================================
// STORE OBJECT
// =========================================
export const store = {
  // Track cloud status
  _cloudReady: false,

  // ---- INIT ----
  init() {
    // Seed localStorage if empty (fallback for offline)
    if (!ls_get(K.USERS,     null)) ls_set(K.USERS,     seedUsers);
    if (!ls_get(K.CLASSES,   null)) ls_set(K.CLASSES,   seedClasses);
    if (!ls_get(K.STUDENTS,  null)) ls_set(K.STUDENTS,  seedStudents);
    if (!ls_get(K.SUBJECTS,  null)) ls_set(K.SUBJECTS,  seedSubjects);
    if (!ls_get(K.JAM,       null)) ls_set(K.JAM,       seedJam);
    if (!ls_get(K.SCHEDULES, null)) ls_set(K.SCHEDULES, seedSchedules);
    if (!ls_get(K.SESSIONS,  null)) ls_set(K.SESSIONS,  []);
    if (!ls_get(K.ATTENDANCES,null))ls_set(K.ATTENDANCES,[]);

    // Test cloud and sync
    this._initCloud();
  },

  async _initCloud() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.log('[Cloud] No Supabase config, running in offline mode');
      return;
    }
    // Test connection by fetching users
    const { data, error } = await supaSelect('users');
    if (error) {
      console.warn('[Cloud] Connection failed, running in offline mode:', error);
      this._showCloudStatus(false);
      return;
    }
    this._cloudReady = true;
    _cloudReady = true;
    console.log('[Cloud] Connected to Supabase ✓');
    this._showCloudStatus(true);

    // Sync all tables from cloud to localStorage
    await this._syncAllFromCloud();
  },

  _showCloudStatus(connected) {
    // Show a small indicator to user
    if (window._toast) {
      if (connected) {
        window._toast('☁ Terhubung ke database online', 'success');
      } else {
        window._toast('⚠ Mode offline — data disimpan lokal', 'warning');
      }
    }
  },

  async _syncAllFromCloud() {
    const tables = [
      ['users',               K.USERS],
      ['classes',             K.CLASSES],
      ['students',            K.STUDENTS],
      ['subjects',            K.SUBJECTS],
      ['lesson_hours',        K.JAM],
      ['schedules',           K.SCHEDULES],
      ['attendance_sessions', K.SESSIONS],
      ['attendances',         K.ATTENDANCES],
    ];
    for (const [tbl, key] of tables) {
      const { data, error } = await supaSelect(tbl);
      if (!error && data) {
        // PERBAIKAN: Gunakan data dari cloud sebagai sumber kebenaran (source of truth).
        // Logika sebelumnya menggabungkan data lokal yang tidak ada di cloud,
        // yang menyebabkan data yang sudah dihapus di cloud kembali ditambahkan
        // oleh perangkat yang masih menyimpan cache lama di LocalStorage.
        ls_set(key, data);
      }
    }
    console.log('[Cloud] Sync from cloud complete');
    // Dispatch event so pages can re-render if needed
    window.dispatchEvent(new CustomEvent('cloud-sync-done'));
  },

  /** Write to both cloud and localStorage. Returns true if cloud write succeeded. */
  async _cloudWrite(table, localKey, newData) {
    // Always update localStorage first (optimistic)
    ls_set(localKey, newData);

    if (!_cloudReady) return false;

    // Upsert to cloud
    const { data, error } = await supaUpsert(table, newData);
    if (error) {
      console.error('[Cloud] Write failed for', table, error);
      if (window._toast) window._toast('⚠ Gagal menyimpan ke cloud: ' + table, 'error');
      return false;
    }
    // Update localStorage with cloud response (has server-generated fields)
    if (data && data.length > 0) {
      ls_set(localKey, data);
    }
    return true;
  },

  /** Delete from cloud and update localStorage */
  async _cloudDelete(table, localKey, idCol, ids, remainingData) {
    // Update localStorage immediately
    ls_set(localKey, remainingData);

    if (!_cloudReady) return false;

    const { error } = await supaDelete(table, idCol, ids);
    if (error) {
      console.error('[Cloud] Delete failed for', table, error);
      if (window._toast) window._toast('⚠ Gagal menghapus dari cloud: ' + table, 'error');
      return false;
    }
    return true;
  },

  getSupabaseConfig() {
    return (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.trim() !== '')
      ? { url: SUPABASE_URL, key: SUPABASE_KEY }
      : null;
  },

  isCloudEnabled() { return _cloudReady; },

  // ---- USERS ----
  getUsers()    { return ls_get(K.USERS, []); },
  getTeachers() { return this.getUsers().filter(u => u.role === 'guru'); },
  saveUsers(arr){ 
    ls_set(K.USERS, arr);
    if (_cloudReady) supaUpsert('users', arr);
  },

  addTeacher(t) {
    const list = this.getUsers();
    const newTeacher = { ...t, id: 'usr-guru-' + t.kode, role: 'guru', password_hash: t.password_hash || 'guru123' };
    list.push(newTeacher);
    this._cloudWrite('users', K.USERS, list);
  },

  saveBulkTeachers(arr) {
    const list = this.getUsers();
    const newTeachers = [];
    arr.forEach((t, i) => {
      let kode = (t.kode || '').trim().toUpperCase();
      if (!kode || kode === '-') {
        const nums = list.filter(u => u.role === 'guru').map(u => parseInt((u.kode||'').replace(/\D/g,''))||0);
        kode = 'G' + (Math.max(0,...nums)+1).toString().padStart(3,'0');
      }
      let finalKode = kode, sfx = 1;
      while (list.some(u => u.kode === finalKode)) { finalKode = kode+'_'+sfx; sfx++; }
      const teacher = {
        id: 'usr-guru-' + finalKode + '-' + Date.now(),
        kode: finalKode,
        nama: (t.nama || t.nama_guru || '').trim(),
        password_hash: 'guru123',
        role: 'guru'
      };
      list.push(teacher);
      newTeachers.push(teacher);
    });
    ls_set(K.USERS, list);
    // Only upsert new teachers to cloud
    if (_cloudReady) supaUpsert('users', newTeachers);
  },

  deleteBulkTeachers(ids) {
    const cur = this.getCurrentUser();
    const remaining = this.getUsers().filter(u => !ids.includes(u.id) || u.id === cur?.id);
    this._cloudDelete('users', K.USERS, 'id', ids, remaining);
  },

  // ---- CLASSES ----
  getClasses()  { return ls_get(K.CLASSES, []); },
  saveClasses(arr) { 
    ls_set(K.CLASSES, arr);
    if (_cloudReady) supaUpsert('classes', arr);
  },

  saveBulkClasses(arr) {
    const list = this.getClasses();
    const newClasses = [];
    arr.forEach((c, i) => {
      const cls = {
        id: Date.now() + i,
        kode: (c.kode || c.idk || '').trim(),
        nama_kelas: (c.nama_kelas || c.nama || '').trim()
      };
      list.push(cls);
      newClasses.push(cls);
    });
    ls_set(K.CLASSES, list);
    if (_cloudReady) supaUpsert('classes', newClasses);
  },

  deleteBulkClasses(ids) {
    const remaining = this.getClasses().filter(c => !ids.includes(c.id));
    this._cloudDelete('classes', K.CLASSES, 'id', ids, remaining);
  },

  // ---- STUDENTS ----
  getStudents() { return ls_get(K.STUDENTS, []); },
  getStudentsByClass(classId) {
    return this.getStudents().filter(s => s.class_id === parseInt(classId) && s.status === 'aktif');
  },

  saveBulkStudents(arr) {
    const list = this.getStudents();
    const newStudents = [];
    arr.forEach((s, i) => {
      const student = {
        id: Date.now() + i,
        ids: (s.ids || s.nis || '').trim(),
        nama_siswa: (s.nama_siswa || s.nama || '').trim(),
        class_id: parseInt(s.class_id) || null,
        status: 'aktif'
      };
      list.push(student);
      newStudents.push(student);
    });
    ls_set(K.STUDENTS, list);
    if (_cloudReady) supaUpsert('students', newStudents);
  },

  deleteBulkStudents(ids) {
    const remaining = this.getStudents().filter(s => !ids.includes(s.id));
    this._cloudDelete('students', K.STUDENTS, 'id', ids, remaining);
  },

  // ---- SUBJECTS ----
  getSubjects() { return ls_get(K.SUBJECTS, []); },

  saveBulkSubjects(arr) {
    const list = this.getSubjects();
    const newSubjects = [];
    arr.forEach((s, i) => {
      const subj = {
        id: Date.now() + i + Math.floor(Math.random()*999),
        idm: (s.idm || '').trim(),
        pelajaran: (s.pelajaran || s.nama || '').trim()
      };
      list.push(subj);
      newSubjects.push(subj);
    });
    ls_set(K.SUBJECTS, list);
    if (_cloudReady) supaUpsert('subjects', newSubjects);
  },

  deleteBulkSubjects(ids) {
    const remaining = this.getSubjects().filter(s => !ids.includes(s.id));
    this._cloudDelete('subjects', K.SUBJECTS, 'id', ids, remaining);
  },

  // ---- LESSON HOURS (JAM) ----
  getJam()  { return ls_get(K.JAM, []).sort((a,b) => a.urutan - b.urutan); },

  saveBulkJam(arr) {
    const list = this.getJam();
    const newJam = [];
    arr.forEach((j, i) => {
      const jam = {
        id: Date.now() + i,
        nama: (j.nama || '').trim(),
        jam_mulai: j.jam_mulai || j.mulai || '',
        jam_selesai: j.jam_selesai || j.selesai || '',
        urutan: parseInt(j.urutan) || list.length + i + 1
      };
      list.push(jam);
      newJam.push(jam);
    });
    list.sort((a,b) => a.urutan - b.urutan);
    ls_set(K.JAM, list);
    if (_cloudReady) supaUpsert('lesson_hours', newJam);
  },

  deleteBulkJam(ids) {
    const remaining = this.getJam().filter(j => !ids.includes(j.id));
    this._cloudDelete('lesson_hours', K.JAM, 'id', ids, remaining);
  },

  updateJam(id, newData) {
    const list = this.getJam();
    const idx = list.findIndex(j => j.id === id);
    if (idx === -1) return false;
    
    // Update data
    list[idx] = { ...list[idx], ...newData };
    ls_set(K.JAM, list);
    
    // Sync to cloud
    if (_cloudReady) supaUpsert('lesson_hours', [list[idx]]);
    return true;
  },

  // ---- SCHEDULES ----
  getSchedules() { return ls_get(K.SCHEDULES, []); },

  getSchedulesByTeacher(teacherId) {
    return this.getSchedules().filter(s => s.teacher_id === teacherId);
  },

  getSchedulesByDay(hari) {
    return this.getSchedules().filter(s => s.hari === hari);
  },

  saveBulkSchedules(arr) {
    const list = this.getSchedules();
    const newSchedulesMap = new Map();
    let skipped = 0;
    arr.forEach((s, i) => {
      const classId   = parseInt(s.class_id);
      const subjectId = parseInt(s.subject_id);
      const jamId     = parseInt(s.lesson_hour_id);
      // Skip rows with invalid (NaN) IDs
      if (isNaN(classId) || isNaN(subjectId) || isNaN(jamId) || !s.teacher_id || !s.hari) {
        console.warn('[Store] saveBulkSchedules: skipping invalid row', s);
        skipped++;
        return;
      }
      
      // Cek apakah slot jadwal ini (hari, kelas, jam) sudah ada
      const existingIdx = list.findIndex(ex => 
        ex.hari === s.hari && 
        ex.class_id === classId && 
        ex.lesson_hour_id === jamId
      );

      if (existingIdx !== -1) {
        // Timpa / Update jadwal yang sudah ada
        list[existingIdx].subject_id = subjectId;
        list[existingIdx].teacher_id = s.teacher_id;
        newSchedulesMap.set(list[existingIdx].id, list[existingIdx]); // Ini akan di-upsert di cloud
      } else {
        // Tambah jadwal baru
        const sched = {
          id: Date.now() + i + Math.floor(Math.random() * 999),
          class_id: classId,
          subject_id: subjectId,
          teacher_id: s.teacher_id,
          hari: s.hari,
          lesson_hour_id: jamId
        };
        list.push(sched);
        newSchedulesMap.set(sched.id, sched);
      }
    });
    const newSchedules = Array.from(newSchedulesMap.values());
    if (skipped > 0) console.warn(`[Store] saveBulkSchedules: ${skipped} baris dilewati karena data tidak valid`);
    ls_set(K.SCHEDULES, list);
    if (_cloudReady && newSchedules.length > 0) supaUpsert('schedules', newSchedules);
    return { saved: newSchedules.length, skipped };
  },

  deleteBulkSchedules(ids) {
    const remaining = this.getSchedules().filter(s => !ids.includes(s.id));
    this._cloudDelete('schedules', K.SCHEDULES, 'id', ids, remaining);
  },

  // ---- SESSIONS & ATTENDANCE ----
  getSessions()    { return ls_get(K.SESSIONS, []); },
  getAttendances() { return ls_get(K.ATTENDANCES, []); },

  /** Save or update a session + attendance records */
  saveAttendance(scheduleId, tanggal, teacherId, classId, subjectId, lessonHourId, materi, catatanJurnal, records) {
    const sessions = this.getSessions();
    const attendances = this.getAttendances();

    // Find existing session for this schedule+date combination
    let session = sessions.find(s => s.schedule_id === scheduleId && s.tanggal === tanggal);
    let sessionId;

    if (session) {
      session.materi = materi || '';
      session.catatan_jurnal = catatanJurnal || '';
      session.teacher_id = teacherId;
      sessionId = session.id;
    } else {
      sessionId = Date.now();
      sessions.push({
        id: sessionId,
        tanggal,
        schedule_id: scheduleId,
        teacher_id: teacherId,
        class_id: classId,
        subject_id: subjectId,
        lesson_hour_id: lessonHourId,
        materi: materi || '',
        catatan_jurnal: catatanJurnal || ''
      });
    }

    // Replace attendance records for this session
    const cleaned = attendances.filter(a => a.session_id !== sessionId);
    const newAttendances = [];
    records.forEach((r, i) => {
      const att = {
        id: Date.now() + i + Math.floor(Math.random() * 999),
        session_id: sessionId,
        student_id: r.student_id,
        status: r.status,
        catatan: r.catatan || '',
        umpan_balik: r.umpan_balik || ''
      };
      cleaned.push(att);
      newAttendances.push(att);
    });

    ls_set(K.SESSIONS, sessions);
    ls_set(K.ATTENDANCES, cleaned);

    // Cloud sync
    if (_cloudReady) {
      // Upsert the session
      const sessionToSave = sessions.find(s => s.id === sessionId);
      supaUpsert('attendance_sessions', [sessionToSave]);
      // Delete old attendances for this session, then insert new
      supaDelete('attendances', 'session_id', [sessionId]).then(() => {
        supaUpsert('attendances', newAttendances);
      });
    }

    return sessionId;
  },

  getSessionForSchedule(scheduleId, tanggal) {
    return this.getSessions().find(s => s.schedule_id === scheduleId && s.tanggal === tanggal);
  },

  getAttendancesForSession(sessionId) {
    return this.getAttendances().filter(a => a.session_id === sessionId);
  },

  // ---- STATS ----
  /** Get daily attendance stats across all sessions for a date */
  getDailyStats(tanggal) {
    const sessions = this.getSessions().filter(s => s.tanggal === tanggal);
    const allAtt = this.getAttendances();
    let H=0, I=0, S=0, A=0, total=0;
    sessions.forEach(s => {
      const recs = allAtt.filter(a => a.session_id === s.id);
      recs.forEach(r => {
        total++;
        if (r.status==='H') H++;
        else if (r.status==='I') I++;
        else if (r.status==='S') S++;
        else if (r.status==='A') A++;
      });
    });
    return { total, H, I, S, A };
  },

  /** Get attendance percentage for a class over a date range */
  getClassAttendanceStat(classId, from, to) {
    const sessions = this.getSessions().filter(s =>
      s.class_id === parseInt(classId) && s.tanggal >= from && s.tanggal <= to
    );
    const allAtt = this.getAttendances();
    let H=0, total=0;
    sessions.forEach(s => {
      const recs = allAtt.filter(a => a.session_id === s.id);
      recs.forEach(r => { total++; if(r.status==='H') H++; });
    });
    return { H, total, pct: total > 0 ? Math.round(H/total*100) : 0 };
  },

  /** Which teachers have submitted attendance for a given date */
  getTeacherStatusToday(tanggal) {
    const schedules = this.getSchedules();
    const sessions  = this.getSessions().filter(s => s.tanggal === tanggal);
    const teachers  = this.getTeachers();
    // Derive hari from the tanggal param, not from today
    const hariIdx   = new Date(tanggal + 'T00:00:00').getDay();
    const HARI = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const hari = HARI[hariIdx];

    // For each teacher, find their schedules on that day and check if session exists
    return teachers.map(teacher => {
      const myScheds = schedules.filter(s => s.teacher_id === teacher.id && s.hari === hari);
      const schedDetails = myScheds.map(s => ({
        schedule_id: s.id,
        class_id: s.class_id,
        subject_id: s.subject_id,
        lesson_hour_id: s.lesson_hour_id,
        done: sessions.some(sess => sess.schedule_id === s.id)
      }));
      return {
        teacher,
        schedules: schedDetails,
        total: myScheds.length,
        done: schedDetails.filter(s => s.done).length
      };
    }).filter(t => t.total > 0);
  },


  /** Get student monthly attendance summary */
  getStudentMonthSummary(studentId, year, month) {
    const prefix = `${year}-${String(month).padStart(2,'0')}`;
    const sessions = this.getSessions().filter(s => s.tanggal.startsWith(prefix));
    const allAtt = this.getAttendances();
    const result = { H:0, I:0, S:0, A:0, total:0, days: {} };
    sessions.forEach(s => {
      const rec = allAtt.find(a => a.session_id === s.id && a.student_id === parseInt(studentId));
      if (rec) {
        result.total++;
        result[rec.status]++;
        if (!result.days[s.tanggal]) result.days[s.tanggal] = [];
        result.days[s.tanggal].push(rec.status);
      }
    });
    return result;
  },

  // ---- AUTH ----
  getCurrentUser()   { return ls_get(K.SESSION_USER, null); },
  setCurrentUser(u)  { ls_set(K.SESSION_USER, u); },
  clearCurrentUser() { localStorage.removeItem(K.SESSION_USER); },

  // ---- UTILS ----
  _todayHari() {
    const days = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    return days[new Date().getDay()];
  },
  todayISO() { return new Date().toISOString().split('T')[0]; }
};

store.init();
