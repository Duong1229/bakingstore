// Dữ liệu dự phòng chỉ dùng khi dịch vụ Supabase không thể kết nối. Đây là
// catalogue/tài khoản mẫu vốn đã có trong database/seed.sql, giúp bản chạy tại
// máy không biến thành trang trắng khi mạng hoặc dự án Supabase gặp sự cố.
const passwordHash = '$2a$10$f/NoJ5lU4D1b78wTJUlG.OHQxoCw84..9r1eIM18KaP.KNpmHPLBC';

const categories = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Bột & Men Làm Bánh', slug: 'bot-men-lam-banh', description: 'Bột mì, men nở và nguyên liệu nền' },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Bơ, Sữa & Phô Mai', slug: 'bo-sua-pho-mai', description: 'Bơ, kem sữa và phô mai bảo quản lạnh' },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Hương Liệu & Màu Thực Phẩm', slug: 'huong-lieu-mau', description: 'Cacao, vani và màu thực phẩm' },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Dụng Cụ & Khuôn Khay', slug: 'dung-cu-khuon-khay', description: 'Khuôn, phới, giấy nến' },
  { id: '10000000-0000-0000-0000-000000000005', name: 'Set / Combo Làm Bánh', slug: 'set-combo-lam-banh', description: 'Set nguyên liệu định lượng sẵn' },
  { id: '10000000-0000-0000-0000-000000000006', name: 'Bánh quy & Cookie', slug: 'banh-quy-cookie', description: 'Nguyên liệu và set làm bánh quy, cookie' },
  { id: '10000000-0000-0000-0000-000000000007', name: 'Quà bánh 20/10', slug: 'qua-banh-20-10', description: 'Gợi ý quà bánh cho Ngày Phụ nữ Việt Nam' },
];

const rawProducts = [
  ['40000000-0000-0000-0000-000000000001', 0, 'BOT-MI-11', "Bột mì Baker's Choice số 11 (1kg)", 'bot-mi-bakers-choice-so-11-1kg', 'Bột mì cao cấp làm bánh mì, su kem và bánh quy.', 26000, 'gói', false, 100],
  ['40000000-0000-0000-0000-000000000002', 0, 'MEN-MAURIPAN', 'Men nở khô ngọt Mauripan (500g)', 'men-no-kho-ngot-mauripan-500g', 'Men khô ngọt giúp bánh nở phồng đều.', 55000, 'hộp', false, 60],
  ['40000000-0000-0000-0000-000000000003', 1, 'BO-LAT-ANC', 'Bơ lạt Anchor New Zealand (227g)', 'bo-lat-anchor-227g', 'Bơ lạt nguyên chất thơm béo.', 75000, 'khối', false, 75],
  ['40000000-0000-0000-0000-000000000004', 1, 'WHIP-ANC', 'Kem sữa tươi Whipping Cream Anchor (250ml)', 'kem-sua-tuoi-whipping-cream-anchor-250ml', 'Kem béo 35.5%, đánh bông làm bánh kem và mousse.', 68000, 'hộp', false, 70],
  ['40000000-0000-0000-0000-000000000005', 1, 'MASCARPONE-TATUA', 'Phô mai Mascarpone Tatua (500g)', 'pho-mai-mascarpone-tatua-500g', 'Nguyên liệu làm bánh Tiramisu Ý.', 125000, 'túi', false, 25],
  ['40000000-0000-0000-0000-000000000006', 5, 'BANH-SAMPA', 'Bánh Sampa Ý Bonomi Ladyfingers (200g)', 'banh-sampa-y-bonomi-200g', 'Bánh quy xốp làm Tiramisu.', 48000, 'gói', false, 80],
  ['40000000-0000-0000-0000-000000000007', 2, 'BOT-CACAO', 'Bột Cacao nguyên chất Đắk Lắk (100g)', 'bot-cacao-nguyen-chat-dak-lak-100g', 'Cacao nguyên chất thơm nồng.', 35000, 'hũ', false, 45],
  ['40000000-0000-0000-0000-000000000008', 2, 'VANI-RAYNER', "Tinh chất Vani tự nhiên Rayner's Anh Quốc (28ml)", 'tinh-chat-vani-rayners-28ml', 'Hương vani thanh khiết cho bánh nướng.', 42000, 'chai', false, 25],
  ['40000000-0000-0000-0000-000000000009', 6, 'SET-TIRAMISU-4P', 'Set Nguyên Liệu Làm Bánh Tiramisu Ý Chuẩn Vị (4–6 người)', 'set-nguyen-lieu-lam-banh-tiramisu-chuan-vi', 'Set Mascarpone, Sampa, Whipping và Cacao.', 245000, 'set', true, 20],
  ['offline-10', 5, 'CHOCOLATE-CHIP-500G', 'Chocolate chip đen 55% (500g)', 'chocolate-chip-den-55-500g', 'Chocolate chip cho cookie và muffin.', 118000, 'gói', false, 40],
  ['offline-11', 3, 'GIAY-NEN-5M', 'Giấy nến chống dính 5m', 'giay-nen-chong-dinh-5m', 'Giấy nến chịu nhiệt cho khay nướng.', 35000, 'cuộn', false, 45],
  ['offline-12', 5, 'SET-COOKIE-12C', 'Set nguyên liệu làm Cookie bơ (12–15 chiếc)', 'set-nguyen-lieu-lam-cookie-bo-12-15-chiec', 'Bột mì, bơ, đường, vani và chocolate chip.', 179000, 'set', true, 30],
];

const products = rawProducts.map(([id, categoryIndex, sku, name, slug, description, price, unit, is_combo, stock_quantity]) => ({
  id, sku, name, slug, description, price, unit, is_combo, stock_quantity,
  is_active: true, rating_average: 5, rating_count: 0,
  categories: categories[categoryIndex],
}));

const users = [
  { id: '00000000-0000-0000-0000-000000000001', email: 'admin@bakingstore.vn', full_name: 'Nguyễn Quản Trị', phone: '0901234567', role: 'admin', password_hash: passwordHash, is_active: true, auth_provider: 'local' },
  { id: '00000000-0000-0000-0000-000000000002', email: 'staff@bakingstore.vn', full_name: 'Trần Thu Ngân POS', phone: '0912345678', role: 'staff', password_hash: passwordHash, is_active: true, auth_provider: 'local' },
  { id: '00000000-0000-0000-0000-000000000003', email: 'khachhang@gmail.com', full_name: 'Lê Khách Hàng', phone: '0987654321', role: 'customer', password_hash: passwordHash, is_active: true, auth_provider: 'local' },
];

const vouchers = [
  { id: 'offline-voucher-1', code: 'BANHMOI10', discount_type: 'percentage', discount_value: 10, min_order_amount: 150000, max_discount_amount: 50000, usage_limit: 100, used_count: 5, is_active: true, end_date: '2027-12-31T23:59:59.000Z' },
  { id: 'offline-voucher-2', code: 'FREESHIP', discount_type: 'fixed', discount_value: 25000, min_order_amount: 200000, max_discount_amount: 25000, usage_limit: 200, used_count: 12, is_active: true, end_date: '2027-12-31T23:59:59.000Z' },
];

let databaseUnavailable = process.env.SUPABASE_OFFLINE_FALLBACK === 'true';
const isConnectionFailure = (error) => /fetch failed|ENOTFOUND|network/i.test(String(error?.message || error));
const markDatabaseUnavailable = () => { databaseUnavailable = true; };
const shouldUseOffline = () => databaseUnavailable;
module.exports = { categories, products, users, vouchers, isConnectionFailure, markDatabaseUnavailable, shouldUseOffline };
