-- ==============================================================================
-- DATABASE SCHEMA: WEBSITE BÁN NGUYÊN LIỆU LÀM BÁNH TÍCH HỢP AI & FEFO & SEPAY
-- Hệ quản trị CSDL: PostgreSQL 15+ (Tối ưu cho Supabase)
-- ==============================================================================

-- Bật extension UUID và Tìm kiếm văn bản tiếng Việt / Trigram nếu cần
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------------------------
-- 1. BẢNG NGƯỜI DÙNG & XÁC THỰC (USERS & ROLES)
-- Hỗ trợ đăng nhập Email/Mật khẩu (Bcrypt) và Đăng nhập Google (Google OAuth)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL nếu đăng nhập bằng Google OAuth
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    avatar_url TEXT,
    deleted_email VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
    auth_provider VARCHAR(50) DEFAULT 'local' CHECK (auth_provider IN ('local', 'google')),
    google_id VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. BẢNG VỊ TRÍ LƯU KHO (WAREHOUSE LOCATIONS)
-- Quản lý: Tủ mát, Tủ đông, Kệ khô tầng 1-2, Kệ Set Combo
-- Phân quyền: CHỈ ADMIN ĐƯỢC SỬA / NHÂN VIÊN CHỈ ĐƯỢC XEM ĐỂ NHẶT ĐỒ
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- VD: TM-01-N1 (Tủ mát 1 Ngăn 1), KE-A-T1 (Kệ A Tầng 1)
    name VARCHAR(150) NOT NULL,       -- VD: Tủ mát 01 - Ngăn trên
    zone_type VARCHAR(50) NOT NULL CHECK (zone_type IN ('cold_storage', 'freezer', 'dry_shelf', 'combo_area', 'general')),
    temperature_range VARCHAR(50),    -- VD: "2°C - 8°C" cho tủ mát, "-18°C" cho tủ đông
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. BẢNG DANH MỤC & SẢN PHẨM (CATEGORIES & PRODUCTS)
-- Hỗ trợ: Sản phẩm lẻ, Set / Combo làm bánh, Đánh giá sao, Vị trí kho
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL, -- Vị trí lưu kho
    sku VARCHAR(100) UNIQUE NOT NULL, -- Mã sản phẩm cố định để tìm nhanh hoặc quét QR/Barcode
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Giá bán lẻ niêm yết
    unit VARCHAR(50) NOT NULL DEFAULT 'gói',  -- Đơn vị tính: gói, hộp, chai, combo, kg...
    image_url TEXT,
    is_combo BOOLEAN DEFAULT FALSE,          -- True: Là Set/Combo trọn gói, False: Món lẻ
    is_active BOOLEAN DEFAULT TRUE,
    rating_average NUMERIC(3, 2) DEFAULT 5.00, -- Điểm đánh giá trung bình (1.00 - 5.00)
    rating_count INTEGER DEFAULT 0,            -- Tổng số lượt đánh giá
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Nhật ký giá bán: quản trị viên có thể xem lại mọi lần điều chỉnh giá.
CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price NUMERIC(15, 2) NOT NULL,
    new_price NUMERIC(15, 2) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_price_history_product_changed
    ON product_price_history(product_id, changed_at DESC);

