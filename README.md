# Game

Dự án **Đại Minh Chủ Offline 0.1.0**, bản tái dựng thử nghiệm cho Android, chơi offline và lưu tiến trình trên thiết bị.

- [Hướng dẫn và cấu trúc mã nguồn](dai-minh-chu-offline/README.md)
- [Phạm vi thực hiện và giới hạn](dai-minh-chu-offline/REPORT.md)
- [Kiểm tra bộ máy chiến đấu](dai-minh-chu-offline/tests/engine.test.cjs)

Bản thử có đội hình, chiêu mộ, trang bị, bồi dưỡng, chiến đấu tự động, giang hồ và xuất/nhập bản lưu. Dữ liệu tham chiếu lấy từ APK Đại Minh Chủ 8.0.2 người dùng cung cấp. **Chưa phải bản clone giống 100%**, chưa khôi phục backend gốc hoặc cân bằng toàn bộ chiến dịch.

Repo chỉ chứa mã nguồn và công cụ. Ảnh, bảng dữ liệu trích từ APK và bản lưu cá nhân được giữ cục bộ. Trước khi chạy/build, nhập tài nguyên từ APK bạn có theo hướng dẫn trong README của dự án.

Kiểm tra logic từ thư mục gốc sau khi nhập tài nguyên:

```sh
node --test dai-minh-chu-offline/tests/engine.test.cjs
```

Build Android theo hướng dẫn trong README của dự án. Công cụ build hiện được cấu hình cho Android SDK và JDK cục bộ trên Windows; cần điều chỉnh đường dẫn khi chuyển máy.

Khóa ký, thông tin ký, bản lưu cá nhân, dữ liệu kiểm tra điện thoại, SDK và các bộ cài không được đưa lên Git. Ảnh và nội dung tham chiếu thuộc game gốc; chúng không được cấp lại giấy phép tự do bởi repo này.
