# Tu Tiên Truyện
- `server/`: Node.js (Express, lưu `data.json`). Chạy: `cd server && npm i && npm start`. Admin mặc định `admin` / `admin123` (đặt env `ADMIN_PASS`, `JWT_SECRET`).
- `client/`: web + APK (Capacitor). Push lên GitHub nhánh `main` → Actions tạo APK (tab Actions → Artifacts).
- Vai trò: user, author (đăng truyện/chương), mod (xoá nội dung, đổi user↔author), admin (toàn quyền).
- Tu vi: đọc 20s = +10 exp, nghe 30s = +15 exp (mỗi chương/loại/ngày 1 lần); tác giả nhận 50% exp của người đọc.
