/* js/pages/presensi.js */
import { store } from '../store.js';

const HARI = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI_LIST = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

export const PresensiPage = {
  _pendingScheduleId: null, // Set from dashboard click
  _clipboard: null, // Stored copied attendance: { sourceInfo, materi, catatanJurnal, students: [...] }
  _state: {
    selectedDay: null,
    selectedScheduleId: null,
    tanggal: null,
    students: [],   // [{student_id, ids, nama_siswa, status, catatan, umpan_balik}]
    materi: '',
    catatanJurnal: ''
  },

  render(container) {
    const user = store.getCurrentUser();
    // Both admin and guru can take attendance
    this._container = container;
    this._user = user;

    // Init today's day
    const todayHari = HARI[new Date().getDay()];
    this._state.tanggal = store.todayISO();
    this._state.selectedDay = HARI_LIST.includes(todayHari) ? todayHari : 'Senin';

    // If navigated from dashboard with a specific schedule (via global flag)
    const pendingId = window.__pendingScheduleId;
    if (pendingId) {
      window.__pendingScheduleId = null;
      this._state.selectedScheduleId = pendingId;
      this._renderAbsensiForm(container);
    } else {
      this._renderScheduleList(container);
    }
  },

  // ==================================
  // STEP 1: SCHEDULE LIST
  // ==================================
  _renderScheduleList(container) {
    const user = this._user;

    const rebuild = () => {
      const day = this._state.selectedDay;
      // Admin sees all schedules; guru sees only their own
      let schedules = user.role === 'admin'
        ? store.getSchedulesByDay(day)
        : store.getSchedulesByTeacher(user.id).filter(s => s.hari === day);

      const jam     = store.getJam();
      const classes = store.getClasses();
      const subjects= store.getSubjects();
      const teachers= store.getTeachers();
      const sessions= store.getSessions().filter(s => s.tanggal === this._state.tanggal);

      schedules.sort((a,b) => {
        const ja = jam.find(j=>String(j.id)===String(a.lesson_hour_id));
        const jb = jam.find(j=>String(j.id)===String(b.lesson_hour_id));
        return (ja?.urutan||0)-(jb?.urutan||0);
      });

      container.innerHTML = `
        <div class="fade-in stack">

          <div class="page-header">
            <div>
              <div class="page-title">Presensi Siswa</div>
              <div class="page-subtitle">Pilih jam pelajaran untuk mengisi absensi</div>
            </div>
          </div>

          <!-- Tanggal -->
          <div class="card" style="padding:0.75rem 1rem">
            <div class="row" style="gap:0.75rem;flex-wrap:nowrap">
              <label style="font-size:0.78rem;font-weight:600;color:var(--text-sub);white-space:nowrap;margin:0">Tanggal:</label>
              <input type="date" id="inp-tanggal" class="form-control" value="${this._state.tanggal}"
                style="max-width:180px;padding:0.35rem 0.6rem;font-size:0.82rem">
            </div>
          </div>

          <!-- Day Chips -->
          <div class="chip-group" id="day-chips">
            ${HARI_LIST.map(d => `<button class="chip ${d===day?'active':''}" data-day="${d}">${d}</button>`).join('')}
          </div>

          <!-- Schedule Cards -->
          <div class="stack" id="sched-list">
            ${schedules.length === 0 ? `
              <div class="empty-state">
                <p>Tidak ada jadwal ${user.role==='guru'?'mengajar ':''} hari ${day}.</p>
              </div>
            ` : schedules.map(sch => {
              const j      = jam.find(x=>String(x.id)===String(sch.lesson_hour_id));
              const kelas  = classes.find(c=>String(c.id)===String(sch.class_id));
              const mapel  = subjects.find(s=>String(s.id)===String(sch.subject_id));
              const teacher= teachers.find(t=>String(t.id)===String(sch.teacher_id));
              const isDone = sessions.some(sess=>String(sess.schedule_id)===String(sch.id));
              const siswaCount = store.getStudentsByClass(sch.class_id).length;

              return `
                <div class="jadwal-card ${isDone?'done':''}" data-sch-id="${sch.id}" id="jc-${sch.id}" style="cursor:pointer">
                  <div class="jc-time">
                    <div>${j?.jam_mulai||'--'}</div>
                    <div style="font-size:0.58rem;opacity:0.75">${j?.jam_selesai||''}</div>
                  </div>
                  <div class="jc-body">
                    <div class="jc-mapel">${mapel?.pelajaran||'—'}</div>
                    <div class="jc-kelas">${kelas?.nama_kelas||'—'} • ${j?.nama||''} • ${siswaCount} siswa</div>
                    ${user.role==='admin' ? `<div style="font-size:0.68rem;color:var(--primary)">${teacher?.nama||'—'} (${teacher?.kode||''})</div>` : ''}
                    <div class="jc-status" style="color:${isDone?'var(--hadir)':'var(--izin)'}">
                      ${isDone ? '✓ Sudah diisi' : '⏳ Belum diisi'}
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--text-muted);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      `;

      // Day chip events
      container.querySelectorAll('.chip[data-day]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._state.selectedDay = btn.dataset.day;
          rebuild();
        });
      });

      // Tanggal input
      container.querySelector('#inp-tanggal').addEventListener('change', e => {
        this._state.tanggal = e.target.value;
        // Update selected day to match the date's day
        const d = new Date(e.target.value + 'T00:00:00');
        const h = HARI[d.getDay()];
        if (HARI_LIST.includes(h)) this._state.selectedDay = h;
        rebuild();
      });

      // Schedule card click → open absensi form
      container.querySelectorAll('.jadwal-card[data-sch-id]').forEach(card => {
        card.addEventListener('click', () => {
          this._state.selectedScheduleId = parseInt(card.dataset.schId);
          this._renderAbsensiForm(container);
        });
      });
    };

    rebuild();
  },

  // ==================================
  // STEP 2: ABSENSI FORM
  // ==================================
  _renderAbsensiForm(container) {
    const schedId = this._state.selectedScheduleId;
    const tanggal = this._state.tanggal;
    const schedules = store.getSchedules();
    const schedule  = schedules.find(s=>String(s.id)===String(schedId));
    if (!schedule) {
      this._renderScheduleList(container);
      return;
    }

    const jam     = store.getJam();
    const classes = store.getClasses();
    const subjects= store.getSubjects();
    const j       = jam.find(x=>String(x.id)===String(schedule.lesson_hour_id));
    const kelas   = classes.find(c=>String(c.id)===String(schedule.class_id));
    const mapel   = subjects.find(s=>String(s.id)===String(schedule.subject_id));

    // Load existing session
    const existingSession = store.getSessionForSchedule(schedId, tanggal);
    const existingAttendances = existingSession
      ? store.getAttendancesForSession(existingSession.id)
      : [];

    // Check if there is an existing session from an earlier hour for the same class on this date
    const allSessions = store.getSessions().filter(s => s.tanggal === tanggal);
    const curJamUrutan = j?.urutan || 0;

    const prevSessions = allSessions.map(sess => {
      const sch = schedules.find(s => String(s.id) === String(sess.schedule_id));
      if (!sch || String(sch.class_id) !== String(schedule.class_id)) return null;
      const jamObj = jam.find(x => String(x.id) === String(sch.lesson_hour_id));
      if (!jamObj || (jamObj.urutan || 0) >= curJamUrutan) return null;
      return { session: sess, jamObj, urutan: jamObj.urutan || 0 };
    }).filter(Boolean);

    prevSessions.sort((a, b) => b.urutan - a.urutan);
    const prevSessionInfo = prevSessions[0] ? {
      session: prevSessions[0].session,
      jamName: prevSessions[0].jamObj.nama
    } : null;

    const hasClipboard = !!this._clipboard;
    const clipboardInfo = hasClipboard ? this._clipboard.sourceInfo : '';

    // Build student records
    const students = store.getStudentsByClass(schedule.class_id);
    this._state.students = students.map(stu => {
      const rec = existingAttendances.find(a=>a.student_id===stu.id);
      return {
        student_id: stu.id,
        ids: stu.ids,
        nama_siswa: stu.nama_siswa,
        status: rec?.status || 'H',
        catatan: rec?.catatan || '',
        umpan_balik: rec?.umpan_balik || ''
      };
    });
    this._state.materi = existingSession?.materi || '';
    this._state.catatanJurnal = existingSession?.catatan_jurnal || '';

    const dateLabel = new Date(tanggal+'T00:00:00').toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});

    container.innerHTML = `
      <div class="fade-in stack">

        <!-- Back + Header -->
        <div class="page-header">
          <div class="row" style="gap:0.5rem">
            <button id="btn-back" class="btn btn-ghost btn-sm" style="padding:0.35rem 0.5rem">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
              Kembali
            </button>
          </div>
          <div style="text-align:right">
            <div class="page-title" style="font-size:0.95rem">${mapel?.pelajaran||'Mapel'}</div>
            <div class="page-subtitle">${kelas?.nama_kelas||'Kelas'} • ${j?.nama||''} • ${j?.jam_mulai}–${j?.jam_selesai}</div>
            <div class="page-subtitle">${schedule.hari}, ${dateLabel}</div>
          </div>
        </div>

        <!-- Jurnal Card -->
        <div class="card card-accent">
          <div class="section-title" style="margin-bottom:0.6rem">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
            Jurnal Pembelajaran
          </div>
          <div class="form-group">
            <label for="inp-materi">Materi yang Diajarkan</label>
            <input type="text" id="inp-materi" class="form-control" placeholder="Contoh: Bab Thaharah — Wudhu dan Syaratnya"
              value="${this._escHtml(this._state.materi)}">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label for="inp-jurnal">Catatan / Kejadian Kelas</label>
            <textarea id="inp-jurnal" class="form-control" rows="2"
              placeholder="Contoh: Kelas kondusif, 2 siswa terlambat">${this._escHtml(this._state.catatanJurnal)}</textarea>
          </div>
        </div>

        <!-- Student List Header & Copy-Paste Toolbar -->
        <div class="card" style="padding:0.6rem 0.8rem; margin-bottom:0.2rem">
          <div class="row" style="justify-content:space-between; flex-wrap:wrap; gap:0.5rem">
            <div class="section-title" style="margin-bottom:0">
              Daftar Siswa (<span id="stu-count">${students.length}</span>)
            </div>
            <div class="row" style="gap:0.35rem; flex-wrap:wrap">
              <button id="btn-hadir-semua" class="btn btn-secondary btn-sm" title="Set semua siswa Hadir">
                ✓ Hadir Semua
              </button>
              <button id="btn-salin-presensi" class="btn btn-outline btn-sm" title="Salin data presensi saat ini ke clipboard">
                📋 Salin Absen
              </button>
              <button id="btn-tempel-presensi" class="btn btn-outline btn-sm ${hasClipboard ? '' : 'disabled'}" ${hasClipboard ? '' : 'disabled'}
                title="${hasClipboard ? 'Tempel data presensi yang disalin dari ' + clipboardInfo : 'Belum ada data presensi yang disalin'}">
                📋 Tempel Absen${hasClipboard ? ' (' + clipboardInfo + ')' : ''}
              </button>
              ${prevSessionInfo ? `
                <button id="btn-salin-prev" class="btn btn-outline btn-sm" style="color:var(--primary); border-color:var(--primary)"
                  title="Salin presensi langsung dari ${prevSessionInfo.jamName}">
                  ⚡ Salin dari ${prevSessionInfo.jamName}
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Student Cards -->
        <div class="stack" id="student-list" style="gap:0.4rem">
          ${this._renderStudentCards()}
        </div>

        <!-- Sticky Save Bar -->
        <div class="save-bar" id="save-bar">
          <div class="absen-summary">
            <span class="h">H: <b id="sum-h">0</b></span>
            <span class="i">I: <b id="sum-i">0</b></span>
            <span class="s">S: <b id="sum-s">0</b></span>
            <span class="a">A: <b id="sum-a">0</b></span>
          </div>
          <button id="btn-simpan" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Simpan
          </button>
        </div>

      </div>

      <!-- Note / Feedback Modal -->
      <div class="modal-overlay" id="note-modal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 id="modal-stu-name">Catatan Siswa</h3>
            <button class="btn-modal-close" id="btn-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="modal-catatan">Keterangan / Catatan</label>
              <input type="text" id="modal-catatan" class="form-control" placeholder="Alasan izin, sakit, dll">
            </div>
            <div class="form-group" id="umpan-balik-group" style="margin-bottom:0">
              <label for="modal-umpan">Umpan Balik untuk Siswa</label>
              <textarea id="modal-umpan" class="form-control" rows="3"
                placeholder="Pesan/umpan balik dari guru (untuk siswa yang tidak hadir)"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="btn-modal-cancel">Batal</button>
            <button class="btn btn-primary" id="btn-modal-save">Simpan Catatan</button>
          </div>
        </div>
      </div>
    `;

    this._updateSummary();
    this._attachFormListeners(container, schedule);
  },

  _renderStudentCards() {
    if (this._state.students.length === 0) {
      return `<div class="empty-state"><p>Belum ada data siswa di kelas ini.</p></div>`;
    }
    return this._state.students.map((stu, idx) => `
      <div class="student-card" data-idx="${idx}">
        <div class="student-num">${idx+1}</div>
        <div style="flex:1;min-width:0">
          <div class="student-name">${this._escHtml(stu.nama_siswa)}</div>
          <div class="student-ids">${stu.ids}</div>
        </div>
        <div class="row" style="gap:0.3rem;flex-shrink:0">
          <button class="note-btn ${(stu.catatan||stu.umpan_balik)?'has-note':''}"
            data-idx="${idx}" title="Catatan & umpan balik">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </button>
          <div class="pill-group">
            ${['H','I','S','A'].map(st => `
              <button class="pill-btn ${stu.status===st?'active':''}" data-status="${st}" data-idx="${idx}">${st}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('');
  },

  _attachFormListeners(container, schedule) {
    const classes = store.getClasses();
    const jam = store.getJam();
    const j = jam.find(x => String(x.id) === String(schedule.lesson_hour_id));
    const kelas = classes.find(c => String(c.id) === String(schedule.class_id));

    // Back button
    container.querySelector('#btn-back').addEventListener('click', () => {
      this._state.selectedScheduleId = null;
      this._renderScheduleList(container);
    });

    // Hadir semua
    container.querySelector('#btn-hadir-semua').addEventListener('click', () => {
      this._state.students.forEach(s => s.status = 'H');
      this._refreshStudentList();
      this._updateSummary();
    });

    // Salin Presensi
    const btnSalin = container.querySelector('#btn-salin-presensi');
    if (btnSalin) {
      btnSalin.addEventListener('click', () => {
        const materi = container.querySelector('#inp-materi')?.value.trim() || '';
        const jurnal = container.querySelector('#inp-jurnal')?.value.trim() || '';
        this._clipboard = {
          sourceInfo: `${kelas?.nama_kelas || 'Kelas'} (${j?.nama || 'Jam'})`,
          materi,
          catatanJurnal: jurnal,
          students: this._state.students.map(s => ({
            student_id: s.student_id,
            status: s.status,
            catatan: s.catatan,
            umpan_balik: s.umpan_balik
          }))
        };

        const btnTempel = container.querySelector('#btn-tempel-presensi');
        if (btnTempel) {
          btnTempel.classList.remove('disabled');
          btnTempel.removeAttribute('disabled');
          btnTempel.innerHTML = `📋 Tempel Absen (${this._clipboard.sourceInfo})`;
          btnTempel.title = `Tempel data presensi yang disalin dari ${this._clipboard.sourceInfo}`;
        }

        window._toast && window._toast(`📋 Data presensi ${this._clipboard.sourceInfo} berhasil disalin!`, 'success');
      });
    }

    // Tempel Presensi
    const btnTempel = container.querySelector('#btn-tempel-presensi');
    if (btnTempel) {
      btnTempel.addEventListener('click', () => {
        if (!this._clipboard) {
          window._toast && window._toast('Belum ada data presensi yang disalin!', 'warning');
          return;
        }

        let updatedCount = 0;
        this._state.students.forEach(stu => {
          const match = this._clipboard.students.find(c => String(c.student_id) === String(stu.student_id));
          if (match) {
            stu.status = match.status;
            stu.catatan = match.catatan || '';
            stu.umpan_balik = match.umpan_balik || '';
            updatedCount++;
          }
        });

        const inpMateri = container.querySelector('#inp-materi');
        const inpJurnal = container.querySelector('#inp-jurnal');
        if (inpMateri && !inpMateri.value.trim() && this._clipboard.materi) {
          inpMateri.value = this._clipboard.materi;
          this._state.materi = this._clipboard.materi;
        }
        if (inpJurnal && !inpJurnal.value.trim() && this._clipboard.catatanJurnal) {
          inpJurnal.value = this._clipboard.catatanJurnal;
          this._state.catatanJurnal = this._clipboard.catatanJurnal;
        }

        this._refreshStudentList();
        this._updateSummary();
        window._toast && window._toast(`📋 Data presensi berhasil ditempel dari ${this._clipboard.sourceInfo} (${updatedCount} siswa)`, 'success');
      });
    }

    // Salin dari Jam Sebelumnya (Fitur Pintar)
    const btnSalinPrev = container.querySelector('#btn-salin-prev');
    if (btnSalinPrev) {
      btnSalinPrev.addEventListener('click', () => {
        const tanggal = this._state.tanggal;
        const allSessions = store.getSessions().filter(s => s.tanggal === tanggal);
        const curJamUrutan = j?.urutan || 0;
        const schedules = store.getSchedules();

        const prevSessions = allSessions.map(sess => {
          const sch = schedules.find(s => String(s.id) === String(sess.schedule_id));
          if (!sch || String(sch.class_id) !== String(schedule.class_id)) return null;
          const jamObj = jam.find(x => String(x.id) === String(sch.lesson_hour_id));
          if (!jamObj || (jamObj.urutan || 0) >= curJamUrutan) return null;
          return { session: sess, jamObj, urutan: jamObj.urutan || 0 };
        }).filter(Boolean);

        prevSessions.sort((a, b) => b.urutan - a.urutan);
        const prevSess = prevSessions[0];

        if (!prevSess) {
          window._toast && window._toast('Tidak ditemukan data presensi jam sebelumnya!', 'warning');
          return;
        }

        const prevAttendances = store.getAttendancesForSession(prevSess.session.id);
        let updatedCount = 0;
        this._state.students.forEach(stu => {
          const rec = prevAttendances.find(a => String(a.student_id) === String(stu.student_id));
          if (rec) {
            stu.status = rec.status;
            stu.catatan = rec.catatan || '';
            stu.umpan_balik = rec.umpan_balik || '';
            updatedCount++;
          }
        });

        this._refreshStudentList();
        this._updateSummary();
        window._toast && window._toast(`⚡ Data presensi disalin dari ${prevSess.jamObj.nama} (${updatedCount} siswa)`, 'success');
      });
    }

    // Pill buttons (event delegation)
    const listEl = container.querySelector('#student-list');
    listEl.addEventListener('click', e => {
      const pill = e.target.closest('.pill-btn[data-idx]');
      if (pill) {
        const idx = parseInt(pill.dataset.idx);
        const status = pill.dataset.status;
        this._state.students[idx].status = status;
        // Update pills for this student
        const card = listEl.querySelector(`.student-card[data-idx="${idx}"]`);
        card.querySelectorAll('.pill-btn').forEach(p => {
          p.classList.toggle('active', p.dataset.status === status);
        });
        // Show umpan balik group if not hadir
        this._updateSummary();
      }

      // Note button
      const noteBtn = e.target.closest('.note-btn[data-idx]');
      if (noteBtn) {
        this._openNoteModal(parseInt(noteBtn.dataset.idx));
      }
    });

    // Note Modal
    const modal = container.querySelector('#note-modal');
    let _modalIdx = -1;

    this._openNoteModal = (idx) => {
      _modalIdx = idx;
      const stu = this._state.students[idx];
      container.querySelector('#modal-stu-name').textContent = stu.nama_siswa;
      container.querySelector('#modal-catatan').value = stu.catatan || '';
      container.querySelector('#modal-umpan').value = stu.umpan_balik || '';
      // Show umpan_balik only for non-hadir
      const ubGroup = container.querySelector('#umpan-balik-group');
      ubGroup.style.display = stu.status !== 'H' ? 'flex' : 'none';
      modal.classList.add('active');
    };

    const closeModal = () => modal.classList.remove('active');
    container.querySelector('#btn-modal-close').addEventListener('click', closeModal);
    container.querySelector('#btn-modal-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    container.querySelector('#btn-modal-save').addEventListener('click', () => {
      if (_modalIdx >= 0) {
        this._state.students[_modalIdx].catatan     = container.querySelector('#modal-catatan').value.trim();
        this._state.students[_modalIdx].umpan_balik = container.querySelector('#modal-umpan').value.trim();
        // Update note button indicator
        const stu = this._state.students[_modalIdx];
        const noteBtn = listEl.querySelector(`.note-btn[data-idx="${_modalIdx}"]`);
        if (noteBtn) noteBtn.classList.toggle('has-note', !!(stu.catatan||stu.umpan_balik));
      }
      closeModal();
    });

    // Save attendance
    container.querySelector('#btn-simpan').addEventListener('click', () => {
      const materi = container.querySelector('#inp-materi').value.trim();
      const jurnal = container.querySelector('#inp-jurnal').value.trim();
      this._state.materi = materi;
      this._state.catatanJurnal = jurnal;

      store.saveAttendance(
        schedule.id,
        this._state.tanggal,
        this._user.id,
        schedule.class_id,
        schedule.subject_id,
        schedule.lesson_hour_id,
        materi,
        jurnal,
        this._state.students.map(s => ({
          student_id: s.student_id,
          status:     s.status,
          catatan:    s.catatan,
          umpan_balik:s.umpan_balik
        }))
      );

      window._toast && window._toast('Presensi & jurnal berhasil disimpan! ✓', 'success');
      this._renderScheduleList(container);
    });
  },

  _refreshStudentList() {
    const listEl = document.getElementById('student-list');
    if (listEl) listEl.innerHTML = this._renderStudentCards();
    // Re-attach delegation
    const container = this._container;
    const listElNew = document.getElementById('student-list');
    if (!listElNew) return;
    listElNew.addEventListener('click', e => {
      const pill = e.target.closest('.pill-btn[data-idx]');
      if (pill) {
        const idx = parseInt(pill.dataset.idx);
        this._state.students[idx].status = pill.dataset.status;
        const card = listElNew.querySelector(`.student-card[data-idx="${idx}"]`);
        card.querySelectorAll('.pill-btn').forEach(p => p.classList.toggle('active', p.dataset.status===pill.dataset.status));
        this._updateSummary();
      }
      const noteBtn = e.target.closest('.note-btn[data-idx]');
      if (noteBtn) this._openNoteModal(parseInt(noteBtn.dataset.idx));
    });
  },

  _updateSummary() {
    let H=0,I=0,S=0,A=0;
    this._state.students.forEach(s=>{
      if(s.status==='H')H++;
      else if(s.status==='I')I++;
      else if(s.status==='S')S++;
      else if(s.status==='A')A++;
    });
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('sum-h',H); set('sum-i',I); set('sum-s',S); set('sum-a',A);
  },

  _openNoteModal(idx) {}, // will be overwritten in _attachFormListeners

  _escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
