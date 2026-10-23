-- ==============================================================================
-- SEED DATA: DỮ LIỆU MẪU ĐỒ ÁN NGUYÊN LIỆU LÀM BÁNH
-- ==============================================================================

-- 1. Tài khoản mẫu:
-- Mật khẩu mặc định: 123456
INSERT INTO users (id, email, password_hash, full_name, phone, role, auth_provider) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@bakingstore.vn', '$2a$10$f/NoJ5lU4D1b78wTJUlG.OHQxoCw84..9r1eIM18KaP.KNpmHPLBC', 'Nguyễn Quản Trị', '0901234567', 'admin', 'local'),
('00000000-0000-0000-0000-000000000002', 'staff@bakingstore.vn', '$2a$10$f/NoJ5lU4D1b78wTJUlG.OHQxoCw84..9r1eIM18KaP.KNpmHPLBC', 'Trần Thu Ngân POS', '0912345678', 'staff', 'local'),
('00000000-0000-0000-0000-000000000003', 'khachhang@gmail.com', '$2a$10$f/NoJ5lU4D1b78wTJUlG.OHQxoCw84..9r1eIM18KaP.KNpmHPLBC', 'Lê Khách Hàng', '0987654321', 'customer', 'local')
ON CONFLICT (email) DO NOTHING;

-- 2. Danh mục sản phẩm
INSERT INTO categories (id, name, slug, description) VALUES
('10000000-0000-0000-0000-000000000001', 'Bột & Men Làm Bánh', 'bot-men-lam-banh', 'Các loại bột mì số 8, 11, bột bắp, men nở bánh mì'),
('10000000-0000-0000-0000-000000000002', 'Bơ, Sữa & Phô Mai', 'bo-sua-pho-mai', 'Bơ lạt, Whipping cream, Cream cheese, Mascarpone bảo quản lạnh'),
('10000000-0000-0000-0000-000000000003', 'Hương Liệu & Màu Thực Phẩm', 'huong-lieu-mau', 'Tinh chất vani, bột cacao, matcha, màu làm bánh an toàn'),
('10000000-0000-0000-0000-000000000004', 'Dụng Cụ & Khuôn Khay', 'dung-cu-khuon-khay', 'Khuôn bánh, phới lồng, túi bắt kem, giấy nến nướng bánh'),
('10000000-0000-0000-0000-000000000005', 'Set / Combo Làm Bánh', 'set-combo-lam-banh', 'Các set nguyên liệu trọn gói theo công thức định lượng sẵn'),
('10000000-0000-0000-0000-000000000006', 'Bánh quy & Cookie', 'banh-quy-cookie', 'Nguyên liệu và set làm bánh quy, cookie'),
('10000000-0000-0000-0000-000000000007', 'Quà bánh 20/10', 'qua-banh-20-10', 'Gợi ý quà bánh cho Ngày Phụ nữ Việt Nam')
ON CONFLICT (slug) DO NOTHING;

-- 3. Vị trí lưu kho (Tủ mát, Tủ đông, Kệ khô)
INSERT INTO warehouse_locations (id, code, name, zone_type, temperature_range, description) VALUES
('20000000-0000-0000-0000-000000000001', 'TM-01-N1', 'Tủ Mát 01 - Ngăn 1', 'cold_storage', '2°C - 6°C', 'Chuyên để Bơ lạt và Whipping Cream'),
('20000000-0000-0000-0000-000000000002', 'TM-01-N2', 'Tủ Mát 01 - Ngăn 2', 'cold_storage', '2°C - 6°C', 'Chuyên để Phô mai Mascarpone và Cream Cheese'),
('20000000-0000-0000-0000-000000000003', 'TD-01', 'Tủ Đông 01', 'freezer', '-18°C', 'Chuyên để men tươi và sốt trái cây đông lạnh'),
('20000000-0000-0000-0000-000000000004', 'KE-A-T1', 'Kệ Khô A - Tầng 1', 'dry_shelf', 'Nhiệt độ phòng', 'Các loại bao bột mì nặng 1kg - 2kg'),
('20000000-0000-0000-0000-000000000005', 'KE-A-T2', 'Kệ Khô A - Tầng 2', 'dry_shelf', 'Nhiệt độ phòng', 'Men nở, bột bắp, đường bột nhẹ'),
('20000000-0000-0000-0000-000000000006', 'KE-B-T1', 'Kệ Khô B - Tầng 1', 'dry_shelf', 'Nhiệt độ phòng', 'Bánh Sampa, bột Cacao, tinh chất Vani'),
('20000000-0000-0000-0000-000000000007', 'KE-SET-01', 'Kệ Khu Vực Set Combo', 'combo_area', 'Nhiệt độ mát 20°C', 'Kệ trưng bày các set nguyên liệu đóng gói sẵn')
ON CONFLICT (code) DO NOTHING;

