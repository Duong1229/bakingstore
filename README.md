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

### Bước 1: Mở Workspace trên Antigravity IDE
1. Nhìn lên menu góc trên bên trái của Antigravity, chọn **File** $\rightarrow$ **Open Folder...** (hoặc bấm phím tắt `Ctrl + K, Ctrl + O`).
2. Chọn thư mục dự án: `C:\Users\ThinkPad\.gemini\antigravity\scratch\baking-ai-store`.

---

### Bước 2: Thiết lập Cơ sở dữ liệu Supabase (Miễn phí)
1. Đăng nhập vào [Supabase](https://supabase.com/) và tạo một Project mới (chọn Region Singapore để tốc độ nhanh nhất).
2. Vào mục **SQL Editor** ở thanh menu bên trái của Supabase:
   * Mở file `database/schema.sql`, sao chép toàn bộ nội dung dán vào SQL Editor rồi bấm **Run**. *(Hệ thống sẽ tạo toàn bộ bảng, quan hệ khóa ngoại, trigger tính sao đánh giá và thuật toán xuất kho FEFO).*
   * Tiếp tục mở file `database/seed.sql`, sao chép dán vào và bấm **Run** để nạp dữ liệu mẫu ban đầu.
3. Vào mục **Project Settings** $\rightarrow$ **API**:
   * Sao chép **Project URL**.
   * Sao chép **service_role key** (Secret key có quyền ghi/đọc dữ liệu).

---

### Bước 3: Cấu hình biến môi trường Backend
1. Tại thư mục `backend/`, đổi tên hoặc sao chép file `.env.example` thành `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Điền các thông tin vào file `backend/.env`:
   * `SUPABASE_URL`: Dán Project URL từ Supabase.
   * `SUPABASE_SERVICE_ROLE_KEY`: Dán Service Role Key từ Supabase.
   * `GEMINI_API_KEY`: Lấy API Key miễn phí tại [Google AI Studio](https://aistudio.google.com/).
   * `BANK_CODE`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`: Số tài khoản ngân hàng cá nhân của bạn để nhận tiền VietQR.
   * `SEPAY_API_KEY`: API Token từ SePay để kiểm tra Webhook.

---

### Bước 4: Cài đặt thư viện và Chạy Backend
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
