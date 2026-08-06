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
    let selYear  = now.getFullYear();
    let selMonth = now.getMonth() + 1; // 1-indexed

    const render = () => {
      const classes  = store.getClasses();
      const students = store.getStudentsByClass(selClass);
      const sessions = store.getSessions();
      const allAtt   = store.getAttendances();

      // Filter sessions for this class + month
      const prefix = `${selYear}-${String(selMonth).padStart(2,'0')}`;
      const mySessions = sessions.filter(s => s.class_id === parseInt(selClass) && s.tanggal.startsWith(prefix));

      // Unique dates (sorted)
      const dates = [...new Set(mySessions.map(s=>s.tanggal))].sort();

      // Build matrix: student × date × [H/I/S/A]
      // For each date, a student may have multiple sessions (different lessons)
      // We show per-session or per-day summary — here: per SESSION (detailed)
      // For simplicity: per date, all sessions combined → dominant status
      const matrix = students.map(stu => {
        const byDate = {};
        dates.forEach(date => {
          const daySessions = mySessions.filter(s=>s.tanggal===date);
          const recs = [];
          daySessions.forEach(sess => {
            const rec = allAtt.find(a=>a.session_id===sess.id&&a.student_id===stu.id);
            if (rec) recs.push(rec.status);
          });
          // Dominant: A > S > I > H
          let status = recs.length > 0
            ? (recs.includes('A') ? 'A' : recs.includes('S') ? 'S' : recs.includes('I') ? 'I' : 'H')
            : '-';
          byDate[date] = status;
        });
        let H=0,I=0,S=0,A=0;
        Object.values(byDate).forEach(v=>{if(v==='H')H++;else if(v==='I')I++;else if(v==='S')S++;else if(v==='A')A++;});
        return { stu, byDate, H, I, S, A };
      });

      content.innerHTML = `
        <div class="stack">
          <!-- Filters -->
          <div class="card" style="padding:0.75rem">
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:flex-end">
              <div class="form-group" style="margin:0;flex:1;min-width:120px">
                <label>Kelas</label>
                <select id="sel-class" class="form-control" style="font-size:0.82rem">
                  ${classes.map(c=>`<option value="${c.id}" ${c.id===selClass?'selected':''}>${c.nama_kelas}</option>`).join('')}
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
              <div style="display:flex;gap:0.4rem">
                <button class="btn btn-secondary btn-sm" id="btn-exp-csv">⬇ CSV</button>
                <button class="btn btn-primary btn-sm" id="btn-exp-print">🖨 Cetak</button>
              </div>
            </div>
          </div>

          <!-- Matrix Table -->
          ${students.length === 0
            ? `<div class="empty-state"><p>Tidak ada siswa aktif di kelas ini.</p></div>`
            : dates.length === 0
            ? `<div class="empty-state"><p>Belum ada data absensi untuk ${MONTHS[selMonth-1]} ${selYear}.</p></div>`
            : `<div class="table-wrap" id="rekap-table-wrap">
              <table id="rekap-table">
                <thead>
                  <tr>
                    <th style="min-width:28px">#</th>
                    <th style="min-width:140px">Nama Siswa</th>
                    ${dates.map(d=>{
                      const day = new Date(d+'T00:00:00').getDate();
                      return `<th style="min-width:28px;text-align:center">${day}</th>`;
                    }).join('')}
                    <th style="text-align:center;color:var(--hadir)">H</th>
                    <th style="text-align:center;color:var(--izin)">I</th>
                    <th style="text-align:center;color:var(--sakit)">S</th>
                    <th style="text-align:center;color:var(--alpa)">A</th>
                  </tr>
                </thead>
                <tbody>
                  ${matrix.map((row,idx)=>`
                    <tr class="student-row">
                      <td>${idx+1}</td>
                      <td style="white-space:nowrap;font-weight:600">${this._escHtml(row.stu.nama_siswa)}</td>
                      ${dates.map(d=>{
                        const v=row.byDate[d];
                        return `<td style="text-align:center" class="sts-${v==='H'?'H':v==='I'?'I':v==='S'?'S':v==='A'?'A':''}">${v||'–'}</td>`;
                      }).join('')}
                      <td style="text-align:center;font-weight:700;color:var(--hadir)">${row.H}</td>
                      <td style="text-align:center;font-weight:700;color:var(--izin)">${row.I}</td>
                      <td style="text-align:center;font-weight:700;color:var(--sakit)">${row.S}</td>
                      <td style="text-align:center;font-weight:700;color:var(--alpa)">${row.A}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`
          }
        </div>
      `;

      // Filter events
      content.querySelector('#sel-class').addEventListener('change', e => { selClass=parseInt(e.target.value); render(); });
      content.querySelector('#sel-month').addEventListener('change', e => { selMonth=parseInt(e.target.value); render(); });
      content.querySelector('#sel-year').addEventListener('change', e => { selYear=parseInt(e.target.value); render(); });

      // Export CSV
      content.querySelector('#btn-exp-csv')?.addEventListener('click', () => {
        const className = classes.find(c=>c.id===parseInt(selClass))?.nama_kelas||'';
        let csv = `Rekap Kehadiran ${className} - ${MONTHS[selMonth-1]} ${selYear}\n`;
        csv += `No,Nama Siswa,${dates.map(d=>new Date(d+'T00:00:00').getDate()).join(',')},H,I,S,A\n`;
        matrix.forEach((row,idx) => {
          csv += `${idx+1},${row.stu.nama_siswa},${dates.map(d=>row.byDate[d]||'-').join(',')},${row.H},${row.I},${row.S},${row.A}\n`;
        });
        const blob = new Blob([csv], {type:'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `rekap_${className}_${selYear}_${selMonth}.csv`;
        a.click();
      });

      // Print
      content.querySelector('#btn-exp-print')?.addEventListener('click', () => {
        const className = classes.find(c=>c.id===parseInt(selClass))?.nama_kelas||'';
        const tableEl = document.getElementById('rekap-table');
        if (!tableEl) { alert('Tidak ada data untuk dicetak.'); return; }
        const win = window.open('', '_blank');
        win.document.write(`
          <!DOCTYPE html><html lang="id"><head>
          <meta charset="UTF-8"><title>Rekap Kehadiran ${className}</title>
          <style>
            body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:1.5cm}
            h2,h3{text-align:center;margin-bottom:4px}
            table{width:100%;border-collapse:collapse;margin-top:12px}
            th,td{border:1px solid #ccc;padding:3px 5px;font-size:10px}
            th{background:#e8f5ed;text-align:center}
          </style></head><body>
          <h2>MTs PIQ Singosari</h2>
          <h3>Rekap Kehadiran Siswa — ${className} — ${MONTHS[selMonth-1]} ${selYear}</h3>
          ${tableEl.outerHTML}
          <p style="margin-top:20px;text-align:right">Singosari, ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
          <p style="text-align:right;margin-top:40px"><br>Wali Kelas<br><br><br>_______________</p>
          </body></html>`);
        win.document.close();
        win.print();
      });
    };

    render();
  },

  // ==================================
  // LAPORAN GURU
  // ==================================
  _renderLaporanGuru(content) {
    const today = store.todayISO();
    let selDate = today;

    const render = () => {
      const HARI_LABEL = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const hari = HARI_LABEL[new Date(selDate + 'T00:00:00').getDay()];

      const teacherStatus = store.getTeacherStatusToday(selDate);
      const jam           = store.getJam();
      const classes       = store.getClasses();
      const subjects      = store.getSubjects();

      // ── Collect all class IDs that appear in any teacher's schedule today ──
      const classIds = [...new Set(
        teacherStatus.flatMap(t => t.schedules.map(s => String(s.class_id)))
      )];
      // Sort by class order
      const gridClasses = classes.filter(c => classIds.includes(String(c.id)));

      // ── Summary counts ──
      const doneCount    = teacherStatus.filter(t => t.done === t.total).length;
      const notDoneCount = teacherStatus.length - doneCount;

      content.innerHTML = `
        <div class="stack">

          <!-- Date filter -->
          <div class="card" style="padding:0.75rem">
            <div class="row" style="gap:0.75rem;align-items:flex-end">
              <div class="form-group" style="margin:0">
                <label>Tanggal</label>
                <input type="date" id="sel-date" class="form-control" value="${selDate}" style="font-size:0.82rem">
              </div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--primary)">${hari}</div>
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
                Laporan <b>${hari}</b> — ${teacherStatus.length} guru mengajar
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
            <!-- Progress bar -->
            <div style="margin-top:0.5rem;height:6px;background:#e5e7eb;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${teacherStatus.length > 0 ? Math.round(doneCount/teacherStatus.length*100) : 0}%;background:#16a34a;border-radius:4px;transition:width 0.4s"></div>
            </div>
          </div>

          <!-- Grid Table: Guru × Kelas -->
          <div style="overflow-x:auto">
            <table style="border-collapse:collapse;width:100%;min-width:max-content;font-size:0.78rem">
              <thead>
                <tr style="background:#f0faf4">
                  <th style="border:1px solid #d1e8dc;padding:0.5rem 0.75rem;text-align:left;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap;min-width:160px">
                    Guru
                  </th>
                  <th style="border:1px solid #d1e8dc;padding:0.5rem 0.75rem;text-align:left;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap">
                    Jam
                  </th>
                  <th style="border:1px solid #d1e8dc;padding:0.5rem 0.75rem;text-align:left;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap">
                    Mapel
                  </th>
                  ${gridClasses.map(cls => `
                    <th style="border:1px solid #d1e8dc;padding:0.5rem 0.6rem;text-align:center;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap;min-width:80px">
                      ${this._escHtml(cls.nama_kelas)}
                    </th>
                  `).join('')}
                  <th style="border:1px solid #d1e8dc;padding:0.5rem 0.6rem;text-align:center;font-size:0.72rem;font-weight:700;color:#1a7a4a;white-space:nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                ${teacherStatus.map(t => {
                  // Each teacher may have multiple schedules (different jam/class)
                  // Group by lesson_hour_id for rows
                  const sortedScheds = [...t.schedules].sort((a, b) => {
                    const ja = jam.find(j => j.id === a.lesson_hour_id);
                    const jb = jam.find(j => j.id === b.lesson_hour_id);
                    return (ja?.urutan || 0) - (jb?.urutan || 0);
                  });

                  const allDone   = t.done === t.total;
                  const rowBg     = allDone ? '#f0fdf4' : '#fff7f7';
                  const borderClr = allDone ? '#86efac' : '#fca5a5';

                  return sortedScheds.map((sch, schIdx) => {
                    const j       = jam.find(x => x.id === sch.lesson_hour_id);
                    const mapel   = subjects.find(s => s.id === sch.subject_id);
                    const isDone  = sch.done;
                    const cellBg  = isDone ? '#dcfce7' : '#fee2e2';
                    const cellClr = isDone ? '#15803d' : '#b91c1c';
                    const cellBdr = isDone ? '#86efac' : '#fca5a5';

                    // Teacher name only shown on first row
                    const teacherCell = schIdx === 0 ? `
                      <td rowspan="${sortedScheds.length}"
                        style="border:1px solid ${borderClr};padding:0.5rem 0.65rem;background:${rowBg};vertical-align:middle">
                        <div style="font-weight:700;font-size:0.82rem;color:#1a2b23">${this._escHtml(t.teacher.nama)}</div>
                        <div style="font-size:0.68rem;color:#4a6358;margin-top:1px">${t.teacher.kode}</div>
                      </td>
                    ` : '';

                    // Build class cells
                    const classCells = gridClasses.map(cls => {
                      // Does this teacher schedule match this class?
                      if (sch.class_id === cls.id) {
                        return `
                          <td style="border:1px solid ${cellBdr};padding:0.4rem 0.5rem;text-align:center;background:${cellBg};font-weight:700;font-size:0.85rem;color:${cellClr}">
                            ${isDone ? '✓' : '✗'}
                          </td>`;
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
                          <td rowspan="${sortedScheds.length}"
                            style="border:1px solid ${borderClr};padding:0.4rem 0.6rem;text-align:center;background:${rowBg};vertical-align:middle">
                            <div style="font-size:0.78rem;font-weight:700;color:${allDone ? '#15803d' : '#b91c1c'}">
                              ${allDone ? '✓ Selesai' : `${t.done}/${t.total} jam`}
                            </div>
                            <div style="font-size:0.65rem;color:${allDone ? '#16a34a' : '#dc2626'};margin-top:0.1rem">
                              ${allDone ? 'Lengkap' : 'Belum selesai'}
                            </div>
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

      content.querySelector('#sel-date')?.addEventListener('change', e => {
        selDate = e.target.value;
        render();
      });
    };

    render();
  },



  _escHtml(s) {
    if(!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};