-- Bảng thành phần trong Set Combo (Nếu is_combo = true)
CREATE TABLE IF NOT EXISTS combo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1, -- Số lượng món lẻ trong combo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 4. BẢNG NHÀ CUNG CẤP & NHẬP KHO HÀNG LOẠT (SUPPLIERS & PURCHASE ORDERS)
-- Phục vụ quản lý nhà cung cấp và Nhập kho bằng File Excel
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- VD: NCC-PURATOS, NCC-ANCHOR
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_code VARCHAR(100) UNIQUE NOT NULL, -- Mã phiếu nhập, VD: PO-202609-001
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    import_date DATE DEFAULT CURRENT_DATE,
    import_source VARCHAR(50) DEFAULT 'excel' CHECK (import_source IN ('excel', 'manual')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. BẢNG QUẢN LÝ LÔ HÀNG THEO THUẬT TOÁN FEFO (INVENTORY BATCHES)
-- Quản lý: Lô nhập, Ngày sản xuất, Hạn sử dụng, Số lượng tồn, Giá nhập
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    batch_code VARCHAR(100) NOT NULL, -- Mã lô trên bao bì, VD: LOT-202609-01
    manufacture_date DATE,            -- Ngày sản xuất
    expiry_date DATE NOT NULL,        -- Hạn sử dụng (TIÊU CHÍ SẮP XẾP FEFO)
    original_quantity INTEGER NOT NULL DEFAULT 0,
    current_quantity INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    import_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'depleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index tối ưu hóa truy vấn FEFO (Lọc lô còn hạn và sắp xếp hạn gần nhất trước)
CREATE INDEX IF NOT EXISTS idx_batches_fefo ON inventory_batches (product_id, status, expiry_date ASC);

-- Phiếu xuất kho: ghi nhận số lượng bị tiêu hủy do hết hạn để truy vết kho.
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

-- ------------------------------------------------------------------------------
-- 6. BẢNG MÃ GIẢM GIÁ (VOUCHERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(15, 2) NOT NULL, -- Số % hoặc số tiền cụ thể
    min_order_amount NUMERIC(15, 2) DEFAULT 0,
    max_discount_amount NUMERIC(15, 2),    -- Trần giảm giá nếu là %
    usage_limit INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. BẢNG ĐƠN HÀNG & PHIẾU XUẤT (ORDERS, ITEMS & BATCH ALLOCATIONS)
-- Hỗ trợ: Đơn Online, Bán lẻ POS, Phí vận chuyển, VietQR, SePay
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL, -- Mã đơn hiển thị: BAKE1028 (nội dung chuyển khoản SePay)
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nhân viên bán tại quầy POS
    order_type VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (order_type IN ('online', 'pos')),
    
    -- Thông tin nhận hàng (đơn online)
    recipient_name VARCHAR(150),
    recipient_phone VARCHAR(20),
    shipping_address TEXT,
    shipping_fee NUMERIC(15, 2) DEFAULT 0, -- Phí vận chuyển
    
    -- Tiền thanh toán
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,    -- Tổng tiền hàng
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Tiền voucher giảm
    final_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,    -- final_amount = total_amount - discount + shipping_fee
    
    voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'vietqr' CHECK (payment_method IN ('cash', 'vietqr')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    order_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'picking', 'shipping', 'completed', 'cancelled')),
    
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng phân bổ lô xuất kho FEFO (Truy vết đơn này bốc hàng từ lô nào, hạn sử dụng bao nhiêu)
CREATE TABLE IF NOT EXISTS order_batch_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES inventory_batches(id) ON DELETE RESTRICT,
    allocated_quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 8. BẢNG GHI NHẬN THANH TOÁN SEPAY WEBHOOK & VIETQR
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway VARCHAR(50) NOT NULL DEFAULT 'sepay',
    transaction_code VARCHAR(100),       -- Mã giao dịch ngân hàng do SePay gửi về
    bank_account_number VARCHAR(50),
    amount NUMERIC(15, 2) NOT NULL,
    payment_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSONB,                   -- Lưu nguyên văn JSON Webhook SePay gửi sang để kiểm toán
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 9. BẢNG ĐÁNH GIÁ SẢN PHẨM (REVIEWS & RATINGS)
-- Khách hàng đánh giá 1-5 sao sau khi mua hàng
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Xác nhận đã mua hàng (Verified Buyer)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    media_urls JSONB NOT NULL DEFAULT '[]'::jsonb, -- Ảnh/video khách đính kèm
    revision_count SMALLINT NOT NULL DEFAULT 0 CHECK (revision_count BETWEEN 0 AND 1), -- Lần cập nhật đánh giá đã dùng
    response_comment TEXT, -- Phản hồi công khai của Tiệm Ốc cho đánh giá
    response_by UUID REFERENCES users(id) ON DELETE SET NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 10. TIN NHẮN HỖ TRỢ (KHÁCH HÀNG ↔ QUẢN TRỊ VIÊN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_messages_customer_created ON support_messages(customer_id, created_at);

-- ------------------------------------------------------------------------------
-- 10. BẢNG KIỂM KÊ KHO ĐỊNH KỲ (INVENTORY AUDITS)
-- Dành cho xuất biên bản kiểm kê PDF
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_code VARCHAR(100) UNIQUE NOT NULL, -- VD: AUDIT-202609-01
    auditor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    audit_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_audit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES inventory_batches(id) ON DELETE RESTRICT,
    system_quantity INTEGER NOT NULL, -- Số lượng tồn trên phần mềm
    actual_quantity INTEGER NOT NULL, -- Số lượng đếm thực tế
    diff_quantity INTEGER NOT NULL,   -- Chênh lệch = actual - system
    reason TEXT,                      -- Lý do chênh lệch (Hỏng, cận date bỏ đi, hao hụt...)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- STORED PROCEDURES & TRIGGERS
-- ==============================================================================

-- 1. Trigger tự động tính lại điểm sao trung bình (Rating Average) của sản phẩm khi có Review mới
CREATE OR REPLACE FUNCTION update_product_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET 
        rating_average = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE product_id = NEW.product_id), 5.00),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rating ON reviews;
CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating_stats();

-- 2. Stored Procedure thực thi xuất kho FEFO (First Expired, First Out)
-- Nhận vào: Mã biến thể sản phẩm, Số lượng cần xuất
-- Tự động bốc hàng từ lô có hạn dùng gần nhất còn hạn, trừ số lượng và ghi vết
CREATE OR REPLACE FUNCTION allocate_inventory_fefo(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS TABLE (
    batch_id UUID,
    allocated_qty INTEGER,
    batch_code VARCHAR,
    expiry_date DATE
) AS $$
DECLARE
    v_remaining_to_allocate INTEGER := p_quantity;
    v_batch RECORD;
    v_alloc_from_batch INTEGER;
BEGIN
    -- Kiểm tra tổng tồn kho còn hạn sử dụng có đủ số lượng yêu cầu không
    IF (SELECT COALESCE(SUM(current_quantity), 0) 
        FROM inventory_batches 
        WHERE product_id = p_product_id 
          AND status = 'active' 
          AND expiry_date >= CURRENT_DATE) < p_quantity THEN
        RAISE EXCEPTION 'Không đủ tồn kho khả dụng cho sản phẩm này theo tiêu chuẩn FEFO';
    END IF;

    -- Quét các lô còn hạn theo thứ tự hạn sử dụng gần nhất trước (FEFO)
    FOR v_batch IN 
        SELECT id, inventory_batches.batch_code, inventory_batches.expiry_date, current_quantity
        FROM inventory_batches
        WHERE product_id = p_product_id 
          AND status = 'active' 
          AND expiry_date >= CURRENT_DATE
        ORDER BY expiry_date ASC, created_at ASC
    LOOP
        EXIT WHEN v_remaining_to_allocate <= 0;

        IF v_batch.current_quantity >= v_remaining_to_allocate THEN
            v_alloc_from_batch := v_remaining_to_allocate;
            v_remaining_to_allocate := 0;
            
            -- Cập nhật lô hiện tại
            UPDATE inventory_batches 
            SET current_quantity = current_quantity - v_alloc_from_batch,
                status = CASE WHEN current_quantity - v_alloc_from_batch = 0 THEN 'depleted' ELSE 'active' END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_batch.id;
        ELSE
            v_alloc_from_batch := v_batch.current_quantity;
            v_remaining_to_allocate := v_remaining_to_allocate - v_alloc_from_batch;
            
            -- Lô này hết sạch hàng
            UPDATE inventory_batches 
            SET current_quantity = 0,
                status = 'depleted',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_batch.id;
        END IF;

        -- Trả về dòng phân bổ
        batch_id := v_batch.id;
        allocated_qty := v_alloc_from_batch;
        batch_code := v_batch.batch_code;
        expiry_date := v_batch.expiry_date;
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;
