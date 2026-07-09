# Backend Auth — Express + TypeScript + MongoDB

Hệ thống xác thực & phân quyền chuẩn doanh nghiệp: **Admin / Quản lý (Manager) / Khách hàng (Customer)**,
dùng JWT (access token + refresh token rotation), bcrypt, khoá tài khoản khi đăng nhập sai nhiều lần, rate limit, và các lớp bảo vệ HTTP tiêu chuẩn.

## 1. Tính năng

- **Đăng ký** (`/api/auth/register`): **chỉ dành cho khách hàng** — role luôn bị ép cứng về `customer`, không tin dữ liệu client gửi lên.
- **Đăng nhập** (`/api/auth/login`): dùng chung cho cả 3 vai trò `admin`, `manager`, `customer`.
- **Admin tạo tài khoản Quản lý** (`POST /api/admin/managers`): chỉ `admin` mới gọi được, role bị ép cứng về `manager`.
- **Phân quyền theo route**: middleware `authenticate` + `authorize(...roles)`.
- **JWT 2 lớp**:
  - Access token: sống ngắn (mặc định 15 phút), gửi qua header `Authorization: Bearer <token>`.
  - Refresh token: sống dài (mặc định 7 ngày), lưu trong **httpOnly cookie**, xoay vòng (rotation) mỗi lần refresh, hash lưu DB để có thể thu hồi, phát hiện tái sử dụng token cũ (dấu hiệu bị đánh cắp) sẽ thu hồi toàn bộ token của user.
- **Chống brute-force**: khoá tài khoản tạm thời sau N lần sai mật khẩu (`MAX_LOGIN_ATTEMPTS`, `LOCK_TIME_MINUTES`), rate-limit riêng cho `/login`, `/register`, `/refresh-token`.
- **Bảo mật khác**: `helmet`, CORS whitelist theo domain kèm cookie, `express-mongo-sanitize` (chống NoSQL injection), `hpp` (chống HTTP param pollution), giới hạn kích thước body, validate input bằng `zod`, mật khẩu yêu cầu độ phức tạp (hoa/thường/số/ký tự đặc biệt, tối thiểu 8 ký tự), bcrypt salt rounds cấu hình được, không bao giờ trả `password`/`tokenVersion`/`lockUntil` ra ngoài JSON.
- **Đổi mật khẩu** tự động tăng `tokenVersion` → thu hồi toàn bộ access/refresh token cũ trên mọi thiết bị.
- **Admin quản lý người dùng**: danh sách (lọc theo role, phân trang), khoá/mở khoá tài khoản, xoá tài khoản (không thể xoá/khoá admin).

## 2. Cấu trúc thư mục

```
src/
  config/        # env, database, logger
  models/        # User, RefreshToken (mongoose schemas)
  middlewares/   # auth (JWT + phân quyền), validate (zod), error, rate-limit
  controllers/   # auth.controller, admin.controller
  services/      # token.service (cấp phát / xoay vòng / thu hồi JWT)
  routes/        # auth.routes, admin.routes
  validations/   # zod schemas
  scripts/       # seedAdmin.ts — tạo admin đầu tiên
  app.ts         # cấu hình Express + middleware bảo mật
  server.ts      # entrypoint, kết nối DB, graceful shutdown
```

## 3. Cài đặt & chạy

```bash
npm install
cp .env.example .env
# Mở .env, điền MONGODB_URI thật + sinh JWT secret mạnh:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Tạo tài khoản admin đầu tiên (chạy 1 lần)
npm run seed:admin

# Chạy dev (hot reload)
npm run dev

# Build & chạy production
npm run build
npm start
```

> Đăng ký (`/register`) chỉ tạo khách hàng. Tài khoản **admin đầu tiên** phải tạo bằng `npm run seed:admin`.
> Sau đó admin đăng nhập và gọi `POST /api/admin/managers` để tạo tài khoản **quản lý**.

## 4. API chính

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Đăng ký khách hàng |
| POST | `/api/auth/login` | Public | Đăng nhập (mọi role) |
| POST | `/api/auth/refresh-token` | Public (cần cookie) | Cấp access token mới |
| POST | `/api/auth/logout` | Public | Đăng xuất |
| GET | `/api/auth/me` | Đã đăng nhập | Thông tin bản thân |
| PATCH | `/api/auth/change-password` | Đã đăng nhập | Đổi mật khẩu |
| POST | `/api/admin/managers` | **Admin** | Tạo tài khoản quản lý |
| GET | `/api/admin/users` | **Admin** | Danh sách người dùng |
| PATCH | `/api/admin/users/:id/status` | **Admin** | Khoá/mở khoá tài khoản |
| DELETE | `/api/admin/users/:id` | **Admin** | Xoá tài khoản |

### Ví dụ

```bash
# Đăng ký khách hàng
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Van A","email":"a@example.com","password":"Abcd@1234"}'

# Đăng nhập
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@company.com","password":"Admin@12345"}'

# Gọi API cần quyền admin (dùng accessToken lấy được ở bước login)
curl -X POST http://localhost:5000/api/admin/managers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"fullName":"Tran Thi B","email":"b@company.com","password":"Manager@123"}'

# Lấy access token mới bằng refresh token (cookie)
curl -X POST http://localhost:5000/api/auth/refresh-token -b cookies.txt -c cookies.txt
```

## 5. Ghi chú triển khai production

- Đặt `NODE_ENV=production`, `COOKIE_DOMAIN` đúng domain thật để cookie `secure + sameSite=strict` hoạt động.
- Bắt buộc chạy sau HTTPS (cookie `secure` chỉ gửi qua HTTPS).
- Nên đặt reverse proxy (Nginx) phía trước, `app.set('trust proxy', 1)` đã được cấu hình sẵn.
- Cân nhắc thêm Redis cho rate-limit/refresh-token store nếu scale nhiều instance (hiện dùng MongoDB TTL index, chạy tốt cho hầu hết trường hợp).
