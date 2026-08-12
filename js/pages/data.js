/* js/pages/data.js */
/* Data Master: Siswa, Guru, Kelas, Mata Pelajaran, Jam Pelajaran, Jadwal */
import { store } from '../store.js';

const TABS = [
  { id:'siswa',  label:'Siswa' },
  { id:'guru',   label:'Guru' },
  { id:'kelas',  label:'Kelas' },
  { id:'mapel',  label:'Mata Pelajaran' },
  { id:'jam',    label:'Jam Pelajaran' },
  { id:'jadwal', label:'Jadwal Pelajaran' },
];

const HARI_LIST = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

export const DataPage = {
  _activeTab: 'siswa',
  _selectedIds: [],
  _container: null,

  render(container) {
    const user = store.getCurrentUser();
    if (user.role !== 'admin') {
      container.innerHTML = `<div class="card" style="text-align:center;padding:3rem">
        <p style="color:var(--alpa);font-weight:700">Akses Terbatas</p>
        <p style="color:var(--text-muted);font-size:0.82rem;margin-top:0.5rem">
          Halaman ini hanya untuk Admin.
        </p></div>`;
      return;
    }
    this._container = container;
    this._selectedIds = [];
    this._renderLayout();
  },

  _renderLayout() {
    const c = this._container;
    c.innerHTML = `
      <div class="fade-in stack">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-title">Data Master</div>
        </div>

        <!-- Tab Bar -->
        <div class="tab-bar" id="data-tabs">
          ${TABS.map(t => `
            <button class="tab-btn ${t.id===this._activeTab?'active':''}" data-tab="${t.id}">${t.label}</button>
          `).join('')}
        </div>

        <!-- Bulk Action Bar -->
        <div class="bulk-bar" id="bulk-bar" style="display:none">
          <span><b id="sel-count">0</b> item dipilih</span>
          <button class="btn btn-warning btn-sm" id="btn-bulk-edit" style="display:none">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" id="btn-bulk-del">🗑 Hapus Terpilih</button>
        </div>

        <!-- Tab Content -->
        <div id="tab-content"></div>
      </div>

      <!-- Bulk Input Modal -->
      <div class="modal-overlay" id="bulk-modal">
        <div class="modal-box" style="max-width:680px;width:96vw">
          <div class="modal-header">
            <h3 id="bulk-modal-title">Tambah Data</h3>
            <button class="btn-modal-close" id="bulk-modal-close">&times;</button>
          </div>
          <div class="modal-body" style="overflow-x:auto">
            <div style="margin-bottom:0.75rem;padding:0.6rem 0.75rem;background:var(--primary-tint);border-radius:var(--radius-sm);font-size:0.75rem;color:var(--text-sub)">
              <b style="color:var(--primary)">Upload File:</b> Unduh template, isi, lalu upload.
              <div class="row" style="margin-top:0.4rem;gap:0.4rem">
                <button class="btn btn-secondary btn-sm" id="btn-dl-template">⬇ Template Excel</button>
                <input type="file" id="bulk-file-input" accept=".xlsx,.xls,.csv" style="font-size:0.75rem;flex:1">
              </div>
            </div>
            <p style="font-size:0.73rem;color:var(--text-muted);margin-bottom:0.4rem">
              Atau isi langsung di tabel di bawah:
            </p>
            <div style="overflow-x:auto">
              <table class="bulk-table" style="width:100%">
                <thead id="bulk-thead"></thead>
                <tbody id="bulk-tbody"></tbody>
              </table>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-add-row" style="margin-top:0.5rem">+ Tambah Baris</button>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="bulk-modal-cancel">Batal</button>
            <button class="btn btn-primary" id="btn-bulk-save">Simpan Data</button>
          </div>
        </div>
      </div>
    `;

    // Tab switching
    c.querySelector('#data-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn[data-tab]');
      if (!btn) return;
      this._activeTab = btn.dataset.tab;
      this._selectedIds = [];
      c.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===this._activeTab));
      c.querySelector('#bulk-bar').style.display = 'none';
      this._loadTab();
    });

    // Bulk action listeners
    c.querySelector('#btn-bulk-del').addEventListener('click', () => this._bulkDelete());
    c.querySelector('#btn-bulk-edit').addEventListener('click', () => this._editSelected());

    // Bulk modal close
    const closeBulkModal = () => c.querySelector('#bulk-modal').classList.remove('active');
    c.querySelector('#bulk-modal-close').addEventListener('click', closeBulkModal);
    c.querySelector('#bulk-modal-cancel').addEventListener('click', closeBulkModal);
    c.querySelector('#bulk-modal').addEventListener('click', e => {
      if (e.target === c.querySelector('#bulk-modal')) closeBulkModal();
    });

    this._loadTab();
  },

  _loadTab() {
    const content = this._container.querySelector('#tab-content');
    const tab = this._activeTab;

    if (tab === 'jadwal') {
      this._renderJadwal(content);
    } else {
      this._renderTableTab(content, tab);
    }
  },

  // ==================================
  // GENERIC TABLE TAB
  // ==================================
  _renderTableTab(content, tab) {
    const { cols, rows, addLabel } = this._getTabConfig(tab);

    content.innerHTML = `
      <div class="stack">
        <div class="row" style="justify-content:flex-end">
          <button class="btn btn-primary btn-sm" id="btn-add-bulk">
            + Tambah ${addLabel}
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="table-check"><input type="checkbox" id="chk-all"></th>
                ${cols.map(c=>`<th>${c.label}</th>`).join('')}
                ${tab === 'jam' ? `<th style="width:70px;text-align:center">Aksi</th>` : ''}
              </tr>
            </thead>
            <tbody id="tbl-body">
              ${rows.length === 0
                ? `<tr><td colspan="${cols.length+(tab==='jam'?2:1)}" style="text-align:center;color:var(--text-muted);padding:2rem">Belum ada data</td></tr>`
                : rows.map(row => `
                  <tr>
                    <td><input type="checkbox" class="row-chk" data-id="${row.__id}"></td>
                    ${cols.map(c => `<td>${this._escHtml(String(row[c.key]||''))}</td>`).join('')}
                    ${tab === 'jam' ? `<td style="text-align:center"><button class="btn btn-ghost btn-sm btn-edit-row" data-id="${row.__id}" title="Edit Jam Pelajaran" style="padding:0.2rem 0.5rem">✏️ Edit</button></td>` : ''}
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Select all
    content.querySelector('#chk-all')?.addEventListener('change', e => {
      const checked = e.target.checked;
      content.querySelectorAll('.row-chk').forEach(chk => {
        chk.checked = checked;
        const id = parseInt(chk.dataset.id) || chk.dataset.id;
        if (checked && !this._selectedIds.includes(id)) this._selectedIds.push(id);
        else if (!checked) this._selectedIds = [];
      });
      this._updateBulkBar();
    });

    // Individual checkbox & row edit button
    content.querySelector('#tbl-body')?.addEventListener('click', e => {
      const editBtn = e.target.closest('.btn-edit-row');
      if (editBtn) {
        const id = parseInt(editBtn.dataset.id) || editBtn.dataset.id;
        this._editSelected(id);
        return;
      }
    });

    content.querySelector('#tbl-body')?.addEventListener('change', e => {
      if (!e.target.classList.contains('row-chk')) return;
      const id = parseInt(e.target.dataset.id) || e.target.dataset.id;
      if (e.target.checked) {
        if (!this._selectedIds.includes(id)) this._selectedIds.push(id);
      } else {
        this._selectedIds = this._selectedIds.filter(x => x !== id);
      }
      this._updateBulkBar();
    });

    // Open bulk add modal
    content.querySelector('#btn-add-bulk')?.addEventListener('click', () => {
      this._openBulkModal(tab);
    });
  },

  _getTabConfig(tab) {
    switch(tab) {
      case 'siswa': {
        const classes = store.getClasses();
        const rows = store.getStudents().map(s => ({
          __id: s.id,
          ids: s.ids || '',
          nama_siswa: s.nama_siswa,
          kelas: classes.find(c=>c.id===s.class_id)?.nama_kelas || '-',
          status: s.status
        }));
        return {
          cols: [
            { key:'ids', label:'IDS/NIS' },
            { key:'nama_siswa', label:'Nama Siswa' },
            { key:'kelas', label:'Kelas' },
            { key:'status', label:'Status' },
          ],
          rows,
          addLabel: 'Siswa'
        };
      }
      case 'guru': {
        const rows = store.getTeachers().map(t => ({
          __id: t.id,
          kode: t.kode,
          nama: t.nama
        }));
        return {
          cols: [
            { key:'kode', label:'IDG / Kode' },
            { key:'nama', label:'Nama Guru' },
          ],
          rows,
          addLabel: 'Guru'
        };
      }
      case 'kelas': {
        const rows = store.getClasses().map(c => ({
          __id: c.id,
          kode: c.kode || '',
          nama_kelas: c.nama_kelas
        }));
        return {
          cols: [
            { key:'kode', label:'IDK / Kode' },
            { key:'nama_kelas', label:'Nama Kelas' },
          ],
          rows,
          addLabel: 'Kelas'
        };
      }
      case 'mapel': {
        const rows = store.getSubjects().map(s => ({
          __id: s.id,
          idm: s.idm || '',
          pelajaran: s.pelajaran
        }));
        return {
          cols: [
            { key:'idm', label:'IDM' },
            { key:'pelajaran', label:'Mata Pelajaran' },
          ],
          rows,
          addLabel: 'Mata Pelajaran'
        };
      }
      case 'jam': {
        const rows = store.getJam().map(j => ({
          __id: j.id,
          urutan: j.urutan,
          nama: j.nama,
          jam_mulai: j.jam_mulai,
          jam_selesai: j.jam_selesai
        }));
        return {
          cols: [
            { key:'urutan',     label:'Urutan' },
            { key:'nama',       label:'Nama' },
            { key:'jam_mulai',  label:'Mulai' },
            { key:'jam_selesai',label:'Selesai' },
          ],
          rows,
          addLabel: 'Jam Pelajaran'
        };
      }
      default: return { cols:[], rows:[], addLabel:'' };
    }
  },

  _editSelected(directId = null) {
    const id = directId || (this._selectedIds.length === 1 ? this._selectedIds[0] : null);
    if (!id || this._activeTab !== 'jam') return;
    const dataObj = store.getJam().find(j => j.id === id);
    if (!dataObj) return;

    let editModal = this._container.querySelector('#edit-jam-modal');
    if (!editModal) {
      editModal = document.createElement('div');
      editModal.id = 'edit-jam-modal';
      editModal.className = 'modal-overlay';
      editModal.innerHTML = `
        <div class="modal-box" style="max-width:400px;width:96vw">
          <div class="modal-header">
            <h3>Edit Jam Pelajaran</h3>
            <button class="btn-modal-close" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
          </div>
          <div class="modal-body stack" style="gap:1rem">
            <div>
              <label style="font-size:0.75rem;font-weight:600">Nama</label>
              <input type="text" id="edit-jam-nama" class="input" style="width:100%">
            </div>
            <div class="row" style="gap:0.5rem">
              <div style="flex:1">
                <label style="font-size:0.75rem;font-weight:600">Mulai</label>
                <input type="time" id="edit-jam-mulai" class="input" style="width:100%">
              </div>
              <div style="flex:1">
                <label style="font-size:0.75rem;font-weight:600">Selesai</label>
                <input type="time" id="edit-jam-selesai" class="input" style="width:100%">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').classList.remove('active')">Batal</button>
            <button class="btn btn-primary" id="btn-save-edit-jam">Simpan</button>
          </div>
        </div>
      `;
      this._container.appendChild(editModal);
    }

    this._container.querySelector('#edit-jam-nama').value = dataObj.nama;
    this._container.querySelector('#edit-jam-mulai').value = dataObj.jam_mulai;
    this._container.querySelector('#edit-jam-selesai').value = dataObj.jam_selesai;
    
    const saveBtn = this._container.querySelector('#btn-save-edit-jam');
    saveBtn.onclick = () => {
      const nama = this._container.querySelector('#edit-jam-nama').value.trim();
      const jam_mulai = this._container.querySelector('#edit-jam-mulai').value;
      const jam_selesai = this._container.querySelector('#edit-jam-selesai').value;
      
      if (!nama || !jam_mulai || !jam_selesai) {
        window._toast && window._toast('Harap isi semua kolom', 'error');
        return;
      }
      
      const success = store.updateJam(id, { nama, jam_mulai, jam_selesai });
      if (success) {
        window._toast && window._toast('Jam Pelajaran berhasil diperbarui', 'success');
        editModal.classList.remove('active');
        this._selectedIds = [];
        this._loadTab();
        this._updateBulkBar();
      } else {
        window._toast && window._toast('Gagal memperbarui', 'error');
      }
    };
    
    editModal.classList.add('active');
  },

  _bulkDelete() {
    if (this._selectedIds.length === 0) return;
    if (!confirm(`Hapus ${this._selectedIds.length} data terpilih?`)) return;

    const ids = [...this._selectedIds];
    switch(this._activeTab) {
      case 'siswa':  store.deleteBulkStudents(ids);  break;
      case 'guru':   store.deleteBulkTeachers(ids);  break;
      case 'kelas':  store.deleteBulkClasses(ids);   break;
      case 'mapel':  store.deleteBulkSubjects(ids);  break;
      case 'jam':    store.deleteBulkJam(ids);       break;
      case 'jadwal': store.deleteBulkSchedules(ids); break;
    }
    this._selectedIds = [];
    window._toast && window._toast('Data berhasil dihapus', 'success');
    this._loadTab();
    this._container.querySelector('#bulk-bar').style.display = 'none';
  },

  _updateBulkBar() {
    const bar = this._container.querySelector('#bulk-bar');
    const sel = this._container.querySelector('#sel-count');
    const btnEdit = this._container.querySelector('#btn-bulk-edit');
    if (!bar) return;
    bar.style.display = this._selectedIds.length > 0 ? 'flex' : 'none';
    if (sel) sel.textContent = this._selectedIds.length;
    if (btnEdit) {
      // Only show Edit button if exactly 1 item is selected and we're on the 'jam' tab
      btnEdit.style.display = (this._selectedIds.length === 1 && this._activeTab === 'jam') ? 'inline-flex' : 'none';
    }
  },

  // ==================================
  // BULK INPUT MODAL
  // ==================================
  _openBulkModal(tab) {
    const modal = this._container.querySelector('#bulk-modal');
    const title = this._container.querySelector('#bulk-modal-title');
    const thead = this._container.querySelector('#bulk-thead');
    const tbody = this._container.querySelector('#bulk-tbody');

    const config = this._getBulkModalConfig(tab);
    title.textContent = `Tambah ${config.label}`;

    // Table headers
    thead.innerHTML = `<tr>${config.cols.map(c=>`<th>${c.label}</th>`).join('')}<th style="width:36px"></th></tr>`;

    // Add initial row
    const addRow = (data={}) => {
      const tr = document.createElement('tr');
      tr.innerHTML = config.cols.map(c => {
        if (c.type === 'select') {
          const opts = `<option value="" disabled ${!data[c.key]?'selected':''}>-- Pilih --</option>` + c.options().map(o => `<option value="${o.value}" ${data[c.key]==o.value?'selected':''}>${o.label}</option>`).join('');
          return `<td><select data-key="${c.key}">${opts}</select></td>`;
        }
        return `<td><input type="${c.inputType||'text'}" data-key="${c.key}" value="${this._escHtml(data[c.key]||'')}" placeholder="${c.placeholder||''}"></td>`;
      }).join('') + `<td><button class="btn btn-ghost btn-sm" style="padding:0.2rem;color:var(--alpa)" onclick="this.closest('tr').remove()">✕</button></td>`;
      tbody.appendChild(tr);
    };

    tbody.innerHTML = '';
    addRow();

    this._container.querySelector('#btn-add-row').onclick = () => addRow();
    this._container.querySelector('#btn-dl-template').onclick = () => this._downloadTemplate(config);
    this._container.querySelector('#bulk-file-input').onchange = e => this._handleFileUpload(e, config, addRow, tbody);

    // Save handler
    const saveBtn = this._container.querySelector('#btn-bulk-save');
    saveBtn.onclick = () => {
      const rows = [];
      tbody.querySelectorAll('tr').forEach(tr => {
        const row = {};
        tr.querySelectorAll('[data-key]').forEach(inp => {
          row[inp.dataset.key] = inp.value.trim();
        });
        if (Object.values(row).some(v => v)) rows.push(row);
      });
      if (rows.length === 0) { alert('Tidak ada data untuk disimpan.'); return; }
      this._saveBulk(tab, rows);
      modal.classList.remove('active');
      window._toast && window._toast(`${rows.length} data berhasil ditambahkan`, 'success');
      this._loadTab();
    };

    modal.classList.add('active');
  },

  _getBulkModalConfig(tab) {
    switch(tab) {
      case 'siswa': return {
        label: 'Siswa',
        cols: [
          { key:'ids',       label:'IDS/NIS',  placeholder:'2324001' },
          { key:'nama_siswa',label:'Nama Siswa',placeholder:'Muhammad Ali' },
          { key:'class_id',  label:'Kelas', type:'select',
            options: () => store.getClasses().map(c => ({ value:c.id, label:c.nama_kelas })) }
        ]
      };
      case 'guru': return {
        label: 'Guru',
        cols: [
          { key:'kode', label:'IDG (G001,G002...)', placeholder:'G005' },
          { key:'nama', label:'Nama Guru', placeholder:'Ustadz Ahmad...' }
        ]
      };
      case 'kelas': return {
        label: 'Kelas',
        cols: [
          { key:'kode',      label:'IDK / Kode', placeholder:'7C' },
          { key:'nama_kelas',label:'Nama Kelas', placeholder:'VII C' }
        ]
      };
      case 'mapel': return {
        label: 'Mata Pelajaran',
        cols: [
          { key:'idm',      label:'IDM', placeholder:'MTK' },
          { key:'pelajaran',label:'Mata Pelajaran', placeholder:'Matematika' }
        ]
      };
      case 'jam': return {
        label: 'Jam Pelajaran',
        cols: [
          { key:'urutan',     label:'Urutan', inputType:'number', placeholder:'1' },
          { key:'nama',       label:'Nama', placeholder:'Jam ke-1' },
          { key:'jam_mulai',  label:'Mulai', inputType:'time' },
          { key:'jam_selesai',label:'Selesai', inputType:'time' }
        ]
      };
      default: return { label:'', cols:[] };
    }
  },

  _saveBulk(tab, rows) {
    switch(tab) {
      case 'siswa':  store.saveBulkStudents(rows);  break;
      case 'guru':   store.saveBulkTeachers(rows);  break;
      case 'kelas':  store.saveBulkClasses(rows);   break;
      case 'mapel':  store.saveBulkSubjects(rows);  break;
      case 'jam':    store.saveBulkJam(rows);       break;
      case 'jadwal': store.saveBulkSchedules(rows); break;
    }
  },

  _downloadTemplate(config) {
    const header = config.cols.map(c => c.label).join(',');
    const csv = header + '\n' + config.cols.map(c => c.placeholder||'').join(',');
    const blob = new Blob([csv], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `template_${config.label.toLowerCase().replace(/\s/g,'_')}.csv`;
    a.click();
  },

  _handleFileUpload(e, config, addRow, tbody) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      // Parse CSV (simple) - support comma or semicolon delimiter
      const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (rawLines.length < 2) { alert('File kosong atau format tidak sesuai.'); return; }
      // Auto-detect delimiter
      const delim = rawLines[0].includes(';') ? ';' : ',';
      const headers = rawLines[0].split(delim).map(h => h.trim().toLowerCase().replace(/[\s\uFEFF]/g,'_').replace(/^"|"$/g,''));
      tbody.innerHTML = '';
      rawLines.slice(1).forEach(line => {
        const vals = line.split(delim).map(v => v.trim().replace(/^"|"$/g,''));
        const row = {};
        headers.forEach((h,i) => { row[h] = vals[i] || ''; });
        // Map to config keys (by position)
        const mapped = {};
        config.cols.forEach((c,i) => { 
          let val = vals[i] || row[c.key] || '';
          if (c.type === 'select' && val) {
            // Find option where label matches the CSV text (case-insensitive)
            const opts = c.options();
            const match = opts.find(o => String(o.label).toLowerCase() === String(val).toLowerCase());
            if (match) val = match.value;
            else val = ''; // Clear value if no match, forces user to select manually
          }
          mapped[c.key] = val; 
        });
        addRow(mapped);
      });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  },

  // Khusus untuk upload jadwal — gunakan nama kolom yang lebih fleksibel
  _handleJadwalFileUpload(e, config, addRow, tbody) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result.replace(/\uFEFF/g, ''); // strip BOM
      const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (rawLines.length < 2) { alert('File kosong atau format tidak sesuai.'); return; }

      // Auto-detect delimiter
      const delim = rawLines[0].includes(';') ? ';' : ',';
      const csvHeaders = rawLines[0].split(delim).map(h => h.trim().toLowerCase().replace(/[\s\uFEFF]/g,'_').replace(/^"|"$/g,''));

      // Key aliases: maps CSV column names -> config key
      const KEY_ALIASES = {
        'hari':           'hari',
        'kelas':          'class_id',
        'nama_kelas':     'class_id',
        'class_id':       'class_id',
        'mata_pelajaran': 'subject_id',
        'pelajaran':      'subject_id',
        'mapel':          'subject_id',
        'subject_id':     'subject_id',
        'guru':           'teacher_id',
        'nama_guru':      'teacher_id',
        'teacher_id':     'teacher_id',
        'jam':            'lesson_hour_id',
        'nama_jam':       'lesson_hour_id',
        'lesson_hour_id': 'lesson_hour_id',
      };

      tbody.innerHTML = '';
      rawLines.slice(1).forEach(line => {
        const vals = line.split(delim).map(v => v.trim().replace(/^"|"$/g,''));
        if (vals.every(v => !v)) return; // skip empty lines

        // Build a row object keyed by config key
        const rowByHeader = {};
        csvHeaders.forEach((h, i) => {
          const configKey = KEY_ALIASES[h] || h;
          rowByHeader[configKey] = vals[i] || '';
        });
        // Also map by position as fallback (col 0=hari, 1=class_id, 2=subject_id, 3=teacher_id, 4=lesson_hour_id)
        const configKeys = ['hari', 'class_id', 'subject_id', 'teacher_id', 'lesson_hour_id'];
        const mapped = {};
        configKeys.forEach((key, i) => {
          let val = rowByHeader[key] || vals[i] || '';
          // Try to resolve text labels to IDs via config options
          const col = config.cols.find(c => c.key === key);
          if (col && col.type === 'select' && val) {
            const opts = col.options();
            // Try exact match first
            let match = opts.find(o => String(o.value) === String(val));
            if (!match) {
              // Try label match (case-insensitive, partial ok for guru)
              match = opts.find(o => String(o.label).toLowerCase() === String(val).toLowerCase());
            }
            if (!match && key === 'teacher_id') {
              // For teacher: try matching just the kode part (e.g. 'G001' in 'G001 - Nama Guru')
              match = opts.find(o => {
                const parts = String(o.label).split(' - ');
                return parts[0].trim().toLowerCase() === String(val).toLowerCase();
              });
            }
            if (!match && key !== 'hari') {
              // Partial match as last resort
              match = opts.find(o => String(o.label).toLowerCase().includes(String(val).toLowerCase()));
            }
            if (match) {
              val = match.value;
            } else {
              val = ''; // Clear value if no match, forces user to select manually
            }
          }
          mapped[key] = val;
        });
        addRow(mapped);
      });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  },

  // ==================================
  // JADWAL PELAJARAN (GRID VIEW)
  // ==================================
  _renderJadwal(content) {
    let selectedHari = 'Senin';

    const render = () => {
      const schedules = store.getSchedulesByDay(selectedHari);
      const jam       = store.getJam();
      const classes   = store.getClasses();
      const subjects  = store.getSubjects();
      const teachers  = store.getTeachers();

      // Build grid: jam × kelas
      // For each jam, for each kelas, find schedule entry
      const gridJam = jam.filter(j => !j.nama.includes('Istirahat'));

      // Collect classes that appear in this day's schedule
      const classIds = [...new Set(schedules.map(s=>String(s.class_id)))];
      const gridClasses = classes.filter(c => classIds.includes(String(c.id)));

      content.innerHTML = `
        <div class="fade-in stack">
          <!-- Action row -->
          <div class="row" style="justify-content:space-between">
            <div class="chip-group" id="hari-chips">
              ${HARI_LIST.map(h => `<button class="chip ${h===selectedHari?'active':''}" data-hari="${h}">${h}</button>`).join('')}
            </div>
            <button class="btn btn-primary btn-sm" id="btn-add-jadwal">+ Tambah Jadwal</button>
          </div>

          <!-- Delete selected -->
          <div class="bulk-bar" id="jadwal-bulk-bar" style="display:none">
            <span><b id="jadwal-sel-count">0</b> jadwal dipilih</span>
            <button class="btn btn-danger btn-sm" id="btn-del-jadwal">🗑 Hapus</button>
          </div>

          <!-- Grid Table -->
          <div class="schedule-grid-wrap">
            ${gridClasses.length === 0 ? `<div class="empty-state"><p>Belum ada jadwal hari ${selectedHari}. Klik "+ Tambah Jadwal" untuk menambahkan.</p></div>` : `
              <table class="schedule-grid">
                <thead>
                  <tr>
                    <th class="jam-col">Jam</th>
                    ${gridClasses.map(c => `<th>${c.nama_kelas}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${gridJam.map(j => {
                    const cells = gridClasses.map(cls => {
                      const sch = schedules.find(s => String(s.lesson_hour_id)===String(j.id) && String(s.class_id)===String(cls.id));
                      if (!sch) return `<td class="schedule-cell empty">—</td>`;
                      const mapel   = subjects.find(s=>String(s.id)===String(sch.subject_id));
                      const teacher = teachers.find(t=>String(t.id)===String(sch.teacher_id));
                      return `
                        <td>
                          <div class="schedule-cell">
                            <label style="display:flex;align-items:flex-start;gap:0.3rem;cursor:pointer">
                              <input type="checkbox" class="jadwal-chk" data-id="${sch.id}" style="margin-top:2px">
                              <div>
                                <div class="sc-mapel">${mapel?.pelajaran||'—'}</div>
                                <div class="sc-guru">${teacher?.nama.split(' ').slice(0,2).join(' ')||'—'}</div>
                              </div>
                            </label>
                          </div>
                        </td>`;
                    }).join('');
                    return `
                      <tr>
                        <td class="jam-col" style="font-size:0.72rem;font-weight:700;color:var(--primary);white-space:nowrap">
                          ${j.nama}<br><span style="font-weight:400;color:var(--text-muted)">${j.jam_mulai}–${j.jam_selesai}</span>
                        </td>
                        ${cells}
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;

      // Day chips
      content.querySelectorAll('.chip[data-hari]').forEach(btn => {
        btn.addEventListener('click', () => { selectedHari = btn.dataset.hari; render(); });
      });

      // Jadwal checkbox selection
      let selJadwal = [];
      content.querySelectorAll('.jadwal-chk').forEach(chk => {
        chk.addEventListener('change', () => {
          const id = parseInt(chk.dataset.id);
          if (chk.checked && !selJadwal.includes(id)) selJadwal.push(id);
          else selJadwal = selJadwal.filter(x=>x!==id);
          const bar = content.querySelector('#jadwal-bulk-bar');
          const cnt = content.querySelector('#jadwal-sel-count');
          if (bar) bar.style.display = selJadwal.length > 0 ? 'flex' : 'none';
          if (cnt) cnt.textContent = selJadwal.length;
        });
      });

      content.querySelector('#btn-del-jadwal')?.addEventListener('click', () => {
        if (!confirm(`Hapus ${selJadwal.length} jadwal?`)) return;
        store.deleteBulkSchedules([...selJadwal]);
        selJadwal = [];
        window._toast && window._toast('Jadwal berhasil dihapus', 'success');
        render();
      });

      // Add jadwal button
      content.querySelector('#btn-add-jadwal').addEventListener('click', () => {
        this._openJadwalModal(selectedHari, render);
      });
    };

    render();
  },

  _openJadwalModal(selectedHari, onSave) {
    const modal = this._container.querySelector('#bulk-modal');
    const title = this._container.querySelector('#bulk-modal-title');
    const thead = this._container.querySelector('#bulk-thead');
    const tbody = this._container.querySelector('#bulk-tbody');

    const classes  = store.getClasses();
    const subjects = store.getSubjects();
    const teachers = store.getTeachers();
    const jam      = store.getJam();

    title.textContent = 'Tambah Jadwal Pelajaran';

    const classOpts   = (selected) => `<option value="" disabled ${!selected?'selected':''}>-- Pilih Kelas --</option>` + classes.map(c=>`<option value="${c.id}" ${selected==c.id?'selected':''}>${c.nama_kelas}</option>`).join('');
    const subjectOpts = (selected) => `<option value="" disabled ${!selected?'selected':''}>-- Pilih Mapel --</option>` + subjects.map(s=>`<option value="${s.id}" ${selected==s.id?'selected':''}>${s.pelajaran}</option>`).join('');
    const teacherOpts = (selected) => `<option value="" disabled ${!selected?'selected':''}>-- Pilih Guru --</option>` + teachers.map(t=>`<option value="${t.id}" ${selected==t.id?'selected':''}>${t.kode} - ${t.nama}</option>`).join('');
    const hariOpts    = (selected) => `<option value="" disabled ${!selected?'selected':''}>-- Pilih Hari --</option>` + HARI_LIST.map(h=>`<option value="${h}" ${h===(selected||selectedHari)?'selected':''}>${h}</option>`).join('');
    const jamOpts     = (selected) => `<option value="" disabled ${!selected?'selected':''}>-- Pilih Jam --</option>` + jam.map(j=>`<option value="${j.id}" ${selected==j.id?'selected':''}>${j.nama} (${j.jam_mulai}–${j.jam_selesai})</option>`).join('');

    thead.innerHTML = `<tr><th>Hari</th><th>Kelas</th><th>Mata Pelajaran</th><th>Guru</th><th>Jam</th><th></th></tr>`;

    const addRow = (data = {}) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><select data-key="hari">${hariOpts(data.hari)}</select></td>
        <td><select data-key="class_id">${classOpts(data.class_id)}</select></td>
        <td><select data-key="subject_id">${subjectOpts(data.subject_id)}</select></td>
        <td><select data-key="teacher_id">${teacherOpts(data.teacher_id)}</select></td>
        <td><select data-key="lesson_hour_id">${jamOpts(data.lesson_hour_id)}</select></td>
        <td><button class="btn btn-ghost btn-sm" style="color:var(--alpa)" onclick="this.closest('tr').remove()">✕</button></td>
      `;
      tbody.appendChild(tr);
    };

    tbody.innerHTML = '';
    addRow();
    this._container.querySelector('#btn-add-row').onclick = () => addRow();

    const config = {
      cols: [
        { key: 'hari', type: 'select', options: () => HARI_LIST.map(h => ({ value: h, label: h })) },
        { key: 'class_id', type: 'select', options: () => classes.map(c => ({ value: c.id, label: c.nama_kelas })) },
        { key: 'subject_id', type: 'select', options: () => subjects.map(s => ({ value: s.id, label: s.pelajaran })) },
        { key: 'teacher_id', type: 'select', options: () => teachers.map(t => ({ value: t.id, label: t.kode + ' - ' + t.nama })) },
        { key: 'lesson_hour_id', type: 'select', options: () => jam.map(j => ({ value: j.id, label: j.nama })) }
      ]
    };

    this._container.querySelector('#btn-dl-template').onclick = () => {
      const hariEx  = 'Rabu';
      const kelasEx = classes[0]?.nama_kelas || 'VII A';
      const mapelEx = subjects[0]?.pelajaran || 'Al-Quran Hadist';
      const guruEx  = teachers[0] ? (teachers[0].kode + ' - ' + teachers[0].nama) : 'G001 - Nama Guru';
      const jamEx   = jam.find(j => !j.nama.includes('Istirahat'))?.nama || 'Jam ke-1';

      // Build header with human-readable column names
      const header = 'hari,kelas,mata_pelajaran,guru,jam';
      const bom = '\uFEFF'; // UTF-8 BOM agar Excel buka dengan benar
      const csv = bom + header + '\n' + `${hariEx},${kelasEx},${mapelEx},${guruEx},${jamEx}`;
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='template_jadwal.csv'; a.click();
    };

    this._container.querySelector('#bulk-file-input').onchange = e => this._handleJadwalFileUpload(e, config, addRow, tbody);

    const saveBtn = this._container.querySelector('#btn-bulk-save');
    saveBtn.onclick = () => {
      const rows = [];
      tbody.querySelectorAll('tr').forEach(tr => {
        const row = {};
        tr.querySelectorAll('[data-key]').forEach(inp => { row[inp.dataset.key] = inp.value.trim(); });
        if (row.class_id && row.subject_id && row.teacher_id) rows.push(row);
      });
      if (!rows.length) { alert('Isi minimal 1 baris jadwal.'); return; }
      const result = store.saveBulkSchedules(rows);
      modal.classList.remove('active');
      if (result && result.skipped > 0) {
        window._toast && window._toast(`⚠ ${result.saved} jadwal disimpan, ${result.skipped} baris dilewati karena data tidak valid. Periksa console untuk detail.`, 'warning');
      } else {
        window._toast && window._toast(`${result?.saved ?? rows.length} jadwal berhasil ditambahkan`, 'success');
      }
      onSave();
    };

    modal.classList.add('active');
  },

  _escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
