-- Phiếu xuất kho phục vụ tiêu hủy lô hàng hết hạn.
CREATE TABLE IF NOT EXISTS inventory_disposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disposal_code VARCHAR(50) UNIQUE NOT NULL,
  batch_id UUID NOT NULL REFERENCES inventory_batches(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason VARCHAR(100) NOT NULL DEFAULT 'Tiêu hủy hàng hết hạn',
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_disposals_batch_created ON inventory_disposals(batch_id, created_at DESC);
