# Chi tiêu

App quản lý chi tiêu cá nhân, chạy hoàn toàn trên trình duyệt. Dữ liệu chỉ lưu trên máy của bạn (IndexedDB), không có server, không cần tài khoản.

## Tính năng

- **Giao dịch**: ghi thu/chi theo danh mục, tìm kiếm, xem theo tháng.
- **Tổng quan**: tổng thu, tổng chi, số dư và phân bổ theo danh mục.
- **Ngân sách**: đặt hạn mức theo danh mục, cộng thêm vào hạn mức đang có.
- **Chia tiền**: chia hoá đơn cho nhiều người và tạo mã **VietQR** để chuyển khoản; quét mã QR ngân hàng để lấy thông tin người nhận.
- **Sao lưu**: xuất/nhập CSV.
- **PWA**: cài lên màn hình chính, dùng được khi offline.

## Quyền riêng tư

Mọi dữ liệu nằm trong IndexedDB của trình duyệt. App không gọi API bên ngoài, kể cả khi tạo hay đọc mã VietQR. Xoá dữ liệu trình duyệt là mất dữ liệu, nên hãy xuất CSV định kỳ.

## Công nghệ

[Next.js](https://nextjs.org) 16 · React 19 · TypeScript · [Dexie](https://dexie.org) (IndexedDB) · [Lucide](https://lucide.dev) icons · Playwright cho e2e test.

## Chạy trên máy

Cần Node.js 20 trở lên.

```bash
npm install
npm run dev        # http://localhost:3100
```

### Dùng trên điện thoại (cùng Wi-Fi)

```bash
npm run build && npm start
```

Mở `http://<tên-máy-hoặc-IP>:3100` trên điện thoại (ví dụ `http://my-laptop.local:3100`), rồi chọn "Thêm vào màn hình chính".

> Service worker và tính năng camera (quét QR) cần HTTPS hoặc `localhost`. Khi truy cập qua IP trong mạng LAN, một số trình duyệt sẽ chặn camera.

## Kiểm thử

```bash
npx playwright install chromium   # lần đầu
npm run lint
npm run test:e2e
```

## Cấu trúc thư mục

```
src/app/                 Next.js app router, manifest, đăng ký service worker
src/features/finance/    Toàn bộ tính năng: UI, IndexedDB (db.ts, repo.ts), VietQR (vietqr.ts)
public/sw.js             Service worker cho chế độ offline
e2e/                     Playwright test
```

## Đóng góp

Mọi đóng góp đều được hoan nghênh. Xem [CONTRIBUTING.md](CONTRIBUTING.md).

## Giấy phép

[MIT](LICENSE)
