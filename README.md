# Intern Manager

Ứng dụng web quản lý intern được xây dựng với Next.js, TypeScript và Tailwind CSS.

## Tính năng

- ⚡ Next.js 15 với App Router
- 🔷 TypeScript để type safety
- 🎨 Ant Design (antd) cho UI components
- 🗄️ MongoDB với Mongoose ODM
- 📱 Responsive design
- 🔗 Axios cho API calls
- ♿ Accessibility tốt

### Quản lý sinh viên thực tập:
- ✅ Thêm, sửa, xóa thông tin sinh viên
- 📋 Quản lý đợt thực tập
- 👤 Thông tin cá nhân: họ tên, MSSV, lớp, SĐT, email
- 💼 Thông tin thực tập: vị trí, trạng thái, ghi chú
- 💬 Phản hồi từ bộ phận tiếp nhận
- 🔍 Tìm kiếm và lọc danh sách

## Yêu cầu hệ thống

- Node.js 18.17 trở lên
- npm hoặc yarn

## Cài đặt

1. Clone repository này:
```bash
git clone <repository-url>
cd intern-manager
```

2. Cài đặt dependencies:
```bash
npm install
# hoặc
yarn install
```

3. Cấu hình Database:

**Sử dụng MongoDB Atlas (Khuyến nghị):**
- Đăng ký tài khoản tại [MongoDB Atlas](https://cloud.mongodb.com/)
- Tạo cluster mới (chọn M0 Sandbox - miễn phí)
- Tạo database user với username và password
- Thêm IP address vào whitelist (hoặc cho phép 0.0.0.0/0 để truy cập từ mọi nơi)
- Copy connection string

4. Tạo file `.env.local`:
```bash
cp .env.example .env.local
```

5. Cập nhật `.env.local` với MongoDB connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.abcde.mongodb.net/intern-manager?retryWrites=true&w=majority
```

## Phát triển

Khởi động development server:

```bash
npm run dev
# hoặc
yarn dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt để xem kết quả.

## Scripts có sẵn

- `npm run dev` - Khởi động development server
- `npm run build` - Build ứng dụng cho production
- `npm run start` - Khởi động production server
- `npm run lint` - Chạy ESLint để kiểm tra code

## Cấu trúc dự án

```
intern-manager/
├── src/
│   ├── app/
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
├── .github/
│   └── copilot-instructions.md
├── public/                 # Static files
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies và scripts
```

## Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## Giấy phép

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm thông tin.
