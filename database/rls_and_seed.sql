-- database/rls_and_seed.sql
-- Row Level Security + Seed Data untuk Supabase
-- Jalankan SETELAH schema.sql

-- =========================================
-- AKTIFKAN RLS
-- =========================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_hours        ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances         ENABLE ROW LEVEL SECURITY;

-- =========================================
-- HELPER FUNCTION
-- =========================================
-- (Tidak digunakan lagi karena kita mengizinkan akses anonim sementara)

-- =========================================
-- POLICIES: SEMUA TABEL DIBUKA UNTUK ANONIM
-- =========================================
-- Catatan: Karena aplikasi tidak menggunakan login Supabase Auth,
-- kita mengizinkan akses 'anon' agar aplikasi bisa membaca/menyimpan data.

CREATE POLICY "Anon: allow all on users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon: allow all on classes" ON classes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon: allow all on students" ON students FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon: allow all on subjects" ON subjects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon: allow all on lesson_hours" ON lesson_hours FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon: allow all on schedules" ON schedules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon: allow all on attendance_sessions" ON attendance_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon: allow all on attendances" ON attendances FOR ALL TO anon USING (true) WITH CHECK (true);

-- =========================================
-- SEED DATA
-- =========================================

-- Users
INSERT INTO users (id, kode, nama, password_hash, role) VALUES
  ('usr-admin-1',     'admin', 'Administrator MTs PIQ',        'admin123', 'admin'),
  ('usr-guru-G001',   'G001',  'Ustadz Ahmad Fauzi, S.Th.I.',  'guru123',  'guru'),
  ('usr-guru-G002',   'G002',  'Ustadzah Siti Maryam, S.Pd.', 'guru123',  'guru'),
  ('usr-guru-G003',   'G003',  'Ustadz Husein Ali, M.Ag.',    'guru123',  'guru'),
  ('usr-guru-G004',   'G004',  'Ustadz Sholehuddin, S.Pd.I.', 'guru123',  'guru')
ON CONFLICT (id) DO NOTHING;

-- Classes
INSERT INTO classes (id, kode, nama_kelas) VALUES
  (1, '7A', 'VII A'),
  (2, '7B', 'VII B'),
  (3, '8A', 'VIII A'),
  (4, '8B', 'VIII B'),
  (5, '9A', 'IX A')
ON CONFLICT (id) DO NOTHING;

-- Subjects
INSERT INTO subjects (id, idm, pelajaran) VALUES
  (1, 'QUR', 'Al-Quran Hadist'),
  (2, 'FIQ', 'Fiqih'),
  (3, 'AQI', 'Akidah Akhlak'),
  (4, 'ARB', 'Bahasa Arab'),
  (5, 'MTK', 'Matematika'),
  (6, 'IND', 'Bahasa Indonesia'),
  (7, 'ING', 'Bahasa Inggris'),
  (8, 'IPA', 'IPA')
ON CONFLICT (id) DO NOTHING;

-- Lesson Hours
INSERT INTO lesson_hours (id, nama, jam_mulai, jam_selesai, urutan) VALUES
  (1, 'Jam ke-1',   '07:00', '07:40', 1),
  (2, 'Jam ke-2',   '07:40', '08:20', 2),
  (3, 'Jam ke-3',   '08:20', '09:00', 3),
  (4, 'Istirahat',  '09:00', '09:20', 4),
  (5, 'Jam ke-4',   '09:20', '10:00', 5),
  (6, 'Jam ke-5',   '10:00', '10:40', 6),
  (7, 'Jam ke-6',   '10:40', '11:20', 7),
  (8, 'Jam ke-7',   '11:20', '12:00', 8)
ON CONFLICT (id) DO NOTHING;

-- Schedules (sample)
INSERT INTO schedules (class_id, subject_id, teacher_id, hari, lesson_hour_id) VALUES
  (1, 1, 'usr-guru-G001', 'Senin',  1),
  (1, 2, 'usr-guru-G002', 'Senin',  2),
  (2, 3, 'usr-guru-G003', 'Senin',  1),
  (2, 4, 'usr-guru-G004', 'Senin',  2),
  (3, 5, 'usr-guru-G001', 'Senin',  5),
  (1, 5, 'usr-guru-G003', 'Selasa', 1),
  (1, 6, 'usr-guru-G002', 'Selasa', 2),
  (3, 1, 'usr-guru-G001', 'Selasa', 3),
  (2, 5, 'usr-guru-G003', 'Rabu',   1),
  (4, 7, 'usr-guru-G002', 'Rabu',   5),
  (1, 3, 'usr-guru-G003', 'Kamis',  2),
  (3, 8, 'usr-guru-G004', 'Kamis',  6),
  (5, 1, 'usr-guru-G001', 'Jumat',  1),
  (5, 2, 'usr-guru-G002', 'Jumat',  2);

-- Students (sample)
INSERT INTO students (ids, nama_siswa, class_id, status) VALUES
  ('2324001', 'Muhammad Al-Fatih',       1, 'aktif'),
  ('2324002', 'Abdurrahman Wahid',        1, 'aktif'),
  ('2324003', 'Fatimah Az-Zahra',         1, 'aktif'),
  ('2324004', 'Ali bin Abi Thalib',       1, 'aktif'),
  ('2324005', 'Aisyah Humaira',           1, 'aktif'),
  ('2324006', 'Yusuf Al-Makassari',       2, 'aktif'),
  ('2324007', 'Khadijah Binti Khuwailid', 2, 'aktif'),
  ('2324008', 'Ibrahim bin Adham',        2, 'aktif'),
  ('2223001', 'Salahuddin Al-Ayyubi',     3, 'aktif'),
  ('2223002', 'Rabiah Al-Adawiyah',       3, 'aktif'),
  ('2223003', 'Umar bin Khattab',         4, 'aktif'),
  ('2223004', 'Bilal bin Rabah',          4, 'aktif');
