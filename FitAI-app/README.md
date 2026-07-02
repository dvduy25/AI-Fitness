# FitAI — Ứng dụng Coach Thể Hình & Dinh Dưỡng AI

Ứng dụng mobile React Native (Expo) kết nối với backend Node.js/Express có sẵn
trong `backend.rar`. Phiên bản này tập trung vào các tính năng cốt lõi:

- 🔐 Đăng ký (3 bước) & đăng nhập
- 🏠 Trang chủ: vòng tròn calo, thanh macro, chuỗi ngày ăn chuẩn (flame streak),
  buổi tập hôm nay, thống kê tuần
- 🏋️ Lịch tập: xem/tạo lịch 7 ngày, thêm/xóa bài tập từ thư viện, ghi kết quả
  buổi tập (số hiệp/reps/kg, có gợi ý dựa trên lần tập trước)
- 🍽️ Dinh dưỡng: kế hoạch bữa ăn (thêm/xóa món), ghi nhật ký ăn uống hằng ngày
  (theo kế hoạch hoặc món tự do)
- 📈 Tiến độ: biểu đồ cân nặng, ghi cân nặng mới (tự tính lại macro mục tiêu),
  thống kê rank/streak/thành tích
- 👤 Hồ sơ: xem/sửa thông tin cá nhân, đổi mật khẩu, cấu hình địa chỉ server

## 1. Chạy Backend

```bash
cd backend
npm install
cp .env.example .env   # điền MONGO_URI, JWT_SECRET, v.v.
npm run dev             # hoặc npm start
```

Backend mặc định chạy ở `http://localhost:5000`, các API nằm dưới `/api`.

**Quan trọng:** mở `backend/.env` và thêm origin cho phép (không bắt buộc vì
app mobile không gửi header `Origin`, nhưng nên set để rõ ràng):

```
ALLOWED_ORIGINS=http://localhost:5173
```

## 2. Chạy App Mobile (FitAI/)

```bash
cd FitAI
npm install
npx expo start
```

Quét mã QR bằng **Expo Go** (Android/iOS) hoặc nhấn `a`/`i` để mở emulator.

### Kết nối app với backend

Điện thoại **không** truy cập được `localhost` của máy tính. Bạn cần dùng địa
chỉ IP LAN của máy chạy backend, ví dụ `http://192.168.1.20:5000/api`.

Có 2 cách cấu hình:

1. Tạo file `FitAI/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api
   ```
   rồi khởi động lại `npx expo start`.

2. Hoặc trong app: màn hình **Chào mừng → "Cấu hình địa chỉ máy chủ"** (hoặc
   Hồ sơ → Địa chỉ máy chủ) để nhập/lưu URL ngay trên điện thoại — không cần
   build lại.

Tìm IP LAN bằng `ipconfig` (Windows) hoặc `ifconfig`/`ip addr` (macOS/Linux).
Đảm bảo điện thoại và máy tính cùng mạng Wi-Fi, và firewall cho phép cổng 5000.

## 3. Cấu trúc thư mục app

```
FitAI/
  app/                  # Màn hình (expo-router, file-based routing)
    (auth)/              # welcome, login, register, server-settings
    (tabs)/               # index (Home), workout, meals, progress, profile
    workout/[day].tsx     # Chi tiết + ghi log 1 ngày tập
    workout/add-exercise.tsx
    meals/[mealId].tsx    # Chỉnh sửa món trong 1 bữa ăn (kế hoạch)
    meals/add-food.tsx    # Ghi món ăn tự do vào nhật ký hôm nay
    profile/edit.tsx
    profile/change-password.tsx
  src/
    api/                 # Axios client + các module gọi API theo domain
    components/ui/       # Design system: Button, Input, Card, CalorieRing,...
    context/              # AuthContext, ToastContext
    theme/tokens.ts       # Màu sắc, typography, spacing dùng toàn app
    types/                # TypeScript types khớp với Mongoose models
```

## 4. Những phần chưa làm ở bản này

Theo phạm vi đã chọn (tính năng cốt lõi), các phần sau của backend **chưa**
có màn hình tương ứng, có thể bổ sung sau: mạng xã hội (bài đăng/like/comment),
Premium/thanh toán, thư viện đã lưu, thông báo, trang quản trị (admin), AI
chat coach. Toàn bộ API cho các phần này đã có sẵn trong backend nếu bạn muốn
mở rộng.
