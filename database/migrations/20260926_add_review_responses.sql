-- Chạy một lần trên cơ sở dữ liệu đang dùng trước khi bật phần phản hồi đánh giá.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response_comment TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;
