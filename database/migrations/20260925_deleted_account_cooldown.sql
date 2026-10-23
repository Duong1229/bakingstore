-- Giữ email đã xóa trong 30 ngày để chặn việc đăng ký lại ngay lập tức.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_users_deleted_email_at ON users (deleted_email, deleted_at DESC);
