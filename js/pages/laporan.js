/* js/pages/laporan.js */
import { store } from '../store.js';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember'];

export const LaporanPage = {
  _tab: 'harian', // 'harian' | 'guru'

  render(container) {
    this._container = container;
    this._renderLayout();
  },

  _renderLayout() {
    const c = this._container;
    c.innerHTML = `
      <div class="fade-in stack">
        <div class="page-header">
          <div class="page-title">Laporan & Rekap</div>
        </div>

        <!-- Tab Bar -->
        <div class="tab-bar">
          <button class="tab-btn ${this._tab==='harian'?'active':''}" data-tab="harian">Rekap Kehadiran Siswa</button>
          <button class="tab-btn ${this._tab==='guru'?'active':''}" data-tab="guru">Laporan Guru</button>
        </div>

        <div id="laporan-content"></div>
      </div>
    `;

    c.querySelector('.tab-bar').addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn[data-tab]');
      if (!btn) return;
      this._tab = btn.dataset.tab;
      c.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===this._tab));
      this._loadContent();
    });

    this._loadContent();
  },

  _loadContent() {
    const content = this._container.querySelector('#laporan-content');
    if (this._tab === 'harian') this._renderRekapHarian(content);
    else this._renderLaporanGuru(content);
  },

  // ==================================
  // REKAP KEHADIRAN SISWA
  // ==================================
  _renderRekapHarian(content) {
    const now = new Date();
    let selClass = store.getClasses()[0]?.id || null;
    let selTeacher = 'all'; // 'all' | teacher.id
    let selYear  = now.getFullYear();
    let selMonth = now.getMonth() + 1; // 1-indexed
    let mode     = '5hari'; // '5hari' (default) | 'bulanan'
    let selStartDate = null; // ISO date for 5-day view
    let renderToken = 0;

    // Helper: Days of week for MTs PIQ (Senin, Selasa, Rabu, Kamis, Sabtu)
    const HARI_LABEL = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

    // Helper: Get 5 school days starting from a given date (skips Friday and Sunday)
    const get5SchoolDays = (startDateStr) => {
      const res = [];
      let cur = new Date(startDateStr + 'T00:00:00');
      if (isNaN(cur.getTime())) cur = new Date();

      // Skip non-school days at start
      while (cur.getDay() === 0 || cur.getDay() === 5) {
        cur.setDate(cur.getDate() + 1);
      }

      while (res.length < 5) {
        const dayOfWeek = cur.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 5) { // Skip Ahad (0) and Jumat (5)
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const iso = `${y}-${m}-${d}`;
          res.push({
            iso,
            date: cur.getDate(),
            month: cur.getMonth() + 1,
            year: y,
            dayOfWeek,
            dayName: HARI_LABEL[dayOfWeek],
            formattedDate: `${d}/${m}`,
            label: `${HARI_LABEL[dayOfWeek]}, ${d}/${m}/${y}`
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
      return res;
    };

    // Helper: Previous 5 school days start ISO
    const getPrev5SchoolDays = (startDateStr) => {
      let cur = new Date(startDateStr + 'T00:00:00');
      cur.setDate(cur.getDate() - 1);
      const days = [];
      while (days.length < 5) {
        if (cur.getDay() !== 0 && cur.getDay() !== 5) {
          days.unshift(new Date(cur));
        }
        cur.setDate(cur.getDate() - 1);
      }
      const first = days[0];
      const y = first.getFullYear();
      const m = String(first.getMonth() + 1).padStart(2, '0');
      const d = String(first.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Helper: Next 5 school days start ISO
    const getNext5SchoolDays = (lastDateStr) => {
      let cur = new Date(lastDateStr + 'T00:00:00');
      cur.setDate(cur.getDate() + 1);
      while (cur.getDay() === 0 || cur.getDay() === 5) {
        cur.setDate(cur.getDate() + 1);
      }
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Helper: Get list of 5-day periods for a given month and year
    const getMonthWeeks = (year, month) => {
      const numDays = new Date(year, month, 0).getDate();
      const schoolDays = [];
      for (let d = 1; d <= numDays; d++) {
        const dt = new Date(year, month - 1, d);
        const dayOfWeek = dt.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 5) {
          const iso = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          schoolDays.push({ date: d, iso, dayName: HARI_LABEL[dayOfWeek] });
        }
      }

      const periods = [];
      for (let i = 0; i < schoolDays.length; i += 5) {
        const chunk = schoolDays.slice(i, i + 5);
        const start = chunk[0];
        const end = chunk[chunk.length - 1];
        const weekNum = Math.floor(i / 5) + 1;
        periods.push({
          startIso: start.iso,
          endIso: end.iso,
          label: `Pekan ${weekNum} (${start.date} - ${end.date} ${MONTHS[month-1].substring(0,3)} • ${chunk.length} hari)`
        });
      }
      return periods;
    };

    // Initialize default start date for current month
    const initDefaultStartDate = (year, month) => {
      const weeks = getMonthWeeks(year, month);
      const todayISO = store.todayISO();
      // If current month, try finding week containing today
      if (todayISO.startsWith(`${year}-${String(month).padStart(2,'0')}`)) {
        const curWeek = weeks.find(w => todayISO >= w.startIso && todayISO <= w.endIso);
        if (curWeek) return curWeek.startIso;
      }
      return weeks[0]?.startIso || `${year}-${String(month).padStart(2,'0')}-01`;
    };

    selStartDate = initDefaultStartDate(selYear, selMonth);

    const render = async (forceRefresh = false) => {
      const currentToken = ++renderToken;
      const classes  = store.getClasses();
      if (!selClass && classes.length > 0) selClass = classes[0].id;
      const students = store.getStudentsByClass(selClass);
      const sessions  = store.getSessions();
      const schedules = store.getSchedules();
      const jamList   = (store.getJam() || []).slice().sort((a,b) => (a.urutan||0) - (b.urutan||0));
      const subjects  = store.getSubjects() || [];
      const teachers  = store.getTeachers() || [];
      const allUsers  = store.getUsers() || [];

      const subjectMap = new Map();
      subjects.forEach(s => subjectMap.set(String(s.id), s));
      const teacherMap = new Map();
      allUsers.forEach(u => teacherMap.set(String(u.id), u));
      teachers.forEach(t => teacherMap.set(String(t.id), t));
      const schedById = new Map(schedules.map(s => [String(s.id), s]));

      // Build list of teachers who teach in the selected class (from schedules & recorded sessions)
      const classScheds = schedules.filter(s => String(s.class_id) === String(selClass));
      const classTeacherIds = new Set();
      const teacherSubjectsInClass = new Map();
      const addTeacherSubject = (tid, sid) => {
        if (!tid) return;
        const key = String(tid);
        classTeacherIds.add(key);
        if (!teacherSubjectsInClass.has(key)) teacherSubjectsInClass.set(key, new Set());
        const subjName = subjectMap.get(String(sid))?.pelajaran;
        if (subjName) teacherSubjectsInClass.get(key).add(subjName);
      };
      classScheds.forEach(s => addTeacherSubject(s.teacher_id, s.subject_id));
      sessions.filter(s => String(s.class_id) === String(selClass)).forEach(s => {
        const sc = schedById.get(String(s.schedule_id));
        addTeacherSubject(sc?.teacher_id || s.teacher_id, s.subject_id);
      });

      const classTeachers = [...classTeacherIds]
        .map(id => {
          const u = teacherMap.get(id);
          if (!u) return null;
          const mapelList = [...(teacherSubjectsInClass.get(id) || [])];
          return { ...u, mapelInClass: mapelList.join(', ') };
        })
        .filter(Boolean)
        .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

      if (selTeacher !== 'all' && !classTeachers.some(t => String(t.id) === String(selTeacher))) {
        selTeacher = 'all';
      }
      const activeTeacher = selTeacher !== 'all'
        ? classTeachers.find(t => String(t.id) === String(selTeacher))
        : null;

      const weeks = getMonthWeeks(selYear, selMonth);

      // Determine active 5 days
      const days5 = get5SchoolDays(selStartDate);
      const activeDates = mode === '5hari' ? days5.map(d => d.iso) : [];
      const curStartIso = days5[0]?.iso || selStartDate;
      const curEndIso   = days5[days5.length - 1]?.iso || selStartDate;

      // Filter sessions based on mode, class, and optional teacher
      const prefix = `${selYear}-${String(selMonth).padStart(2,'0')}`;
      const matchTeacher = (s) => {
        if (selTeacher === 'all') return true;
        if (String(s.teacher_id) === String(selTeacher)) return true;
        const sc = schedById.get(String(s.schedule_id));
        return sc && String(sc.teacher_id) === String(selTeacher);
      };
      const mySessions = (mode === '5hari'
        ? sessions.filter(s => String(s.class_id) === String(selClass) && activeDates.includes(s.tanggal))
        : sessions.filter(s => String(s.class_id) === String(selClass) && s.tanggal.startsWith(prefix))
      ).filter(matchTeacher);

      const sessionIds = mySessions.map(s => s.id);

      // Check if we need to fetch attendances from cloud for these sessions
      const needsCloudFetch = store.isCloudEnabled() && sessionIds.length > 0 &&
        (forceRefresh || !store.hasAttendancesForSessions(sessionIds));

      if (needsCloudFetch) {
        content.innerHTML = `
          <div class="stack">
            <div class="card" style="padding:0.75rem;opacity:0.7">
              <div class="row" style="gap:0.5rem;align-items:center">
                <div class="spinner" style="width:16px;height:16px"></div>
                <span style="font-size:0.82rem;font-weight:600">Menghubungkan ke server untuk memuat detail absensi...</span>
              </div>
            </div>
          </div>
        `;
        await store.ensureAttendancesForSessions(sessionIds, forceRefresh);
        if (currentToken !== renderToken) return;
      }

      const allAtt = store.getAttendances();
      const mySessionIdSet = new Set(sessionIds.map(id => String(id)));
      const attMap = new Map();
      allAtt.forEach(a => {
        if (mySessionIdSet.has(String(a.session_id))) {
          attMap.set(`${a.session_id}_${a.student_id}`, a);
        }
      });

      // Session lookup by date and lesson_hour_id
      const sessionMap = new Map();
      mySessions.forEach(s => {
        sessionMap.set(`${s.tanggal}_${s.lesson_hour_id}`, s);
      });

      // ───────────────────────────────────────────
      // MODE 1: PER-5 HARI (DETAIL SEMUA JP)
      // ───────────────────────────────────────────
      if (mode === '5hari') {
        const colTotals = {};
        days5.forEach(d => {
          jamList.forEach(j => {
            colTotals[`${d.iso}_${j.id}`] = { H: 0, I: 0, S: 0, A: 0 };
          });
        });
        const grandTotal = { H: 0, I: 0, S: 0, A: 0 };

        const matrix5 = students.map(stu => {
          const byDayJam = {};
          let H = 0, I = 0, S = 0, A = 0;

          days5.forEach(d => {
            jamList.forEach(j => {
              const sess = sessionMap.get(`${d.iso}_${j.id}`);
              if (sess) {
                const rec = attMap.get(`${sess.id}_${stu.id}`);
                const st = rec?.status || '–';
                byDayJam[`${d.iso}_${j.id}`] = {
                  hasSession: true,
                  status: st,
                  catatan: rec?.catatan || '',
                  umpan_balik: rec?.umpan_balik || ''
                };
                if (st === 'H') { H++; colTotals[`${d.iso}_${j.id}`].H++; grandTotal.H++; }
                else if (st === 'I') { I++; colTotals[`${d.iso}_${j.id}`].I++; grandTotal.I++; }
                else if (st === 'S') { S++; colTotals[`${d.iso}_${j.id}`].S++; grandTotal.S++; }
                else if (st === 'A') { A++; colTotals[`${d.iso}_${j.id}`].A++; grandTotal.A++; }
              } else {
                byDayJam[`${d.iso}_${j.id}`] = { hasSession: false, status: '–' };
              }
            });
          });

          return { stu, byDayJam, H, I, S, A };
        });

        const isKnownWeek = weeks.some(w => w.startIso === curStartIso);

        content.innerHTML = `
          <div class="stack">
            <!-- Filter Bar -->
            <div class="card" style="padding:0.75rem">
              <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:flex-end">
                <div class="form-group" style="margin:0;min-width:140px">
                  <label>Mode Tampilan</label>
                  <select id="sel-mode" class="form-control" style="font-size:0.82rem;font-weight:700;color:var(--primary)">
                    <option value="5hari" selected>📋 5 Hari (Semua JP)</option>
                    <option value="bulanan">📅 1 Bulan (Akumulasi JP)</option>
                  </select>
                </div>
                <div class="form-group" style="margin:0;min-width:95px">
                  <label>Kelas</label>
                  <select id="sel-class" class="form-control" style="font-size:0.82rem">
                    ${classes.map(c=>`<option value="${c.id}" ${String(c.id)===String(selClass)?'selected':''}>${c.nama_kelas}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:170px">
                  <label>Guru Pengajar</label>
                  <select id="sel-teacher" class="form-control" style="font-size:0.82rem">
                    <option value="all" ${selTeacher==='all'?'selected':''}>Semua Guru (${classTeachers.length})</option>
                    ${classTeachers.map(t => `<option value="${t.id}" ${String(t.id)===String(selTeacher)?'selected':''}>${this._escHtml(t.nama)}${t.mapelInClass ? ` — ${this._escHtml(t.mapelInClass)}` : ''}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;min-width:90px">
                  <label>Bulan</label>
                  <select id="sel-month" class="form-control" style="font-size:0.82rem">
                    ${MONTHS.map((m,i)=>`<option value="${i+1}" ${i+1===selMonth?'selected':''}>${m}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;min-width:75px">
                  <label>Tahun</label>
                  <input type="number" id="sel-year" class="form-control" value="${selYear}" style="font-size:0.82rem">
                </div>
                <div class="form-group" style="margin:0;min-width:170px">
                  <label>Pilihan 5 Hari</label>
                  <select id="sel-week" class="form-control" style="font-size:0.82rem">
                    ${weeks.map(w => `<option value="${w.startIso}" ${w.startIso===curStartIso?'selected':''}>${w.label}</option>`).join('')}
                    <option value="custom" ${!isKnownWeek?'selected':''}>Kustom (Pilih Tgl)...</option>
                  </select>
                </div>
                <div style="display:flex;gap:0.3rem">
                  <button class="btn btn-outline btn-sm" id="btn-prev-5" title="5 Hari Belajar Sebelumnya">◀</button>
                  <button class="btn btn-outline btn-sm" id="btn-next-5" title="5 Hari Belajar Selanjutnya">▶</button>
                </div>
                <div style="display:flex;gap:0.4rem;margin-left:auto;flex-wrap:wrap">
                  <button class="btn btn-outline btn-sm" id="btn-refresh-rekap" title="Muat ulang data absensi dari server">🔄 Sync</button>
                  <button class="btn btn-secondary btn-sm" id="btn-exp-excel" title="Unduh format Excel (.xlsx)">📊 Excel</button>
                  <button class="btn btn-outline btn-sm" id="btn-exp-csv" title="Unduh format CSV">⬇ CSV</button>
                  <button class="btn btn-primary btn-sm" id="btn-exp-print" title="Cetak atau simpan sebagai PDF">📄 PDF / Cetak</button>
                </div>
              </div>

              ${!isKnownWeek ? `
                <div class="row" style="margin-top:0.6rem;padding-top:0.6rem;border-top:1px dashed var(--border);gap:0.5rem;align-items:center">
                  <label style="margin:0;font-size:0.75rem;font-weight:600">Tgl Mulai Kustom:</label>
                  <input type="date" id="inp-custom-start" class="form-control" value="${curStartIso}" style="max-width:160px;font-size:0.78rem;padding:0.25rem 0.5rem">
                  <span style="font-size:0.72rem;color:var(--text-muted)">Menampilkan 5 hari belajar mulai dari tanggal yang dipilih.</span>
                </div>
              ` : ''}
            </div>

            <!-- Summary Info Badge -->
            <div class="card" style="padding:0.6rem 0.85rem;background:var(--primary-tint);border-color:#bbf7d0">
              <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:0.5rem;font-size:0.75rem">
                <div>
                  <b style="color:var(--primary)">📅 Rentang 5 Hari:</b>
                  <span style="font-weight:600">${days5[0].label} — ${days5[days5.length-1].label}</span>
                  ${activeTeacher ? `<span style="color:var(--primary);font-weight:600;margin-left:0.4rem">• Guru: ${this._escHtml(activeTeacher.nama)}${activeTeacher.mapelInClass ? ` (${this._escHtml(activeTeacher.mapelInClass)})` : ''}</span>` : ''}
                  <span style="color:var(--text-muted);margin-left:0.5rem">• ${mySessions.length} Jam Pelajaran Terisi</span>
                </div>
                <div class="row" style="gap:0.6rem">
                  <span><b style="color:var(--hadir)">H:</b> Hadir</span>
                  <span><b style="color:var(--izin)">I:</b> Izin</span>
                  <span><b style="color:var(--sakit)">S:</b> Sakit</span>
                  <span><b style="color:var(--alpa)">A:</b> Alpa</span>
                  <span style="color:var(--text-muted)">| Angka 1-8: Jam Pelajaran (Arahkan mouse untuk info mapel/guru)</span>
                </div>
              </div>
            </div>

            <!-- Detailed 5-Day Table -->
            ${students.length === 0
              ? `<div class="empty-state"><p>Tidak ada siswa aktif di kelas ini.</p></div>`
              : `<div class="table-wrap" id="rekap-table-wrap" style="overflow-x:auto;max-width:100%">
                <table id="rekap-table" style="min-width:max-content;border-collapse:collapse;font-size:0.75rem">
                  <thead>
                    <tr style="background:#f0faf4">
                      <th rowspan="2" style="width:34px;text-align:center;position:sticky;left:0;z-index:3;background:#f0faf4;border:1px solid var(--border)">#</th>
                      <th rowspan="2" style="min-width:160px;position:sticky;left:34px;z-index:3;background:#f0faf4;border:1px solid var(--border);text-align:left;padding-left:0.5rem">Nama Siswa</th>
                      ${days5.map(d => `
                        <th colspan="${jamList.length}" style="text-align:center;border:1px solid var(--border);border-left:2px solid var(--primary);padding:0.4rem 0.2rem;background:#f0faf4">
                          <div style="font-size:0.8rem;font-weight:700;color:var(--primary)">${d.dayName}</div>
                          <div style="font-size:0.68rem;color:var(--text-sub);font-weight:600">${d.formattedDate}</div>
                        </th>
                      `).join('')}
                      <th colspan="4" style="text-align:center;border:1px solid var(--border);border-left:2px solid var(--primary);padding:0.4rem 0.5rem;background:#f0faf4">
                        <div style="font-size:0.8rem;font-weight:700;color:var(--primary)">Total (5 Hari)</div>
                        <div style="font-size:0.65rem;color:var(--text-muted)">Akumulasi JP</div>
                      </th>
                    </tr>
                    <tr style="background:#f9fafb">
                      ${days5.map(d => jamList.map(j => {
                        const sess = sessionMap.get(`${d.iso}_${j.id}`);
                        const subj = sess ? subjectMap.get(String(sess.subject_id))?.pelajaran : '';
                        const teacher = sess ? teacherMap.get(String(sess.teacher_id))?.nama : '';
                        const materi = sess?.materi || '';
                        const tooltip = sess
                          ? `${j.nama} (${j.jam_mulai}–${j.jam_selesai})\nMapel: ${subj || 'Mapel'}\nGuru: ${teacher || '-'}\nMateri: ${materi || '-'}`
                          : `${j.nama} (${j.jam_mulai}–${j.jam_selesai})\n(Belum ada sesi/jadwal)`;
                        const isFirstInDay = j.urutan === 1 || j === jamList[0];
                        return `
                          <th title="${tooltip}" style="min-width:26px;max-width:30px;padding:3px 1px;text-align:center;font-size:0.68rem;cursor:help;border:1px solid var(--border);${isFirstInDay?'border-left:2px solid var(--primary);':''}background:${sess ? '#e8f5ed' : '#ffffff'};color:${sess ? 'var(--primary-dark)' : 'var(--text-muted)'};font-weight:${sess ? '700' : '500'}">
                            ${j.urutan || j.nama.replace(/\D/g,'')}
                          </th>
                        `;
                      }).join('')).join('')}
                      <th style="min-width:28px;text-align:center;color:var(--hadir);font-size:0.75rem;font-weight:700;border:1px solid var(--border);border-left:2px solid var(--primary)">H</th>
                      <th style="min-width:28px;text-align:center;color:var(--izin);font-size:0.75rem;font-weight:700;border:1px solid var(--border)">I</th>
                      <th style="min-width:28px;text-align:center;color:var(--sakit);font-size:0.75rem;font-weight:700;border:1px solid var(--border)">S</th>
                      <th style="min-width:28px;text-align:center;color:var(--alpa);font-size:0.75rem;font-weight:700;border:1px solid var(--border)">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${matrix5.map((row, idx) => `
                      <tr class="student-row" style="background:${idx % 2 === 0 ? '#ffffff' : '#fcfdfc'}">
                        <td style="text-align:center;position:sticky;left:0;z-index:1;background:inherit;border:1px solid var(--border)">${idx+1}</td>
                        <td style="white-space:nowrap;font-weight:600;position:sticky;left:34px;z-index:1;background:inherit;border:1px solid var(--border);padding:0.35rem 0.5rem">
                          ${this._escHtml(row.stu.nama_siswa)}
                        </td>
                        ${days5.map(d => jamList.map(j => {
                          const cell = row.byDayJam[`${d.iso}_${j.id}`];
                          const isFirstInDay = j.urutan === 1 || j === jamList[0];
                          const borderLeft = isFirstInDay ? 'border-left:2px solid var(--border-mid);' : '';
                          if (!cell || !cell.hasSession) {
                            return `<td style="text-align:center;color:#cbd5e1;border:1px solid var(--border);${borderLeft}">–</td>`;
                          }
                          const st = cell.status;
                          const tooltip = cell.catatan ? `Catatan: ${cell.catatan}` : `Status: ${st}`;
                          return `
                            <td class="sts-${st}" title="${tooltip}" style="text-align:center;border:1px solid var(--border);${borderLeft}font-weight:700;font-size:0.78rem">
                              ${st}
                            </td>
                          `;
                        }).join('')).join('')}
                        <td style="text-align:center;font-weight:700;color:var(--hadir);border:1px solid var(--border);border-left:2px solid var(--primary);background:#f0faf4">${row.H}</td>
                        <td style="text-align:center;font-weight:700;color:var(--izin);border:1px solid var(--border);background:#fffbeb">${row.I}</td>
                        <td style="text-align:center;font-weight:700;color:var(--sakit);border:1px solid var(--border);background:#eff6ff">${row.S}</td>
                        <td style="text-align:center;font-weight:700;color:var(--alpa);border:1px solid var(--border);background:#fef2f2">${row.A}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background:#f1f5f3;font-weight:700">
                      <td colspan="2" style="text-align:right;padding-right:0.75rem;position:sticky;left:0;z-index:1;background:#f1f5f3;border:1px solid var(--border);font-size:0.75rem">
                        Total Siswa Hadir (H):
                      </td>
                      ${days5.map(d => jamList.map(j => {
                        const sess = sessionMap.get(`${d.iso}_${j.id}`);
                        const count = sess ? (colTotals[`${d.iso}_${j.id}`]?.H || 0) : null;
                        const isFirstInDay = j.urutan === 1 || j === jamList[0];
                        const borderLeft = isFirstInDay ? 'border-left:2px solid var(--border-mid);' : '';
                        return `
                          <td style="text-align:center;font-size:0.72rem;color:var(--hadir);border:1px solid var(--border);${borderLeft}">
                            ${count !== null ? count : '–'}
                          </td>
                        `;
                      }).join('')).join('')}
                      <td style="text-align:center;color:var(--hadir);border:1px solid var(--border);border-left:2px solid var(--primary)">${grandTotal.H}</td>
                      <td style="text-align:center;color:var(--izin);border:1px solid var(--border)">${grandTotal.I}</td>
                      <td style="text-align:center;color:var(--sakit);border:1px solid var(--border)">${grandTotal.S}</td>
                      <td style="text-align:center;color:var(--alpa);border:1px solid var(--border)">${grandTotal.A}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>`
            }
          </div>
        `;

        // Event Listeners for 5-Day Mode
        content.querySelector('#sel-mode')?.addEventListener('change', e => { mode = e.target.value; render(); });
        content.querySelector('#sel-class')?.addEventListener('change', e => { selClass = parseInt(e.target.value); selTeacher = 'all'; render(); });
        content.querySelector('#sel-teacher')?.addEventListener('change', e => { selTeacher = e.target.value; render(); });
        content.querySelector('#sel-month')?.addEventListener('change', e => {
          selMonth = parseInt(e.target.value);
          selStartDate = initDefaultStartDate(selYear, selMonth);
          render();
        });
        content.querySelector('#sel-year')?.addEventListener('change', e => {
          selYear = parseInt(e.target.value);
          selStartDate = initDefaultStartDate(selYear, selMonth);
          render();
        });
        content.querySelector('#sel-week')?.addEventListener('change', e => {
          const val = e.target.value;
          if (val === 'custom') {
            selStartDate = `${selYear}-${String(selMonth).padStart(2,'0')}-01`;
          } else {
            selStartDate = val;
          }
          render();
        });
        content.querySelector('#inp-custom-start')?.addEventListener('change', e => {
          if (e.target.value) {
            selStartDate = e.target.value;
            render();
          }
        });
        content.querySelector('#btn-prev-5')?.addEventListener('click', () => {
          selStartDate = getPrev5SchoolDays(curStartIso);
          const d = new Date(selStartDate + 'T00:00:00');
          selMonth = d.getMonth() + 1;
          selYear = d.getFullYear();
          render();
        });
        content.querySelector('#btn-next-5')?.addEventListener('click', () => {
          selStartDate = getNext5SchoolDays(curEndIso);
          const d = new Date(selStartDate + 'T00:00:00');
          selMonth = d.getMonth() + 1;
          selYear = d.getFullYear();
          render();
        });
        content.querySelector('#btn-refresh-rekap')?.addEventListener('click', () => { render(true); });

        // Export Excel (5-Day Detail)
        content.querySelector('#btn-exp-excel')?.addEventListener('click', () => {
          const className = classes.find(c=>c.id===parseInt(selClass))?.nama_kelas || '';
          const teacherLabel = activeTeacher ? `${activeTeacher.nama}${activeTeacher.mapelInClass ? ' (' + activeTeacher.mapelInClass + ')' : ''}` : 'Semua Guru';
          const jpHeaders = days5.map(d => jamList.map(j => `${d.dayName} ${d.formattedDate} JP${j.urutan}`)).flat();
          const rows = [
            [`REKAPITULASI PRESENSI SISWA PER JAM PELAJARAN — MTs PIQ SINGOSARI MALANG`],
            [`Kelas: ${className} | Guru Pengajar: ${teacherLabel}`],
            [`Periode 5 Hari: ${days5[0].label} s/d ${days5[days5.length-1].label}`],
            [],
            ['No', 'Nama Siswa', ...jpHeaders, 'Total H', 'Total I', 'Total S', 'Total A'],
            ...matrix5.map((row, idx) => [
              idx + 1,
              row.stu.nama_siswa,
              ...days5.map(d => jamList.map(j => {
                const cell = row.byDayJam[`${d.iso}_${j.id}`];
                return (cell && cell.hasSession) ? cell.status : '-';
              })).flat(),
              row.H, row.I, row.S, row.A
            ])
          ];
          const safeTeacher = activeTeacher ? `_${activeTeacher.kode || 'Guru'}` : '';
          this._downloadExcelWorkbook([
            { name: `Kelas ${className}`, rows, colWidths: [5, 28, ...jpHeaders.map(() => 10), 9, 9, 9, 9] }
          ], `Rekap_5Hari_${className}${safeTeacher}_${days5[0].iso}.xlsx`);
        });

        // Export CSV (5-Day Detail)
        content.querySelector('#btn-exp-csv')?.addEventListener('click', () => {
          const className = classes.find(c=>c.id===parseInt(selClass))?.nama_kelas || '';
          const teacherNote = activeTeacher ? ` | Guru: ${activeTeacher.nama}` : '';
          let csv = `Rekap Kehadiran Siswa ${className}${teacherNote} - Detail Per Jam Pelajaran (5 Hari: ${days5[0].iso} s/d ${days5[days5.length-1].iso})\n`;
          const jpHeaders = days5.map(d => jamList.map(j => `"${d.dayName} ${d.formattedDate} JP${j.urutan}"`)).flat().join(',');
          csv += `No,Nama Siswa,${jpHeaders},Total H,Total I,Total S,Total A\n`;

          matrix5.forEach((row, idx) => {
            const rowVals = days5.map(d => jamList.map(j => {
              const cell = row.byDayJam[`${d.iso}_${j.id}`];
              return (cell && cell.hasSession) ? cell.status : '-';
            })).flat().join(',');
            csv += `${idx+1},"${row.stu.nama_siswa}",${rowVals},${row.H},${row.I},${row.S},${row.A}\n`;
          });

          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `rekap_5hari_${className}_${days5[0].iso}_sd_${days5[days5.length-1].iso}.csv`;
          a.click();
        });

        // Print / PDF Landscape
        content.querySelector('#btn-exp-print')?.addEventListener('click', () => {
          const className = classes.find(c=>c.id===parseInt(selClass))?.nama_kelas || '';
          const tableEl = document.getElementById('rekap-table');
          if (!tableEl) { alert('Tidak ada data untuk dicetak.'); return; }
          const teacherSub = activeTeacher
            ? `Guru Pengajar: ${activeTeacher.nama}${activeTeacher.mapelInClass ? ` (${activeTeacher.mapelInClass})` : ''} • `
            : '';
          this._openPrintPdf({
            title: `Rekapitulasi Presensi Siswa Per Jam Pelajaran — Kelas ${className}`,
            subtitle: `${teacherSub}Periode 5 Hari: ${days5[0].label} s/d ${days5[days5.length-1].label}`,
            tableHtml: tableEl.outerHTML,
            rightSignerLabel: activeTeacher ? `Guru Mapel (${activeTeacher.nama})` : `Wali Kelas ${className}`,
            compact: true
          });
        });

      } else {
        // ───────────────────────────────────────────
        // MODE 2: REKAP BULANAN (AKUMULASI PER JP DALAM 1 BULAN)
        // ───────────────────────────────────────────
        // Generate seluruh tanggal hari efektif KBM (Senin, Selasa, Rabu, Kamis, Sabtu) dalam bulan terpilih (~21-23 hari)
        // ditambah tanggal lain jika ada sesi di hari Jumat/Ahad
        const activeDatesSet = new Set(mySessions.map(s => s.tanggal));
        const daysInMonth = new Date(selYear, selMonth, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const iso = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dow = new Date(iso + 'T00:00:00').getDay(); // 0=Ahad, 5=Jumat (Libur rutin)
          if (dow !== 0 && dow !== 5) {
            activeDatesSet.add(iso);
          }
        }
        const dates = [...activeDatesSet].sort();
        const filledDatesCount = [...new Set(mySessions.map(s => s.tanggal))].length;
        const HARI_SHORT = ['Ahd', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const jamById = new Map();
        jamList.forEach(j => jamById.set(String(j.id), j));

        // Group sessions per date (sorted by urutan JP)
        const sessionsByDate = {};
        const dateTotals = {};
        dates.forEach(date => {
          sessionsByDate[date] = mySessions
            .filter(s => s.tanggal === date)
            .sort((a, b) => {
              const ja = jamById.get(String(a.lesson_hour_id));
              const jb = jamById.get(String(b.lesson_hour_id));
              return (ja?.urutan || 0) - (jb?.urutan || 0);
            });
          dateTotals[date] = { H: 0, I: 0, S: 0, A: 0 };
        });

        const grandTotalMonth = { H: 0, I: 0, S: 0, A: 0 };

        const matrixMonthly = students.map(stu => {
          const byDate = {};
          let H = 0, I = 0, S = 0, A = 0;

          dates.forEach(date => {
            const daySessions = sessionsByDate[date] || [];
            let dH = 0, dI = 0, dS = 0, dA = 0;
            const jpDetails = [];

            daySessions.forEach(sess => {
              const rec = attMap.get(`${sess.id}_${stu.id}`);
              const j = jamById.get(String(sess.lesson_hour_id));
              const jpLabel = j ? `JP ${j.urutan || j.nama}` : 'JP';
              if (rec && rec.status) {
                const st = rec.status;
                jpDetails.push(`${jpLabel}: ${st}`);
                if (st === 'H') { dH++; H++; dateTotals[date].H++; grandTotalMonth.H++; }
                else if (st === 'I') { dI++; I++; dateTotals[date].I++; grandTotalMonth.I++; }
                else if (st === 'S') { dS++; S++; dateTotals[date].S++; grandTotalMonth.S++; }
                else if (st === 'A') { dA++; A++; dateTotals[date].A++; grandTotalMonth.A++; }
              } else {
                jpDetails.push(`${jpLabel}: -`);
              }
            });

            // Build display badges/text per date showing JP counts
            const parts = [];
            const csvParts = [];
            if (dH > 0) { parts.push(`<span class="sts-H">${dH}H</span>`); csvParts.push(`${dH}H`); }
            if (dI > 0) { parts.push(`<span class="sts-I">${dI}I</span>`); csvParts.push(`${dI}I`); }
            if (dS > 0) { parts.push(`<span class="sts-S">${dS}S</span>`); csvParts.push(`${dS}S`); }
            if (dA > 0) { parts.push(`<span class="sts-A">${dA}A</span>`); csvParts.push(`${dA}A`); }

            byDate[date] = {
              html: parts.length > 0 ? parts.join(' ') : '<span style="color:#cbd5e1">–</span>',
              csvText: csvParts.length > 0 ? csvParts.join(' ') : '-',
              tooltip: jpDetails.join(', '),
              dH, dI, dS, dA
            };
          });

          return { stu, byDate, H, I, S, A };
        });

        content.innerHTML = `
          <div class="stack">
            <!-- Filters -->
            <div class="card" style="padding:0.75rem">
              <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:flex-end">
                <div class="form-group" style="margin:0;min-width:140px">
                  <label>Mode Tampilan</label>
                  <select id="sel-mode" class="form-control" style="font-size:0.82rem;font-weight:700;color:var(--primary)">
                    <option value="5hari">📋 5 Hari (Semua JP)</option>
                    <option value="bulanan" selected>📅 1 Bulan (Akumulasi JP)</option>
                  </select>
                </div>
                <div class="form-group" style="margin:0;min-width:95px">
                  <label>Kelas</label>
                  <select id="sel-class" class="form-control" style="font-size:0.82rem">
                    ${classes.map(c=>`<option value="${c.id}" ${String(c.id)===String(selClass)?'selected':''}>${c.nama_kelas}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:170px">
                  <label>Guru Pengajar</label>
                  <select id="sel-teacher" class="form-control" style="font-size:0.82rem">
                    <option value="all" ${selTeacher==='all'?'selected':''}>Semua Guru (${classTeachers.length})</option>
                    ${classTeachers.map(t => `<option value="${t.id}" ${String(t.id)===String(selTeacher)?'selected':''}>${this._escHtml(t.nama)}${t.mapelInClass ? ` — ${this._escHtml(t.mapelInClass)}` : ''}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;min-width:90px">
                  <label>Bulan</label>
                  <select id="sel-month" class="form-control" style="font-size:0.82rem">
                    ${MONTHS.map((m,i)=>`<option value="${i+1}" ${i+1===selMonth?'selected':''}>${m}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;min-width:80px">
                  <label>Tahun</label>
                  <input type="number" id="sel-year" class="form-control" value="${selYear}" style="font-size:0.82rem">
                </div>
                <div style="display:flex;gap:0.4rem;margin-left:auto;flex-wrap:wrap">
                  <button class="btn btn-outline btn-sm" id="btn-refresh-rekap" title="Muat ulang data absensi dari server">🔄 Sync</button>
                  <button class="btn btn-secondary btn-sm" id="btn-exp-excel" title="Unduh format Excel (.xlsx)">📊 Excel</button>
                  <button class="btn btn-outline btn-sm" id="btn-exp-csv" title="Unduh format CSV">⬇ CSV</button>
                  <button class="btn btn-primary btn-sm" id="btn-exp-print" title="Cetak atau simpan sebagai PDF">📄 PDF / Cetak</button>
                </div>
              </div>
            </div>

            <!-- Summary Info Badge -->
            <div class="card" style="padding:0.6rem 0.85rem;background:var(--primary-tint);border-color:#bbf7d0">
              <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:0.5rem;font-size:0.75rem">
                <div>
                  <b style="color:var(--primary)">📅 Rekap Bulanan (Per JP):</b>
                  <span style="font-weight:600">${MONTHS[selMonth-1]} ${selYear}</span>
                  ${activeTeacher ? `<span style="color:var(--primary);font-weight:600;margin-left:0.4rem">• Guru: ${this._escHtml(activeTeacher.nama)}${activeTeacher.mapelInClass ? ` (${this._escHtml(activeTeacher.mapelInClass)})` : ''}</span>` : ''}
                  <span style="color:var(--text-muted);margin-left:0.5rem">• ${dates.length} Hari Efektif (${filledDatesCount} Hari Terisi) • Total ${mySessions.length} Jam Pelajaran (JP)</span>
                </div>
                <div class="row" style="gap:0.6rem">
                  <span style="color:var(--text-muted)">Seluruh kehadiran dihitung per Jam Pelajaran (JP) dan dijumlahkan ke kolom Total H, I, S, A</span>
                </div>
              </div>
            </div>

            <!-- Matrix Table -->
            ${students.length === 0
              ? `<div class="empty-state"><p>Tidak ada siswa aktif di kelas ini.</p></div>`
              : `<div class="table-wrap" id="rekap-table-wrap" style="overflow-x:auto;max-width:100%">
                <table id="rekap-table" style="min-width:max-content;border-collapse:collapse;font-size:0.75rem">
                  <thead>
                    <tr style="background:#f0faf4">
                      <th rowspan="2" style="min-width:32px;text-align:center;position:sticky;left:0;z-index:3;background:#f0faf4;border:1px solid var(--border)">#</th>
                      <th rowspan="2" style="min-width:160px;position:sticky;left:32px;z-index:3;background:#f0faf4;border:1px solid var(--border);text-align:left;padding-left:0.5rem">Nama Siswa</th>
                      <th colspan="${dates.length}" style="text-align:center;border:1px solid var(--border);padding:0.35rem;background:#f0faf4;color:var(--primary);font-weight:700">
                        Tanggal Hari Efektif & Jumlah JP (${MONTHS[selMonth-1]} ${selYear})
                      </th>
                      <th colspan="4" style="text-align:center;border:1px solid var(--border);border-left:2px solid var(--primary);padding:0.35rem 0.5rem;background:#f0faf4;color:var(--primary);font-weight:700">
                        Total (JP)
                      </th>
                    </tr>
                    <tr style="background:#f9fafb">
                      ${dates.map(d=>{
                        const dt = new Date(d+'T00:00:00');
                        const day = dt.getDate();
                        const hariShort = HARI_SHORT[dt.getDay()];
                        const jpCount = (sessionsByDate[d] || []).length;
                        const isEmpty = jpCount === 0;
                        return `
                          <th title="${hariShort}, ${d} (${jpCount} Jam Pelajaran)" style="min-width:34px;text-align:center;padding:3px 4px;border:1px solid var(--border);background:${isEmpty ? '#fff7ed' : '#f9fafb'}">
                            <div style="font-size:0.56rem;color:var(--text-muted);font-weight:600">${hariShort}</div>
                            <div style="font-weight:700;color:${isEmpty ? '#9a3412' : 'var(--text)'}">${day}</div>
                            <div style="font-size:0.6rem;color:${isEmpty ? '#ea580c' : 'var(--text-muted)'};font-weight:500">${jpCount}JP</div>
                          </th>
                        `;
                      }).join('')}
                      <th style="min-width:32px;text-align:center;color:var(--hadir);border:1px solid var(--border);border-left:2px solid var(--primary)">H</th>
                      <th style="min-width:32px;text-align:center;color:var(--izin);border:1px solid var(--border)">I</th>
                      <th style="min-width:32px;text-align:center;color:var(--sakit);border:1px solid var(--border)">S</th>
                      <th style="min-width:32px;text-align:center;color:var(--alpa);border:1px solid var(--border)">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${matrixMonthly.map((row,idx)=>`
                      <tr class="student-row" style="background:${idx % 2 === 0 ? '#ffffff' : '#fcfdfc'}">
                        <td style="text-align:center;position:sticky;left:0;z-index:1;background:inherit;border:1px solid var(--border)">${idx+1}</td>
                        <td style="white-space:nowrap;font-weight:600;position:sticky;left:32px;z-index:1;background:inherit;border:1px solid var(--border);padding:0.35rem 0.5rem">${this._escHtml(row.stu.nama_siswa)}</td>
                        ${dates.map(d=>{
                          const cell = row.byDate[d];
                          return `<td title="${this._escHtml(cell?.tooltip || '')}" style="text-align:center;white-space:nowrap;padding:0.3rem 0.35rem;border:1px solid var(--border);font-size:0.74rem;cursor:help">${cell ? cell.html : '–'}</td>`;
                        }).join('')}
                        <td style="text-align:center;font-weight:700;color:var(--hadir);border:1px solid var(--border);border-left:2px solid var(--primary);background:#f0faf4">${row.H}</td>
                        <td style="text-align:center;font-weight:700;color:var(--izin);border:1px solid var(--border);background:#fffbeb">${row.I}</td>
                        <td style="text-align:center;font-weight:700;color:var(--sakit);border:1px solid var(--border);background:#eff6ff">${row.S}</td>
                        <td style="text-align:center;font-weight:700;color:var(--alpa);border:1px solid var(--border);background:#fef2f2">${row.A}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background:#f1f5f3;font-weight:700">
                      <td colspan="2" style="text-align:right;padding-right:0.75rem;position:sticky;left:0;z-index:1;background:#f1f5f3;border:1px solid var(--border);font-size:0.75rem">
                        Total Hadir (JP):
                      </td>
                      ${dates.map(d => `
                        <td style="text-align:center;font-size:0.72rem;color:var(--hadir);border:1px solid var(--border)">
                          ${dateTotals[d]?.H || 0}
                        </td>
                      `).join('')}
                      <td style="text-align:center;color:var(--hadir);border:1px solid var(--border);border-left:2px solid var(--primary)">${grandTotalMonth.H}</td>
                      <td style="text-align:center;color:var(--izin);border:1px solid var(--border)">${grandTotalMonth.I}</td>
                      <td style="text-align:center;color:var(--sakit);border:1px solid var(--border)">${grandTotalMonth.S}</td>
                      <td style="text-align:center;color:var(--alpa);border:1px solid var(--border)">${grandTotalMonth.A}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>`
            }
          </div>
        `;

        // Event Listeners for Monthly Mode
        content.querySelector('#sel-mode')?.addEventListener('change', e => { mode = e.target.value; render(); });
        content.querySelector('#sel-class')?.addEventListener('change', e => { selClass = parseInt(e.target.value); selTeacher = 'all'; render(); });
        content.querySelector('#sel-teacher')?.addEventListener('change', e => { selTeacher = e.target.value; render(); });
        content.querySelector('#sel-month')?.addEventListener('change', e => { selMonth = parseInt(e.target.value); render(); });
        content.querySelector('#sel-year')?.addEventListener('change', e => { selYear = parseInt(e.target.value); render(); });
        content.querySelector('#btn-refresh-rekap')?.addEventListener('click', () => { render(true); });

        // Export Excel (Monthly per JP)
        content.querySelector('#btn-exp-excel')?.addEventListener('click', () => {
          const className = classes.find(c=>c.id===parseInt(selClass))?.nama_kelas || '';
          const teacherLabel = activeTeacher ? `${activeTeacher.nama}${activeTeacher.mapelInClass ? ' (' + activeTeacher.mapelInClass + ')' : ''}` : 'Semua Guru';
          const dateHeaders = dates.map(d => `Tgl ${new Date(d+'T00:00:00').getDate()} (${(sessionsByDate[d]||[]).length}JP)`);
          const rows = [
            [`REKAPITULASI KEHADIRAN SISWA BULANAN (PER JP) — MTs PIQ SINGOSARI MALANG`],
            [`Kelas: ${className} | Guru Pengajar: ${teacherLabel}`],
            [`Periode: ${MONTHS[selMonth-1]} ${selYear}`],
            [],
            ['No', 'Nama Siswa', ...dateHeaders, 'Total H (JP)', 'Total I (JP)', 'Total S (JP)', 'Total A (JP)'],
            ...matrixMonthly.map((row, idx) => [
              idx + 1,
              row.stu.nama_siswa,
              ...dates.map(d => row.byDate[d]?.csvText || '-'),
              row.H, row.I, row.S, row.A
            ])
          ];
          const safeTeacher = activeTeacher ? `_${activeTeacher.kode || 'Guru'}` : '';
          this._downloadExcelWorkbook([
            { name: `Bulanan ${className}`, rows, colWidths: [5, 28, ...dateHeaders.map(() => 12), 11, 11, 11, 11] }
          ], `Rekap_Bulanan_${className}${safeTeacher}_${MONTHS[selMonth-1]}_${selYear}.xlsx`);
        });

        // Export CSV (Monthly per JP)
        content.querySelector('#btn-exp-csv')?.addEventListener('click', () => {
          const className = classes.find(c=>c.id===parseInt(selClass))?.nama_kelas || '';
          const teacherNote = activeTeacher ? ` | Guru: ${activeTeacher.nama}` : '';
          let csv = `Rekap Kehadiran Siswa (Per JP) ${className}${teacherNote} - ${MONTHS[selMonth-1]} ${selYear}\n`;
          csv += `No,Nama Siswa,${dates.map(d=>`"Tgl ${new Date(d+'T00:00:00').getDate()} (${(sessionsByDate[d]||[]).length}JP)"`).join(',')},Total H (JP),Total I (JP),Total S (JP),Total A (JP)\n`;
          matrixMonthly.forEach((row,idx) => {
            csv += `${idx+1},"${row.stu.nama_siswa}",${dates.map(d=>`"${row.byDate[d]?.csvText||'-'}"`).join(',')},${row.H},${row.I},${row.S},${row.A}\n`;
          });
          const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `rekap_bulanan_jp_${className}_${selYear}_${selMonth}.csv`;
          a.click();
        });

        // Print / PDF (Monthly)
        content.querySelector('#btn-exp-print')?.addEventListener('click', () => {
          const className = classes.find(c=>c.id===parseInt(selClass))?.nama_kelas || '';
          const tableEl = document.getElementById('rekap-table');
          if (!tableEl) { alert('Tidak ada data untuk dicetak.'); return; }
          const teacherSub = activeTeacher
            ? `Guru Pengajar: ${activeTeacher.nama}${activeTeacher.mapelInClass ? ` (${activeTeacher.mapelInClass})` : ''} • `
            : '';
          this._openPrintPdf({
            title: `Rekap Kehadiran Siswa Bulanan (Akumulasi Per JP) — Kelas ${className}`,
            subtitle: `${teacherSub}Periode: ${MONTHS[selMonth-1]} ${selYear}`,
            tableHtml: tableEl.outerHTML,
            rightSignerLabel: activeTeacher ? `Guru Mapel (${activeTeacher.nama})` : `Wali Kelas ${className}`,
            compact: true
          });
        });
      }
    };

    render();
  },

  // ==================================
  // LAPORAN GURU (HARIAN & BULANAN + EXCEL/PDF)
  // ==================================
  _renderLaporanGuru(content) {
    const now = new Date();
    const today = store.todayISO();
    let mode       = 'bulanan'; // 'bulanan' | 'harian'
    let selDate    = today;
    let selMonth   = now.getMonth() + 1;
    let selYear    = now.getFullYear();
    let selTeacher = 'all'; // 'all' | teacher.id
    let renderToken = 0;

    const HARI_LABEL = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const downloadExcelWorkbook = (sheets, filename) => this._downloadExcelWorkbook(sheets, filename);
    const openPrintPdf = (opts) => this._openPrintPdf(opts);

    const render = async (forceRefresh = false) => {
      const token = ++renderToken;

      if (forceRefresh) {
        content.innerHTML = `<div class="loader"><div class="spinner"></div></div><p style="text-align:center;font-size:0.8rem;color:var(--text-muted)">Memuat data terbaru dari server...</p>`;
        await store.forceSyncAll();
        if (token !== renderToken) return;
      }

      const teachers  = [...store.getTeachers()].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
      const schedules = store.getSchedules();
      const sessions  = store.getSessions();
      const jam       = store.getJam();
      const classes   = store.getClasses();
      const subjects  = store.getSubjects();

      const jamById     = new Map(jam.map(j => [String(j.id), j]));
      const classById   = new Map(classes.map(c => [String(c.id), c]));
      const subjectById = new Map(subjects.map(s => [String(s.id), s]));
      const schedById   = new Map(schedules.map(s => [String(s.id), s]));

      if (mode === 'bulanan') {
        const prefix = `${selYear}-${String(selMonth).padStart(2, '0')}`;
        const monthSessions = sessions.filter(s => s.tanggal && s.tanggal.startsWith(prefix));
        const daysInMonth = new Date(selYear, selMonth, 0).getDate();

        // Count how many times each day-name occurs in the selected month
        const dayCounts = {};
        for (let d = 1; d <= daysInMonth; d++) {
          const dt = new Date(selYear, selMonth - 1, d);
          const hName = HARI_LABEL[dt.getDay()];
          dayCounts[hName] = (dayCounts[hName] || 0) + 1;
        }

        // Build per-teacher monthly summary
        const teacherRecaps = teachers.map(teacher => {
          const myScheds = schedules.filter(s => String(s.teacher_id) === String(teacher.id));
          const mySchedIds = new Set(myScheds.map(s => String(s.id)));

          // Target JP in this month from weekly schedules
          let targetJP = 0;
          myScheds.forEach(s => {
            targetJP += (dayCounts[s.hari] || 0);
          });

          // Sessions taught by this teacher in this month (by teacher_id or schedule_id)
          const myMonthSessions = monthSessions.filter(sess => {
            if (String(sess.teacher_id) === String(teacher.id)) return true;
            const sc = schedById.get(String(sess.schedule_id));
            return sc && mySchedIds.has(String(sc.id));
          });

          // Sort sessions chronologically
          myMonthSessions.sort((a, b) => {
            if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
            const ja = jamById.get(String(a.lesson_hour_id));
            const jb = jamById.get(String(b.lesson_hour_id));
            return (ja?.urutan || 0) - (jb?.urutan || 0);
          });

          const uniqueDays = new Set(myMonthSessions.map(s => s.tanggal));
          const terisiJP = myMonthSessions.length;
          const belumJP = Math.max(0, targetJP - terisiJP);
          const pct = targetJP > 0 ? Math.min(100, Math.round((terisiJP / targetJP) * 100)) : (terisiJP > 0 ? 100 : 0);

          // Unique mapel & kelas
          const mapelNames = [...new Set([
            ...myScheds.map(s => subjectById.get(String(s.subject_id))?.pelajaran),
            ...myMonthSessions.map(s => subjectById.get(String(s.subject_id))?.pelajaran)
          ].filter(Boolean))];

          const classNames = [...new Set([
            ...myScheds.map(s => classById.get(String(s.class_id))?.nama_kelas),
            ...myMonthSessions.map(s => classById.get(String(s.class_id))?.nama_kelas)
          ].filter(Boolean))];

          return {
            teacher,
            mapelText: mapelNames.join(', ') || '—',
            kelasText: classNames.join(', ') || '—',
            hariMengajar: uniqueDays.size,
            targetJP,
            terisiJP,
            belumJP,
            pct,
            sessions: myMonthSessions
          };
        });

        const isSingleTeacher = selTeacher !== 'all';
        const activeRecap = isSingleTeacher
          ? teacherRecaps.find(r => String(r.teacher.id) === String(selTeacher))
          : null;

        // If single teacher selected, ensure attendances for their sessions are loaded so H/I/S/A counts are accurate
        let attMap = new Map();
        if (activeRecap && activeRecap.sessions.length > 0) {
          const sessIds = activeRecap.sessions.map(s => s.id);
          if (store.isCloudEnabled() && !store.hasAttendancesForSessions(sessIds)) {
            content.innerHTML = `<div class="loader"><div class="spinner"></div></div><p style="text-align:center;font-size:0.8rem;color:var(--text-muted)">Memuat detail presensi guru...</p>`;
            await store.ensureAttendancesForSessions(sessIds);
            if (token !== renderToken) return;
          }
          const sessIdSet = new Set(sessIds.map(String));
          store.getAttendances().forEach(a => {
            if (!sessIdSet.has(String(a.session_id))) return;
            const k = String(a.session_id);
            if (!attMap.has(k)) attMap.set(k, { H:0, I:0, S:0, A:0 });
            const st = attMap.get(k);
            if (st[a.status] !== undefined) st[a.status]++;
          });
        }

        // Totals for all-teachers table
        const grandTarget = teacherRecaps.reduce((acc, r) => acc + r.targetJP, 0);
        const grandTerisi = teacherRecaps.reduce((acc, r) => acc + r.terisiJP, 0);
        const grandBelum  = teacherRecaps.reduce((acc, r) => acc + r.belumJP, 0);
        const grandPct    = grandTarget > 0 ? Math.min(100, Math.round((grandTerisi / grandTarget) * 100)) : 0;

        content.innerHTML = `
          <div class="stack">
            <!-- Filters -->
            <div class="card" style="padding:0.75rem">
              <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:flex-end">
                <div class="form-group" style="margin:0;min-width:150px">
                  <label>Mode Laporan</label>
                  <select id="sel-guru-mode" class="form-control" style="font-size:0.82rem;font-weight:700;color:var(--primary)">
                    <option value="bulanan" selected>📊 Rekap Bulanan</option>
                    <option value="harian">📋 Harian (Per Tanggal)</option>
                  </select>
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:180px">
                  <label>Pilih Guru</label>
                  <select id="sel-guru-filter" class="form-control" style="font-size:0.82rem">
                    <option value="all" ${selTeacher==='all'?'selected':''}>Semua Guru (${teachers.length})</option>
                    ${teachers.map(t => `<option value="${t.id}" ${String(selTeacher)===String(t.id)?'selected':''}>${this._escHtml(t.nama)} (${t.kode})</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;min-width:110px">
                  <label>Bulan</label>
                  <select id="sel-guru-month" class="form-control" style="font-size:0.82rem">
                    ${MONTHS.map((m,i)=>`<option value="${i+1}" ${i+1===selMonth?'selected':''}>${m}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin:0;min-width:80px">
                  <label>Tahun</label>
                  <input type="number" id="sel-guru-year" class="form-control" value="${selYear}" style="font-size:0.82rem">
                </div>
                <div style="display:flex;gap:0.4rem;margin-left:auto;flex-wrap:wrap">
                  <button class="btn btn-outline btn-sm" id="btn-sync-cloud" title="Muat ulang data terbaru dari server">🔄 Sync</button>
                  <button class="btn btn-secondary btn-sm" id="btn-guru-excel" title="Unduh rekapan dalam format Excel (.xlsx)">📊 Excel</button>
                  <button class="btn btn-primary btn-sm" id="btn-guru-pdf" title="Cetak atau simpan sebagai PDF">📄 PDF / Cetak</button>
                </div>
              </div>
            </div>

            ${!isSingleTeacher ? `
              <!-- Summary Info -->
              <div class="card" style="padding:0.65rem 0.85rem;background:var(--primary-tint);border-color:#bbf7d0">
                <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:0.5rem;font-size:0.78rem">
                  <div>
                    <b style="color:var(--primary)">📊 Rekapitulasi Mengajar Guru:</b>
                    <span style="font-weight:600">${MONTHS[selMonth-1]} ${selYear}</span>
                    <span style="color:var(--text-muted);margin-left:0.5rem">• ${teachers.length} Guru • ${grandTerisi} / ${grandTarget} JP Terisi (${grandPct}%)</span>
                  </div>
                  <div style="color:var(--text-muted);font-size:0.74rem">
                    Klik <b>📊 Excel</b> untuk mengunduh ringkasan + rincian jurnal mengajar semua guru
                  </div>
                </div>
              </div>

              <!-- Table: All Teachers Recap -->
              <div class="table-wrap" style="overflow-x:auto;max-width:100%">
                <table id="guru-rekap-table" style="width:100%;min-width:max-content;border-collapse:collapse;font-size:0.76rem">
                  <thead>
                    <tr style="background:#f0faf4">
                      <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">#</th>
                      <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">Kode</th>
                      <th style="text-align:left;border:1px solid var(--border);padding:0.45rem 0.6rem;min-width:170px">Nama Guru</th>
                      <th style="text-align:left;border:1px solid var(--border);padding:0.45rem 0.6rem;min-width:150px">Mata Pelajaran</th>
                      <th style="text-align:left;border:1px solid var(--border);padding:0.45rem 0.6rem;min-width:120px">Kelas</th>
                      <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">Hari Mengajar</th>
                      <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">Target JP</th>
                      <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem;color:var(--hadir)">JP Terisi</th>
                      <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem;color:var(--alpa)">Belum Diisi</th>
                      <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">% Terisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teacherRecaps.map((r, idx) => `
                      <tr class="guru-row" data-teacher-id="${r.teacher.id}" style="background:${idx % 2 === 0 ? '#ffffff' : '#fcfdfc'};cursor:pointer" title="Klik untuk melihat rincian mengajar ${this._escHtml(r.teacher.nama)}">
                        <td style="text-align:center;border:1px solid var(--border);padding:0.4rem 0.5rem">${idx+1}</td>
                        <td style="text-align:center;border:1px solid var(--border);padding:0.4rem 0.5rem;font-weight:600;color:var(--text-sub)">${this._escHtml(r.teacher.kode)}</td>
                        <td style="border:1px solid var(--border);padding:0.4rem 0.6rem;font-weight:600;color:var(--primary)">${this._escHtml(r.teacher.nama)}</td>
                        <td style="border:1px solid var(--border);padding:0.4rem 0.6rem;max-width:220px">${this._escHtml(r.mapelText)}</td>
                        <td style="border:1px solid var(--border);padding:0.4rem 0.6rem;max-width:180px">${this._escHtml(r.kelasText)}</td>
                        <td style="text-align:center;border:1px solid var(--border);padding:0.4rem 0.5rem">${r.hariMengajar} hr</td>
                        <td style="text-align:center;border:1px solid var(--border);padding:0.4rem 0.5rem;font-weight:600">${r.targetJP}</td>
                        <td style="text-align:center;border:1px solid var(--border);padding:0.4rem 0.5rem;font-weight:700;color:var(--hadir);background:#f0fdf4">${r.terisiJP}</td>
                        <td style="text-align:center;border:1px solid var(--border);padding:0.4rem 0.5rem;font-weight:700;color:${r.belumJP > 0 ? 'var(--alpa)' : 'var(--text-muted)'};background:${r.belumJP > 0 ? '#fef2f2' : 'inherit'}">${r.belumJP}</td>
                        <td style="text-align:center;border:1px solid var(--border);padding:0.4rem 0.5rem;font-weight:700;color:${r.pct >= 80 ? '#15803d' : r.pct >= 50 ? '#b45309' : '#b91c1c'}">${r.pct}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background:#f1f5f3;font-weight:700">
                      <td colspan="6" style="text-align:right;border:1px solid var(--border);padding:0.45rem 0.6rem">TOTAL KESELURUHAN:</td>
                      <td style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">${grandTarget}</td>
                      <td style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem;color:var(--hadir)">${grandTerisi}</td>
                      <td style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem;color:var(--alpa)">${grandBelum}</td>
                      <td style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">${grandPct}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ` : !activeRecap ? `
              <div class="empty-state"><p>Data guru tidak ditemukan.</p></div>
            ` : `
              <!-- Single Teacher Summary Card -->
              <div class="card" style="padding:0.75rem 0.9rem;background:var(--primary-tint);border-color:#bbf7d0">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.6rem">
                  <div>
                    <div style="font-size:0.92rem;font-weight:700;color:var(--primary)">${this._escHtml(activeRecap.teacher.nama)} (${this._escHtml(activeRecap.teacher.kode)})</div>
                    <div style="font-size:0.74rem;color:var(--text-sub);margin-top:2px">
                      Periode: <b>${MONTHS[selMonth-1]} ${selYear}</b> • Mapel: ${this._escHtml(activeRecap.mapelText)} • Kelas: ${this._escHtml(activeRecap.kelasText)}
                    </div>
                  </div>
                  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;font-size:0.75rem">
                    <span style="background:#fff;border:1px solid #bbf7d0;padding:0.25rem 0.55rem;border-radius:8px">Hari Mengajar: <b>${activeRecap.hariMengajar}</b></span>
                    <span style="background:#fff;border:1px solid #bbf7d0;padding:0.25rem 0.55rem;border-radius:8px">Target: <b>${activeRecap.targetJP} JP</b></span>
                    <span style="background:#dcfce7;color:#15803d;padding:0.25rem 0.55rem;border-radius:8px">Terisi: <b>${activeRecap.terisiJP} JP (${activeRecap.pct}%)</b></span>
                  </div>
                </div>
              </div>

              <!-- Single Teacher Detail Table -->
              ${activeRecap.sessions.length === 0 ? `
                <div class="empty-state"><p>Belum ada catatan presensi/jurnal untuk guru ini pada ${MONTHS[selMonth-1]} ${selYear}.</p></div>
              ` : `
                <div class="table-wrap" style="overflow-x:auto;max-width:100%">
                  <table id="guru-rekap-table" style="width:100%;min-width:max-content;border-collapse:collapse;font-size:0.75rem">
                    <thead>
                      <tr style="background:#f0faf4">
                        <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.4rem">#</th>
                        <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">Tanggal</th>
                        <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">Hari</th>
                        <th style="text-align:left;border:1px solid var(--border);padding:0.45rem 0.5rem">Jam Pelajaran</th>
                        <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.5rem">Kelas</th>
                        <th style="text-align:left;border:1px solid var(--border);padding:0.45rem 0.5rem">Mapel</th>
                        <th style="text-align:left;border:1px solid var(--border);padding:0.45rem 0.5rem;min-width:160px">Materi</th>
                        <th style="text-align:left;border:1px solid var(--border);padding:0.45rem 0.5rem;min-width:140px">Catatan Jurnal</th>
                        <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.4rem;color:var(--hadir)">H</th>
                        <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.4rem;color:var(--izin)">I</th>
                        <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.4rem;color:var(--sakit)">S</th>
                        <th style="text-align:center;border:1px solid var(--border);padding:0.45rem 0.4rem;color:var(--alpa)">A</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${activeRecap.sessions.map((sess, idx) => {
                        const dt = new Date(sess.tanggal + 'T00:00:00');
                        const hariNama = HARI_LABEL[dt.getDay()];
                        const j = jamById.get(String(sess.lesson_hour_id));
                        const kls = classById.get(String(sess.class_id));
                        const mpl = subjectById.get(String(sess.subject_id));
                        const st = attMap.get(String(sess.id)) || { H:0, I:0, S:0, A:0 };
                        return `
                          <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#fcfdfc'}">
                            <td style="text-align:center;border:1px solid var(--border);padding:0.35rem 0.4rem">${idx+1}</td>
                            <td style="text-align:center;border:1px solid var(--border);padding:0.35rem 0.5rem;white-space:nowrap">${sess.tanggal}</td>
                            <td style="text-align:center;border:1px solid var(--border);padding:0.35rem 0.5rem">${hariNama}</td>
                            <td style="border:1px solid var(--border);padding:0.35rem 0.5rem;white-space:nowrap">${j ? `${j.nama} (${j.jam_mulai}–${j.jam_selesai})` : '—'}</td>
                            <td style="text-align:center;border:1px solid var(--border);padding:0.35rem 0.5rem;font-weight:600">${this._escHtml(kls?.nama_kelas || '—')}</td>
                            <td style="border:1px solid var(--border);padding:0.35rem 0.5rem">${this._escHtml(mpl?.pelajaran || '—')}</td>
                            <td style="border:1px solid var(--border);padding:0.35rem 0.5rem">${this._escHtml(sess.materi || '—')}</td>
                            <td style="border:1px solid var(--border);padding:0.35rem 0.5rem">${this._escHtml(sess.catatan_jurnal || '—')}</td>
                            <td style="text-align:center;border:1px solid var(--border);padding:0.35rem 0.4rem;font-weight:700;color:var(--hadir)">${st.H}</td>
                            <td style="text-align:center;border:1px solid var(--border);padding:0.35rem 0.4rem;font-weight:700;color:var(--izin)">${st.I}</td>
                            <td style="text-align:center;border:1px solid var(--border);padding:0.35rem 0.4rem;font-weight:700;color:var(--sakit)">${st.S}</td>
                            <td style="text-align:center;border:1px solid var(--border);padding:0.35rem 0.4rem;font-weight:700;color:var(--alpa)">${st.A}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            `}
          </div>
        `;

        // Click row in all-teachers table to drill down to that teacher
        content.querySelectorAll('.guru-row[data-teacher-id]').forEach(tr => {
          tr.addEventListener('click', () => {
            selTeacher = tr.dataset.teacherId;
            render();
          });
        });

        content.querySelector('#sel-guru-mode')?.addEventListener('change', e => {
          mode = e.target.value;
          render();
        });
        content.querySelector('#sel-guru-filter')?.addEventListener('change', e => {
          selTeacher = e.target.value;
          render();
        });
        content.querySelector('#sel-guru-month')?.addEventListener('change', e => {
          selMonth = parseInt(e.target.value);
          render();
        });
        content.querySelector('#sel-guru-year')?.addEventListener('change', e => {
          selYear = parseInt(e.target.value);
          render();
        });
        content.querySelector('#btn-sync-cloud')?.addEventListener('click', () => render(true));

        // Export Excel (.xlsx)
        content.querySelector('#btn-guru-excel')?.addEventListener('click', () => {
          const periodLabel = `${MONTHS[selMonth-1]}_${selYear}`;
          if (!isSingleTeacher) {
            const summaryRows = [
              [`REKAPITULASI MENGAJAR GURU — MTs PIQ SINGOSARI MALANG`],
              [`Periode: ${MONTHS[selMonth-1]} ${selYear}`],
              [],
              ['No', 'Kode Guru', 'Nama Guru', 'Mata Pelajaran', 'Kelas', 'Hari Mengajar', 'Target JP', 'JP Terisi', 'Belum Diisi', 'Persentase (%)'],
              ...teacherRecaps.map((r, i) => [
                i + 1, r.teacher.kode, r.teacher.nama, r.mapelText, r.kelasText,
                r.hariMengajar, r.targetJP, r.terisiJP, r.belumJP, `${r.pct}%`
              ]),
              ['', '', 'TOTAL KESELURUHAN', '', '', '', grandTarget, grandTerisi, grandBelum, `${grandPct}%`]
            ];

            const detailRows = [
              [`RINCIAN JURNAL & PRESENSI MENGAJAR — ${MONTHS[selMonth-1]} ${selYear}`],
              [],
              ['No', 'Tanggal', 'Hari', 'Kode Guru', 'Nama Guru', 'Jam Pelajaran', 'Kelas', 'Mata Pelajaran', 'Materi', 'Catatan Jurnal']
            ];
            let dNo = 1;
            teacherRecaps.forEach(r => {
              r.sessions.forEach(sess => {
                const dt = new Date(sess.tanggal + 'T00:00:00');
                const j = jamById.get(String(sess.lesson_hour_id));
                const kls = classById.get(String(sess.class_id));
                const mpl = subjectById.get(String(sess.subject_id));
                detailRows.push([
                  dNo++,
                  sess.tanggal,
                  HARI_LABEL[dt.getDay()],
                  r.teacher.kode,
                  r.teacher.nama,
                  j ? `${j.nama} (${j.jam_mulai}-${j.jam_selesai})` : '-',
                  kls?.nama_kelas || '-',
                  mpl?.pelajaran || '-',
                  sess.materi || '-',
                  sess.catatan_jurnal || '-'
                ]);
              });
            });

            downloadExcelWorkbook([
              { name: 'Rekap Guru', rows: summaryRows, colWidths: [5, 12, 30, 26, 20, 14, 12, 12, 12, 14] },
              { name: 'Rincian Jurnal', rows: detailRows, colWidths: [5, 12, 10, 12, 28, 22, 10, 22, 32, 28] }
            ], `Rekap_Guru_${periodLabel}.xlsx`);
          } else if (activeRecap) {
            const safeName = (activeRecap.teacher.nama || 'Guru').replace(/[^a-zA-Z0-9_-]/g, '_');
            const summaryRows = [
              [`REKAPITULASI MENGAJAR GURU — MTs PIQ SINGOSARI MALANG`],
              [`Nama Guru: ${activeRecap.teacher.nama} (${activeRecap.teacher.kode})`],
              [`Periode: ${MONTHS[selMonth-1]} ${selYear}`],
              [`Mapel: ${activeRecap.mapelText} | Kelas: ${activeRecap.kelasText}`],
              [],
              ['Hari Mengajar', 'Target JP', 'JP Terisi', 'Belum Diisi', 'Persentase (%)'],
              [activeRecap.hariMengajar, activeRecap.targetJP, activeRecap.terisiJP, activeRecap.belumJP, `${activeRecap.pct}%`]
            ];
            const detailRows = [
              [`RINCIAN MENGAJAR: ${activeRecap.teacher.nama} (${MONTHS[selMonth-1]} ${selYear})`],
              [],
              ['No', 'Tanggal', 'Hari', 'Jam Pelajaran', 'Kelas', 'Mata Pelajaran', 'Materi', 'Catatan Jurnal', 'H', 'I', 'S', 'A'],
              ...activeRecap.sessions.map((sess, i) => {
                const dt = new Date(sess.tanggal + 'T00:00:00');
                const j = jamById.get(String(sess.lesson_hour_id));
                const kls = classById.get(String(sess.class_id));
                const mpl = subjectById.get(String(sess.subject_id));
                const st = attMap.get(String(sess.id)) || { H:0, I:0, S:0, A:0 };
                return [
                  i + 1, sess.tanggal, HARI_LABEL[dt.getDay()],
                  j ? `${j.nama} (${j.jam_mulai}-${j.jam_selesai})` : '-',
                  kls?.nama_kelas || '-', mpl?.pelajaran || '-',
                  sess.materi || '-', sess.catatan_jurnal || '-',
                  st.H, st.I, st.S, st.A
                ];
              })
            ];
            downloadExcelWorkbook([
              { name: 'Rincian Mengajar', rows: detailRows, colWidths: [5, 12, 10, 22, 10, 22, 32, 28, 6, 6, 6, 6] },
              { name: 'Ringkasan', rows: summaryRows, colWidths: [16, 14, 14, 14, 16] }
            ], `Rekap_Guru_${safeName}_${periodLabel}.xlsx`);
          }
        });

        // Export PDF / Print
        content.querySelector('#btn-guru-pdf')?.addEventListener('click', () => {
          const tableEl = document.getElementById('guru-rekap-table');
          if (!tableEl) {
            alert('Tidak ada data untuk dicetak.');
            return;
          }
          if (!isSingleTeacher) {
            openPrintPdf({
              title: `Rekapitulasi Mengajar Guru — ${MONTHS[selMonth-1]} ${selYear}`,
              subtitle: `Total ${teachers.length} Guru • ${grandTerisi} / ${grandTarget} JP Terisi (${grandPct}%)`,
              tableHtml: tableEl.outerHTML,
              rightSignerLabel: 'Waka Kurikulum'
            });
          } else if (activeRecap) {
            openPrintPdf({
              title: `Rekap Mengajar Guru: ${activeRecap.teacher.nama} (${activeRecap.teacher.kode})`,
              subtitle: `Periode: ${MONTHS[selMonth-1]} ${selYear} • Terisi: ${activeRecap.terisiJP} / ${activeRecap.targetJP} JP (${activeRecap.pct}%)`,
              tableHtml: tableEl.outerHTML,
              rightSignerLabel: `Guru Mapel (${activeRecap.teacher.nama})`
            });
          }
        });

      } else {
        // ───────────────────────────────────────────
        // MODE HARIAN: STATUS GURU PER TANGGAL
        // ───────────────────────────────────────────
        const hari = HARI_LABEL[new Date(selDate + 'T00:00:00').getDay()];
        const teacherStatus = store.getTeacherStatusToday(selDate);

        const classIds = [...new Set(
          teacherStatus.flatMap(t => t.schedules.map(s => String(s.class_id)))
        )];
        const gridClasses = classes.filter(c => classIds.includes(String(c.id)));

        const doneCount    = teacherStatus.filter(t => t.done === t.total).length;
        const notDoneCount = teacherStatus.length - doneCount;

        content.innerHTML = `
          <div class="stack">
            <!-- Filters -->
            <div class="card" style="padding:0.75rem">
              <div class="row" style="gap:0.65rem;align-items:flex-end;justify-content:space-between;flex-wrap:wrap">
                <div class="row" style="gap:0.75rem;align-items:flex-end;flex-wrap:wrap">
                  <div class="form-group" style="margin:0;min-width:150px">
                    <label>Mode Laporan</label>
                    <select id="sel-guru-mode" class="form-control" style="font-size:0.82rem;font-weight:700;color:var(--primary)">
                      <option value="bulanan">📊 Rekap Bulanan</option>
                      <option value="harian" selected>📋 Harian (Per Tanggal)</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin:0">
                    <label>Tanggal</label>
                    <input type="date" id="sel-date" class="form-control" value="${selDate}" style="font-size:0.82rem">
                  </div>
                  <div style="font-size:0.9rem;font-weight:700;color:var(--primary);padding-bottom:0.35rem">${hari}</div>
                </div>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
                  <button class="btn btn-outline btn-sm" id="btn-sync-cloud" title="Muat ulang seluruh data terbaru dari cloud">🔄 Sync</button>
                  <button class="btn btn-secondary btn-sm" id="btn-guru-harian-excel" title="Unduh laporan harian Excel (.xlsx)">📊 Excel</button>
                  <button class="btn btn-primary btn-sm" id="btn-guru-harian-pdf" title="Cetak atau simpan sebagai PDF">📄 PDF / Cetak</button>
                </div>
              </div>
            </div>

            ${teacherStatus.length === 0 ? `
              <div class="empty-state">
                <p>Tidak ada jadwal mengajar pada hari <b>${hari}</b>.</p>
              </div>
            ` : `
            <!-- Summary bar -->
            <div class="card" style="padding:0.65rem 0.85rem">
              <div class="row" style="justify-content:space-between;gap:0.5rem">
                <div style="font-size:0.8rem;color:var(--text-sub)">
                  Laporan <b>${hari}, ${selDate}</b> — ${teacherStatus.length} guru mengajar
                </div>
                <div class="row" style="gap:0.5rem">
                  <span style="font-size:0.78rem;font-weight:700;color:#15803d;background:#dcfce7;padding:0.2rem 0.6rem;border-radius:20px">
                    ✓ Sudah: ${doneCount}
                  </span>
                  <span style="font-size:0.78rem;font-weight:700;color:#b91c1c;background:#fee2e2;padding:0.2rem 0.6rem;border-radius:20px">
                    ✗ Belum: ${notDoneCount}
                  </span>
                </div>
              </div>
              <div style="margin-top:0.5rem;height:6px;background:#e5e7eb;border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${teacherStatus.length > 0 ? Math.round(doneCount/teacherStatus.length*100) : 0}%;background:#16a34a;border-radius:4px;transition:width 0.4s"></div>
              </div>
            </div>

            <!-- Grid Table: Guru × Kelas -->
            <div style="overflow-x:auto">
              <table id="guru-harian-table" style="border-collapse:collapse;width:100%;min-width:max-content;font-size:0.78rem">
                <thead>
                  <tr style="background:#f0faf4">
                    <th style="border:1px solid #d1e8dc;padding:0.5rem 0.75rem;text-align:left;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap;min-width:160px">Guru</th>
                    <th style="border:1px solid #d1e8dc;padding:0.5rem 0.75rem;text-align:left;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap">Jam</th>
                    <th style="border:1px solid #d1e8dc;padding:0.5rem 0.75rem;text-align:left;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap">Mapel</th>
                    ${gridClasses.map(cls => `
                      <th style="border:1px solid #d1e8dc;padding:0.5rem 0.6rem;text-align:center;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap;min-width:80px">
                        ${this._escHtml(cls.nama_kelas)}
                      </th>
                    `).join('')}
                    <th style="border:1px solid #d1e8dc;padding:0.5rem 0.6rem;text-align:center;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${teacherStatus.map(t => {
                    const sortedScheds = [...t.schedules].sort((a, b) => {
                      const ja = jamById.get(String(a.lesson_hour_id));
                      const jb = jamById.get(String(b.lesson_hour_id));
                      return (ja?.urutan || 0) - (jb?.urutan || 0);
                    });

                    const allDone   = t.done === t.total;
                    const rowBg     = allDone ? '#f0fdf4' : '#fff7f7';
                    const borderClr = allDone ? '#86efac' : '#fca5a5';

                    return sortedScheds.map((sch, schIdx) => {
                      const j       = jamById.get(String(sch.lesson_hour_id));
                      const mapel   = subjectById.get(String(sch.subject_id));
                      const isDone  = sch.done;
                      const cellBg  = isDone ? '#dcfce7' : '#fee2e2';
                      const cellClr = isDone ? '#15803d' : '#b91c1c';
                      const cellBdr = isDone ? '#86efac' : '#fca5a5';

                      const teacherCell = schIdx === 0 ? `
                        <td rowspan="${sortedScheds.length}" style="border:1px solid ${borderClr};padding:0.5rem 0.65rem;background:${rowBg};vertical-align:middle">
                          <div style="font-weight:700;font-size:0.82rem;color:#1a2b23">${this._escHtml(t.teacher.nama)}</div>
                          <div style="font-size:0.68rem;color:#4a6358;margin-top:1px">${t.teacher.kode}</div>
                        </td>
                      ` : '';

                      const classCells = gridClasses.map(cls => {
                        if (String(sch.class_id) === String(cls.id)) {
                          return `<td style="border:1px solid ${cellBdr};padding:0.4rem 0.5rem;text-align:center;background:${cellBg};font-weight:700;font-size:0.85rem;color:${cellClr}">${isDone ? '✓' : '✗'}</td>`;
                        }
                        return `<td style="border:1px solid #e5e7eb;padding:0.4rem;text-align:center;color:#d1d5db;background:#f9fafb">—</td>`;
                      }).join('');

                      return `
                        <tr>
                          ${teacherCell}
                          <td style="border:1px solid ${borderClr};padding:0.4rem 0.65rem;background:${rowBg};white-space:nowrap;font-size:0.72rem;color:#1a7a4a;font-weight:600">
                            ${j ? `${j.nama}<br><span style="font-weight:400;color:#7a9688">${j.jam_mulai}–${j.jam_selesai}</span>` : '—'}
                          </td>
                          <td style="border:1px solid ${borderClr};padding:0.4rem 0.65rem;background:${rowBg};white-space:nowrap;font-size:0.75rem;color:#1a2b23">
                            ${this._escHtml(mapel?.pelajaran || '—')}
                          </td>
                          ${classCells}
                          ${schIdx === 0 ? `
                            <td rowspan="${sortedScheds.length}" style="border:1px solid ${borderClr};padding:0.4rem 0.6rem;text-align:center;background:${rowBg};vertical-align:middle">
                              <div style="font-size:0.78rem;font-weight:700;color:${allDone ? '#15803d' : '#b91c1c'}">${allDone ? '✓ Selesai' : `${t.done}/${t.total} jam`}</div>
                              <div style="font-size:0.65rem;color:${allDone ? '#16a34a' : '#dc2626'};margin-top:0.1rem">${allDone ? 'Lengkap' : 'Belum selesai'}</div>
                            </td>
                          ` : ''}
                        </tr>
                      `;
                    }).join('');
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Legend -->
            <div class="row" style="gap:0.75rem;font-size:0.72rem">
              <span style="display:flex;align-items:center;gap:0.3rem">
                <span style="width:14px;height:14px;background:#dcfce7;border:1px solid #86efac;border-radius:3px;display:inline-block"></span>
                <span style="color:#15803d;font-weight:600">Sudah mengisi absensi</span>
              </span>
              <span style="display:flex;align-items:center;gap:0.3rem">
                <span style="width:14px;height:14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:3px;display:inline-block"></span>
                <span style="color:#b91c1c;font-weight:600">Belum mengisi absensi</span>
              </span>
            </div>
            `}
          </div>
        `;

        content.querySelector('#sel-guru-mode')?.addEventListener('change', e => {
          mode = e.target.value;
          render();
        });
        content.querySelector('#sel-date')?.addEventListener('change', e => {
          selDate = e.target.value;
          render();
        });
        content.querySelector('#btn-sync-cloud')?.addEventListener('click', () => render(true));

        content.querySelector('#btn-guru-harian-excel')?.addEventListener('click', () => {
          if (teacherStatus.length === 0) return alert('Tidak ada data untuk diunduh.');
          const rows = [
            [`LAPORAN KEHADIRAN MENGAJAR GURU HARIAN — MTs PIQ SINGOSARI MALANG`],
            [`Hari/Tanggal: ${hari}, ${selDate}`],
            [],
            ['No', 'Kode', 'Nama Guru', 'Jam Pelajaran', 'Kelas', 'Mata Pelajaran', 'Status Mengisi']
          ];
          let no = 1;
          teacherStatus.forEach(t => {
            t.schedules.forEach(sch => {
              const j = jamById.get(String(sch.lesson_hour_id));
              const kls = classById.get(String(sch.class_id));
              const mpl = subjectById.get(String(sch.subject_id));
              rows.push([
                no++, t.teacher.kode, t.teacher.nama,
                j ? `${j.nama} (${j.jam_mulai}-${j.jam_selesai})` : '-',
                kls?.nama_kelas || '-', mpl?.pelajaran || '-',
                sch.done ? 'Sudah Mengisi' : 'Belum Mengisi'
              ]);
            });
          });
          downloadExcelWorkbook([
            { name: `Harian ${selDate}`, rows, colWidths: [5, 10, 28, 22, 10, 22, 16] }
          ], `Laporan_Guru_Harian_${selDate}.xlsx`);
        });

        content.querySelector('#btn-guru-harian-pdf')?.addEventListener('click', () => {
          const tableEl = document.getElementById('guru-harian-table');
          if (!tableEl) return alert('Tidak ada data untuk dicetak.');
          openPrintPdf({
            title: `Laporan Harian Mengajar Guru — ${hari}, ${selDate}`,
            subtitle: `${teacherStatus.length} Guru Mengajar • Sudah Selesai: ${doneCount} • Belum Selesai: ${notDoneCount}`,
            tableHtml: tableEl.outerHTML,
            rightSignerLabel: 'Waka Kurikulum'
          });
        });
      }
    };

    render();
  },



  _downloadExcelWorkbook(sheets, filename) {
    if (typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();
      sheets.forEach(({ name, rows, colWidths }) => {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        if (colWidths) {
          ws['!cols'] = colWidths.map(w => ({ wch: w }));
        }
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      });
      XLSX.writeFile(wb, filename);
      if (window._toast) window._toast(`✓ File Excel berhasil diunduh: ${filename}`, 'success');
    } else {
      const firstRows = sheets[0]?.rows || [];
      const csv = firstRows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename.replace(/\.xlsx$/i, '.csv');
      a.click();
      if (window._toast) window._toast('⚠ Library Excel offline — diunduh sebagai CSV', 'warning');
    }
  },

  _openPrintPdf({ title, subtitle, tableHtml, rightSignerLabel, compact = false }) {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Popup diblokir browser. Izinkan popup untuk mencetak / simpan PDF.');
      return;
    }
    const fontSz = compact ? '8px' : '10px';
    const cellSz = compact ? '7.5px' : '9px';
    const cellPad = compact ? '2px 3px' : '4px 6px';
    win.document.write(`
      <!DOCTYPE html><html lang="id"><head>
      <meta charset="UTF-8"><title>${this._escHtml(title)}</title>
      <style>
        @page { size: landscape; margin: 0.7cm; }
        body { font-family: Arial, sans-serif; font-size: ${fontSz}; color: #111; padding: 0.4cm; }
        h2, h3 { text-align: center; margin: 2px 0; }
        p.sub { text-align: center; font-size: 9px; color: #444; margin: 4px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #777; padding: ${cellPad}; font-size: ${cellSz}; vertical-align: middle; text-align: center; }
        th { background: #e8f5ed; color: #14532d; font-weight: bold; }
        tfoot td { background: #f1f5f3; font-weight: bold; }
        .sts-H { font-weight: bold; color: #15803d; }
        .sts-I { font-weight: bold; color: #b45309; }
        .sts-S { font-weight: bold; color: #1d4ed8; }
        .sts-A { font-weight: bold; color: #b91c1c; }
        .sign-wrap { margin-top: 20px; display: flex; justify-content: space-between; font-size: 9.5px; }
      </style></head><body>
      <h2>MTs PIQ Singosari Malang</h2>
      <h3>${this._escHtml(title)}</h3>
      ${subtitle ? `<p class="sub">${this._escHtml(subtitle)}</p>` : ''}
      ${tableHtml}
      <div class="sign-wrap">
        <div>
          <p>Mengetahui,<br>Kepala Madrasah<br><br><br><br><b>_____________________</b></p>
        </div>
        <div style="text-align:right">
          <p>Singosari, ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}<br>${this._escHtml(rightSignerLabel || 'Waka Kurikulum / Operator')}<br><br><br><br><b>_____________________</b></p>
        </div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  },

  _escHtml(s) {
    if(!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};
