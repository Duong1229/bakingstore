-- Đánh giá lần hai thay thế hoàn toàn nội dung lần một.
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS revision_count SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_revision_count_check;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_revision_count_check
  CHECK (revision_count BETWEEN 0 AND 1);

-- Các bản ghi cũ từng được tạo thành nhiều dòng cho cùng một lần mua.
-- Giữ lại bản ghi mới nhất để khách chỉ còn thấy đánh giá sau cùng.
WITH ranked_reviews AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, product_id
      ORDER BY created_at DESC, id DESC
    ) AS row_number
  FROM reviews
  WHERE order_id IS NOT NULL
)
DELETE FROM reviews
WHERE id IN (
  SELECT id FROM ranked_reviews WHERE row_number > 1
);

-- Đồng bộ lại điểm trung bình và số lượt đánh giá sau khi loại lịch sử cũ.
UPDATE products
SET rating_average = 0, rating_count = 0;

UPDATE products AS product
SET
  rating_average = stats.rating_average,
  rating_count = stats.rating_count
FROM (
  SELECT product_id,
    ROUND(AVG(rating)::numeric, 2) AS rating_average,
    COUNT(*)::integer AS rating_count
  FROM reviews
  WHERE is_approved = true
  GROUP BY product_id
) AS stats
WHERE product.id = stats.product_id;
