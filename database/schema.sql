-- database/schema.sql
-- Schema Database Presensi MTs PIQ
-- Jalankan di Supabase SQL Editor

-- Hapus tabel lama jika ada
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS lesson_hours CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Tabel USERS (Admin & Guru)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,      -- 'usr-admin-1', 'usr-guru-G001'
  kode          TEXT UNIQUE NOT NULL,  -- IDG: 'G001', atau 'admin'
  nama          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'guru')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel CLASSES (Kelas)
CREATE TABLE IF NOT EXISTS classes (
  id         BIGSERIAL PRIMARY KEY,
  kode       TEXT,                  -- IDK, opsional
  nama_kelas TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel STUDENTS (Siswa)
CREATE TABLE IF NOT EXISTS students (
  id         BIGSERIAL PRIMARY KEY,
  ids        TEXT,                  -- IDS (NIS/NISN atau ID lokal)
  nama_siswa TEXT NOT NULL,
  class_id   BIGINT REFERENCES classes(id) ON DELETE SET NULL,
  status     TEXT DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);

-- 4. Tabel SUBJECTS (Mata Pelajaran)
CREATE TABLE IF NOT EXISTS subjects (
  id         BIGSERIAL PRIMARY KEY,
  idm        TEXT,                  -- IDM
  pelajaran  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel LESSON_HOURS (Jam Pelajaran)
CREATE TABLE IF NOT EXISTS lesson_hours (
  id         BIGSERIAL PRIMARY KEY,
  nama       TEXT NOT NULL,         -- 'Jam Ke-1'
  jam_mulai  TIME NOT NULL,
  jam_selesai TIME NOT NULL,
  urutan     INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel SCHEDULES (Jadwal Pelajaran)
CREATE TABLE IF NOT EXISTS schedules (
  id               BIGSERIAL PRIMARY KEY,
  class_id         BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  subject_id       BIGINT REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  hari             TEXT NOT NULL CHECK (hari IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')),
  lesson_hour_id   BIGINT REFERENCES lesson_hours(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_hari    ON schedules(hari);
CREATE INDEX IF NOT EXISTS idx_schedules_class   ON schedules(class_id);

-- 7. Tabel ATTENDANCE_SESSIONS (Sesi Absensi)
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id             BIGSERIAL PRIMARY KEY,
  tanggal        DATE NOT NULL,
  schedule_id    BIGINT REFERENCES schedules(id) ON DELETE SET NULL,
  teacher_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  class_id       BIGINT REFERENCES classes(id) ON DELETE SET NULL,
  subject_id     BIGINT REFERENCES subjects(id) ON DELETE SET NULL,
  lesson_hour_id BIGINT REFERENCES lesson_hours(id) ON DELETE SET NULL,
  materi         TEXT DEFAULT '',
  catatan_jurnal TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tanggal, schedule_id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_tanggal ON attendance_sessions(tanggal);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON attendance_sessions(teacher_id);

-- 8. Tabel ATTENDANCES (Detail Absensi)
CREATE TABLE IF NOT EXISTS attendances (
  id           BIGSERIAL PRIMARY KEY,
  session_id   BIGINT REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id   BIGINT REFERENCES students(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('H','I','S','A')),
  catatan      TEXT DEFAULT '',
  umpan_balik  TEXT DEFAULT '',   -- feedback untuk siswa yang tidak hadir
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendances_session ON attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON attendances(student_id);
