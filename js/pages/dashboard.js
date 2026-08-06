/* js/pages/dashboard.js */
import { store } from '../store.js';

const HARI = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

export const DashboardPage = {
  render(container) {
    const user = store.getCurrentUser();
    if (user.role === 'admin') {
      this.renderAdmin(container);
    } else {
      this.renderGuru(container, user);
    }
  },

  // ====================
  // ADMIN DASHBOARD
  // ====================
  renderAdmin(container) {
    const today = store.todayISO();
    const todayHari = HARI[new Date().getDay()];
    const stats = store.getDailyStats(today);
    const teacherStatus = store.getTeacherStatusToday(today);
    const classes = store.getClasses();
    const students = store.getStudents();

    // Guru laporan status
    const guruDone    = teacherStatus.filter(t => t.done === t.total && t.total > 0);
    const guruPending = teacherStatus.filter(t => t.done < t.total);

    container.innerHTML = `
      <div class="fade-in stack">

        <!-- Page Header -->
        <div class="page-header">
          <div>
            <div class="page-title">Dashboard Admin</div>
            <div class="page-subtitle">Hari ini: ${todayHari}, ${this._formatDate(today)}</div>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="card">
          <div class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 9l-6-6-4 4-4-4"/></svg>
            Kehadiran Hari Ini
          </div>
          <div class="stat-grid">
            <div class="stat-box hadir">
              <div class="stat-num">${stats.H}</div>
              <div class="stat-lbl">Hadir</div>
            </div>
            <div class="stat-box izin">
              <div class="stat-num">${stats.I}</div>
              <div class="stat-lbl">Izin</div>
            </div>
            <div class="stat-box sakit">
              <div class="stat-num">${stats.S}</div>
              <div class="stat-lbl">Sakit</div>
            </div>
            <div class="stat-box alpa">
              <div class="stat-num">${stats.A}</div>
              <div class="stat-lbl">Alpa</div>
            </div>
          </div>
          <div style="margin-top:0.75rem;font-size:0.75rem;color:var(--text-muted)">
            Total tercatat: <strong>${stats.total}</strong> absensi •
            ${classes.length} kelas • ${students.filter(s=>s.status==='aktif').length} siswa aktif
          </div>
        </div>

        <!-- Guru Report Status -->
        <div class="card">
          <div class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Status Laporan Guru — Hari ini (${todayHari})
          </div>

          ${teacherStatus.length === 0 ? `
            <div class="empty-state">
              <p>Tidak ada jadwal mengajar hari ini atau belum ada data jadwal.</p>
            </div>
          ` : `
            <div class="stack" style="gap:0.4rem">
              ${teacherStatus.map(t => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0.6rem;background:var(--bg);border-radius:var(--radius-sm);gap:0.5rem">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:0.82rem;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.teacher.nama}</div>
                    <div style="font-size:0.68rem;color:var(--text-muted)">${t.teacher.kode} • ${t.done}/${t.total} jam diisi</div>
                  </div>
                  <span class="badge ${t.done === t.total ? 'badge-done' : 'badge-pending'}">
                    ${t.done === t.total ? '✓ Selesai' : `${t.done}/${t.total}`}
                  </span>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Quick Links -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem">
          <a href="#data" class="card" style="text-decoration:none;text-align:center;padding:1rem;cursor:pointer;transition:box-shadow 0.15s">
            <div style="font-size:1.5rem;margin-bottom:0.3rem">🗂️</div>
            <div style="font-size:0.8rem;font-weight:700;color:var(--primary)">Data Master</div>
            <div style="font-size:0.68rem;color:var(--text-muted)">Kelola siswa, guru, jadwal</div>
          </a>
          <a href="#laporan" class="card" style="text-decoration:none;text-align:center;padding:1rem;cursor:pointer;transition:box-shadow 0.15s">
            <div style="font-size:1.5rem;margin-bottom:0.3rem">📊</div>
            <div style="font-size:0.8rem;font-weight:700;color:var(--primary)">Laporan Rekap</div>
            <div style="font-size:0.68rem;color:var(--text-muted)">Kehadiran harian & bulanan</div>
          </a>
        </div>

      </div>
    `;
  },

  // ====================
  // GURU DASHBOARD
  // ====================
  renderGuru(container, user) {
    const today = store.todayISO();
    const todayIdx = new Date().getDay();
    const todayHari = HARI[todayIdx];
    const allDays = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

    // State for selected day chip
    let selectedDay = allDays.includes(todayHari) ? todayHari : 'Senin';

    const render = () => {
      const mySchedules = store.getSchedulesByTeacher(user.id)
        .filter(s => s.hari === selectedDay);
      const jam = store.getJam();
      const classes = store.getClasses();
      const subjects = store.getSubjects();
      const sessions = store.getSessions().filter(s => s.tanggal === today);

      // Sort by lesson_hour urutan
      mySchedules.sort((a,b) => {
        const ja = jam.find(j=>String(j.id)===String(a.lesson_hour_id));
        const jb = jam.find(j=>String(j.id)===String(b.lesson_hour_id));
        return (ja?.urutan||0) - (jb?.urutan||0);
      });

      container.innerHTML = `
        <div class="fade-in stack">

          <div class="page-header">
            <div>
              <div class="page-title">Assalamu'alaikum 👋</div>
              <div class="page-subtitle">${user.nama.split(' ').slice(0,2).join(' ')} • ${todayHari}, ${this._formatDate(today)}</div>
            </div>
            <a href="#presensi" class="btn btn-primary btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              Isi Absen
            </a>
          </div>

          <!-- Day Chips -->
          <div>
            <div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);margin-bottom:0.4rem">Lihat jadwal hari:</div>
            <div class="chip-group" id="day-chips">
              ${allDays.map(d => `<button class="chip ${d===selectedDay?'active':''}" data-day="${d}">${d}</button>`).join('')}
            </div>
          </div>

          <!-- Jadwal List -->
          <div>
            <div class="section-title" style="margin-bottom:0.5rem">
              Jadwal Mengajar — ${selectedDay}
              <span style="font-size:0.72rem;font-weight:400;color:var(--text-muted)">(${mySchedules.length} jam)</span>
            </div>
            <div class="stack" id="jadwal-list">
              ${mySchedules.length === 0 ? `
                <div class="empty-state">
                  <p>Tidak ada jadwal mengajar hari ${selectedDay}.</p>
                </div>
              ` : mySchedules.map(sch => {
                const j = jam.find(x => String(x.id) === String(sch.lesson_hour_id));
                const kelas = classes.find(c => String(c.id) === String(sch.class_id));
                const mapel = subjects.find(s => String(s.id) === String(sch.subject_id));
                // Check if today's session already done
                const isDone = selectedDay === todayHari &&
                  sessions.some(sess => String(sess.schedule_id) === String(sch.id));

                return `
                  <a href="#presensi?sch=${sch.id}" class="jadwal-card ${isDone?'done':''}"
                     onclick="event.preventDefault();window._openPresensi&&window._openPresensi(${sch.id})">
                    <div class="jc-time">
                      <div>${j?.jam_mulai||'--:--'}</div>
                      <div style="font-size:0.6rem;opacity:0.7">${j?.jam_selesai||''}</div>
                    </div>
                    <div class="jc-body">
                      <div class="jc-mapel">${mapel?.pelajaran || 'Mapel'}</div>
                      <div class="jc-kelas">${kelas?.nama_kelas || 'Kelas'} • ${j?.nama||''}</div>
                      ${isDone ? `<div class="jc-status" style="color:var(--hadir)">✓ Sudah diisi</div>` :
                        (selectedDay === todayHari ? `<div class="jc-status" style="color:var(--izin)">⏳ Belum diisi</div>` : '')}
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--text-muted);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
                  </a>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      `;

      // Day chip events
      container.querySelectorAll('#day-chips .chip').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedDay = btn.dataset.day;
          render();
        });
      });

      // Open presensi with schedule pre-selected
      // Sets global flag picked up by PresensiPage.render()
      window._openPresensi = (schedId) => {
        window.__pendingScheduleId = schedId;
        window.location.hash = '#presensi';
      };
    };

    render();
  },

  _formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  }
};

// No circular import needed — _openPresensi uses global flag
