-- Chạy một lần trên Supabase SQL Editor để lưu địa chỉ mặc định của khách hàng.
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