-- 4. Nhà cung cấp
INSERT INTO suppliers (id, code, name, contact_person, phone, email, address) VALUES
('30000000-0000-0000-0000-000000000001', 'NCC-ANCHOR', 'Công ty Fonterra Brands Việt Nam', 'Nguyễn Thị Hương', '02838221144', 'contact@fonterra.com', 'Tòa nhà Bitexco, Q.1, TP.HCM'),
('30000000-0000-0000-0000-000000000002', 'NCC-PURATOS', 'Puratos Grand-Place Việt Nam', 'Phạm Minh Trí', '02743782299', 'info@puratos.vn', 'KCN VSIP, Bình Dương'),
('30000000-0000-0000-0000-000000000003', 'NCC-TANNHAT', 'Đại lý Tân Nhất Hương Bakery', 'Trần Văn Long', '02862678999', 'sales@tannhathuong.com', 'Tân Bình, TP.HCM')
ON CONFLICT (code) DO NOTHING;

-- 5. Sản phẩm mẫu (Bao gồm Sản phẩm lẻ và Combo)
INSERT INTO products (id, category_id, location_id, sku, name, slug, description, price, unit, image_url, is_combo, rating_average, rating_count) VALUES
-- Món lẻ
('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'BOT-MI-11', 'Bột mì Baker''s Choice số 11 (1kg)', 'bot-mi-bakers-choice-so-11-1kg', 'Bột mì cao cấp hàm lượng protein 9.5-11%, chuyên làm bánh mì hoa cúc, su kem, bánh quy', 26000, 'gói', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', FALSE, 4.9, 18),
('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'MEN-MAURIPAN', 'Men nở khô ngọt Mauripan (500g)', 'men-no-kho-ngot-mauripan-500g', 'Men khô ngọt chất lượng Pháp, giúp bánh nở phồng đều và thơm', 55000, 'hộp', 'https://images.unsplash.com/photo-1586768494164-3887c0e3338b?w=500', FALSE, 4.8, 12),
('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'BO-LAT-ANC', 'Bơ lạt Anchor New Zealand (227g)', 'bo-lat-anchor-227g', 'Bơ lạt nguyên chất từ sữa bò tự nhiên New Zealand, hương vị thơm béo hảo hạng', 75000, 'khối', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500', FALSE, 5.0, 45),
('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'WHIP-ANC', 'Kem sữa tươi Whipping Cream Anchor (250ml)', 'kem-sua-tuoi-whipping-cream-anchor-250ml', 'Độ béo 35.5%, đánh bông cứng nhanh, giữ form bánh kem và mousse cực tốt', 68000, 'hộp', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500', FALSE, 4.7, 26),
('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'MASCARPONE-TATUA', 'Phô mai Mascarpone Tatua (500g)', 'pho-mai-mascarpone-tatua-500g', 'Nguyên liệu linh hồn của món bánh Tiramisu Ý, vị chua béo thanh tao mát lạnh', 125000, 'túi', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500', FALSE, 5.0, 31),
('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 'BANH-SAMPA', 'Bánh Sampa Ý Bonomi Ladyfingers (200g)', 'banh-sampa-y-bonomi-200g', 'Bánh quy xốp sampa truyền thống nhập khẩu Ý, hút cà phê rượu rum cực tốt làm Tiramisu', 48000, 'gói', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500', FALSE, 4.8, 15),
('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 'BOT-CACAO', 'Bột Cacao nguyên chất Đắk Lắk (100g)', 'bot-cacao-nguyen-chat-dak-lak-100g', '100% hạt cacao nguyên chất, đắng thanh thơm nồng rắc mặt bánh tiramisu', 35000, 'hũ', 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500', FALSE, 4.9, 22),
('40000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 'VANI-RAYNER', 'Tinh chất Vani tự nhiên Rayner''s Anh Quốc (28ml)', 'tinh-chat-vani-rayners-28ml', 'Hương vani thanh khiết khử mùi tanh trứng, tạo mùi thơm bánh nướng cao cấp', 42000, 'chai', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500', FALSE, 4.8, 9),

-- Set Combo làm bánh (Ưu tiên gợi ý cho AI)
('40000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007', 'SET-TIRAMISU-4P', 'Set Nguyên Liệu Làm Bánh Tiramisu Ý Chuẩn Vị (4-6 người)', 'set-nguyen-lieu-lam-banh-tiramisu-chuan-vi', 'Trọn gói gồm: 1 túi Mascarpone Tatua 500g, 1 gói Bánh Sampa Bonomi 200g, 1 hộp Whipping 250ml, 1 hũ Cacao 100g và công thức chi tiết.', 245000, 'set', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500', TRUE, 5.0, 56)
ON CONFLICT (sku) DO NOTHING;

-- Các danh mục chủ đề dùng cho banner: banner chỉ lấy sản phẩm của đúng danh mục được chọn.
UPDATE products SET category_id = CASE sku
  WHEN 'BANH-SAMPA' THEN '10000000-0000-0000-0000-000000000006'
  WHEN 'CHOCOLATE-CHIP-500G' THEN '10000000-0000-0000-0000-000000000006'
  WHEN 'SET-COOKIE-12C' THEN '10000000-0000-0000-0000-000000000006'
  WHEN 'SET-TIRAMISU-4P' THEN '10000000-0000-0000-0000-000000000007'
  WHEN 'SET-BONGLAN-6P' THEN '10000000-0000-0000-0000-000000000007'
  ELSE category_id
END
WHERE sku IN ('BANH-SAMPA', 'CHOCOLATE-CHIP-500G', 'SET-COOKIE-12C', 'SET-TIRAMISU-4P', 'SET-BONGLAN-6P');

-- Thành phần trong Set Combo Tiramisu
INSERT INTO combo_items (combo_product_id, component_product_id, quantity) VALUES
('40000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000005', 1), -- Mascarpone
('40000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000006', 1), -- Bánh Sampa
('40000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000004', 1), -- Whipping Cream
('40000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000007', 1)  -- Bột Cacao
ON CONFLICT DO NOTHING;

-- 6. Dữ liệu Lô hàng mẫu để kiểm thử Thuật toán FEFO
-- Whipping Cream có 2 lô: Lô A cận date (hết hạn trong 25 ngày), Lô B date xa (hết hạn trong 180 ngày)
-- Khi bán, FEFO bắt buộc phải trừ Lô A trước!
INSERT INTO inventory_batches (product_id, batch_code, manufacture_date, expiry_date, original_quantity, current_quantity, import_price, status) VALUES
-- Whipping cream:
('40000000-0000-0000-0000-000000000004', 'LOT-WHIP-202608', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '25 days', 30, 20, 52000, 'active'), -- LÔ CẬN DATE (FEFO ƯU TIÊN)
('40000000-0000-0000-0000-000000000004', 'LOT-WHIP-202609', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '180 days', 50, 50, 54000, 'active'), -- Lô mới

-- Bơ lạt:
('40000000-0000-0000-0000-000000000003', 'LOT-BO-202607', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE + INTERVAL '30 days', 40, 15, 58000, 'active'),
('40000000-0000-0000-0000-000000000003', 'LOT-BO-202609', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '240 days', 60, 60, 60000, 'active'),

-- Mascarpone:
('40000000-0000-0000-0000-000000000005', 'LOT-MASC-01', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '45 days', 25, 25, 98000, 'active'),

-- Bánh Sampa:
('40000000-0000-0000-0000-000000000006', 'LOT-SAMPA-01', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE + INTERVAL '300 days', 100, 80, 35000, 'active'),

-- Bột Cacao:
('40000000-0000-0000-0000-000000000007', 'LOT-CACAO-01', CURRENT_DATE - INTERVAL '50 days', CURRENT_DATE + INTERVAL '365 days', 50, 45, 22000, 'active'),

-- Bột mì số 11:
('40000000-0000-0000-0000-000000000001', 'LOT-BOT11-01', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '365 days', 100, 100, 18000, 'active'),

-- Set Combo Tiramisu:
('40000000-0000-0000-0000-000000000009', 'LOT-SET-TIRA-01', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '40 days', 20, 20, 180000, 'active')
ON CONFLICT DO NOTHING;

-- 7. Voucher mẫu
INSERT INTO vouchers (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, start_date, end_date, is_active) VALUES
('BANHMOI10', 'percentage', 10.00, 150000, 50000, 100, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days', TRUE),
('FREESHIP', 'fixed', 25000, 200000, 25000, 200, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 8. Đánh giá mẫu
INSERT INTO reviews (product_id, user_id, rating, comment) VALUES
('40000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000003', 5, 'Set làm bánh Tiramisu cực kỳ tiện lợi, định lượng chuẩn đét ăn béo thơm như ngoài tiệm!'),
('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 5, 'Bơ Anchor date mới tinh, đóng gói giao kèm đá gel lạnh mát tay, rất yên tâm.')
ON CONFLICT DO NOTHING;
