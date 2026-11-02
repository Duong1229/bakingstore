-- Ngăn một giao dịch SePay bị ghi nhận nhiều lần khi backend khởi động lại.
CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_code_unique
  ON payments (transaction_code)
  WHERE transaction_code IS NOT NULL;
