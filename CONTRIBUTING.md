# Đóng góp cho Chi tiêu

Cảm ơn bạn đã quan tâm! Vài hướng dẫn ngắn:

## Báo lỗi / đề xuất

Mở [issue](https://github.com/namledev056/chi-tieu/issues) và mô tả: bạn làm gì, mong đợi gì, thực tế ra sao, dùng trình duyệt/thiết bị nào. Ảnh chụp màn hình rất có ích.

**Đừng** đính kèm file CSV chứa dữ liệu chi tiêu thật hay số tài khoản ngân hàng thật.

## Gửi pull request

1. Fork repo và tạo branch từ `main`.
2. `npm install`, rồi `npm run dev` để chạy thử.
3. Giữ thay đổi nhỏ và tập trung vào một việc.
4. Thêm hoặc cập nhật test Playwright trong `e2e/` nếu thay đổi hành vi.
5. Đảm bảo `npm run lint` và `npm run test:e2e` đều qua.
6. Mở PR, mô tả thay đổi và lý do.

## Nguyên tắc

- **Dữ liệu ở lại trên máy.** Không thêm tính năng gửi dữ liệu người dùng ra ngoài (analytics, API bên thứ ba...) trừ khi đã thảo luận trong issue trước.
- Giao diện ưu tiên điện thoại; kiểm tra ở chiều rộng màn hình nhỏ.
- Chữ trong giao diện dùng tiếng Việt.
