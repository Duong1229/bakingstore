-- Mỗi dòng đánh giá là một lần gửi. Khách được phép gửi tối đa hai lần cho
-- cùng một sản phẩm trong cùng một đơn; API sẽ thực thi giới hạn này.
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_reviews_order_user_product_created
  ON reviews (order_id, user_id, product_id, created_at ASC);

-- Bucket công khai dùng riêng cho ảnh/video đánh giá. Việc upload được thực
-- hiện qua backend với service-role; chỉ URL công khai được lưu trong reviews.
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-media', 'review-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;
