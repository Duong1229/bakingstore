# 🍰 Baking AI Store - Website Bán Nguyên Liệu Làm Bánh Tích Hợp AI & Quản Lý Kho FEFO

Dự án Thương mại điện tử Bán lẻ & Quản lý bán hàng tại quầy (POS) – Quản lý kho theo Lô hạn sử dụng (FEFO) và Vị trí lưu trữ (Tủ mát/Kệ) – Tích hợp trợ lý công thức làm bánh Google Gemini AI và thanh toán tự động VietQR + SePay Webhook.

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN

```
baking-ai-store/
├── database/                   # Cơ sở dữ liệu Supabase / PostgreSQL
│   ├── schema.sql              # File DDL tạo toàn bộ bảng, trigger & Stored Procedure FEFO
│   └── seed.sql                # Dữ liệu mẫu (sản phẩm, lô FEFO, vị trí kho, tài khoản)
│
├── backend/                    # Máy chủ RESTful API (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Cấu hình Supabase Client, Gemini AI
│   │   ├── controllers/        # Điều khiển logic các luồng nghiệp vụ
│   │   ├── middlewares/        # Xác thực JWT & Phân quyền RBAC (Admin/Staff/Customer)
│   │   ├── routes/             # Định tuyến API
│   │   ├── services/           # Nghiệp vụ FEFO, Excel Parser, PDF Generator
│   │   ├── app.js              # Cấu hình Express
│   │   └── server.js           # Khởi chạy server
│   ├── .env.example            # File mẫu biến môi trường
│   └── package.json
│
├── frontend/                   # Giao diện người dùng (Nuxt 4 / Vue 3 + Tailwind CSS)
│   ├── components/             # Chatbot AI Widget, POS Barcode Scanner, Header, Cart
│   ├── pages/                  # Khách hàng, POS thu ngân, Admin quản trị kho
│   └── stores/                 # Pinia quản lý giỏ hàng và trạng thái đơn
│
└── README.md                   # Hướng dẫn cài đặt và vận hành
```

---

## 🚀 HƯỚNG DẪN THIẾT LẬP VÀ CHẠY DỰ ÁN

---

### Cài đặt thư viện và Chạy Backend
Mở Terminal trong thư mục `backend/` và chạy:
```bash
npm install
npm run dev
```
Backend sẽ khởi chạy tại: `http://localhost:5000` (Kiểm tra API: `http://localhost:5000/api/health`).

---

## 🔑 TÀI KHOẢN MẪU ĐỂ ĐĂNG NHẬP THỬ NGHIỆM

Mật khẩu mặc định cho tất cả tài khoản mẫu là: **`123456`**

| Vai trò (Role) | Email đăng nhập | Quyền hạn trong hệ thống |
| :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@bakingstore.vn` | Toàn quyền: Sửa vị trí kho tủ/kệ, Nhập hàng Excel hàng loạt, Quản lý lô FEFO, Voucher, Doanh thu |
| **Nhân viên (Staff)** | `staff@bakingstore.vn` | Bán lẻ tại quầy POS (quét QR/mã), In bill K80, In phiếu nhặt đồ đơn Online (chỉ xem vị trí kho) |
| **Khách hàng (Customer)**| `khachhang@gmail.com` | Mua lẻ, Mua combo, Chat AI hỏi công thức, Đặt hàng VietQR, Đánh giá sao sản phẩm |
