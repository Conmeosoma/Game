# Báo cáo bản thử offline 0.1.0

## Kết quả

Đã tạo và cài ứng dụng Android mới `vn.personal.dmcoffline`. Dự án có gameplay offline và lưu tiến trình, nhưng **chưa hoàn thành yêu cầu clone giống 100%**. Không khẳng định đã khôi phục hệ thống server hoặc toàn bộ game gốc.

## Dữ liệu thực tế

APK tham chiếu: Đại Minh Chủ 8.0.2, 52.568.975 byte, SHA-256 `2ff6b4db2177dc1362c20866750a48371f283a79a40335d3293a26e39e7e4194`. Engine gốc Unity 4.7.2f1, Mono/C#. Chỉ thao tác trên bản sao ở `work/dai-minh-chu-audit/`.

Trích được 333 bản ghi nhân vật (71 NPC), 159 võ công, 145 trang bị, 92 chương/1.405 nhiệm vụ. Bộ chọn chiêu mộ dùng 258 mã NV có sinh lực cơ sở lớn hơn 10. Phân tích thêm 9 atlas NGUI và phục hồi kênh alpha, tổng cộng có 1.449 ảnh/sprite. Mỗi bản ghi nhân vật trong cấu hình có ít nhất ảnh lớn hoặc ảnh nhỏ tương ứng. Một số ảnh NPC chỉ là chân dung nhỏ, không phải nhân vật có đầy đủ hoạt ảnh.

## Chức năng có trong bản thử

| Phần | Tình trạng |
|---|---|
| Đăng nhập offline, đặt tên môn phái | Có, không cần tài khoản |
| Đội hình 8 người, đổi vị trí, duyên phận | Có, quy tắc mô phỏng |
| Chiêu mộ theo giá/tỷ lệ cấu hình APK | Có |
| Bồi dưỡng, hồn phách, đột phá | Có, kinh tế mô phỏng |
| Trang bị/cường hóa/học võ công | Có, hệ thống đơn giản hóa |
| Chiến đấu tự động, tốc độ, xem kết quả | Có, công thức viết lại |
| Nhiệm vụ, mở ải, thưởng, càn quét | Có, dữ liệu gốc; chưa cân bằng toàn bộ |
| Hội thoại chương | Có, đọc nội dung lấy từ APK |
| Tự lưu, tiếp tục trận đang đánh | Có |
| Xuất/nhập JSON qua trình chọn tệp | Có |
| Giao diện/hiệu ứng đúng 100% | Chưa có |
| Toàn bộ hệ thống tăng trưởng và hoạt động phụ | Chưa có |
| Server, PvP, bang hội, liên server, chat | Chưa có; ngoài phạm vi offline trước |

## Giới hạn quan trọng

Không có source/backend và database của server. Chỉ số gốc có trong APK không đủ xác nhận công thức sát thương, xử lý lượt, tăng trưởng đầy đủ và kinh tế server. Bộ máy hiện dùng công thức giảm sát thương theo phòng thủ, xác suất kỹ năng trong cấu hình, bạo kích mô phỏng và tối đa 30 vòng. Cấp nhân vật/trang bị tạm giới hạn 150, đột phá 10.

Đã kiểm chứng chơi được ở các nhiệm vụ đầu. Có kiểm tra chiến đấu hữu hạn trên các chỉ số ải xa, **không có nghĩa đã chơi qua toàn bộ chiến dịch**. Ví dụ đối thủ cuối chương 92 có sinh lực khoảng 79,5 triệu và công kích khoảng 845 nghìn, trong khi các hệ thống tăng trưởng sâu chưa được triển khai. Do đó một số chương sau có thể chưa vượt được. Không nên coi đây là bản game đầy đủ hoặc đã cân bằng.

## Xác minh và thiết bị

- Điện thoại Redmi `23129RAA4G`, Android 15, ADB serial `8e90fdff`.
- 10/10 kiểm tra logic Node đã qua.
- 10/10 mục kiểm thử thiết bị đã qua, gồm lưu tiến trình qua force-stop và khởi động lại.
- Đã từ chối JSON hỏng và kiểm tra nhập bản lưu hợp lệ qua hộp xác nhận trong game. Chưa tự động kiểm tra toàn bộ thao tác chọn tệp nhập bằng DocumentsUI; bộ đọc/ghi và thao tác xuất thực tế đã được kiểm tra.
- Xuất tệp sao lưu bằng DocumentsUI vào Download, đọc lại JSON thành công. Không in toàn bộ dữ liệu cá nhân trong báo cáo.
- Font hệ thống hiển thị dấu Việt ở màn hình chính, nhân vật và chiến đấu; đã sửa lỗi chiều cao thẻ đội hình phát hiện trong kiểm thử trực tiếp.
- Kiểm thử dùng trạng thái tạm, khôi phục trạng thái trước thử; không xóa dữ liệu package hoặc gỡ game đã có. Khi cài bản thường, dùng cùng khóa và `install -r` để giữ tiến trình.
- Nhật ký thử và ảnh: `verification/`. Bản APK thường tắt debug và không yêu cầu quyền Android/Internet.

## Công cụ, lệnh chính

Không cài thêm công cụ. Dùng UnityPy/TypeTreeGeneratorAPI đã có để đọc resource/schema C#; Pillow phục hồi ảnh atlas; Node cho kiểm tra; Java/Android SDK cho build.

```text
python dai-minh-chu-offline/tools/prepare_assets.py
python dai-minh-chu-offline/tools/extract_atlases.py
node --test dai-minh-chu-offline/tests/engine.test.cjs
python dai-minh-chu-offline/tools/build.py --debug
adb -s 8e90fdff install -r output/dai-minh-chu-offline-0.1.0.apk
adb -s 8e90fdff shell am start -n vn.personal.dmcoffline/.MainActivity
node dai-minh-chu-offline/tools/device_test.cjs
python dai-minh-chu-offline/tools/build.py
adb -s 8e90fdff install -r output/dai-minh-chu-offline-0.1.0.apk
```

Build chạy javac → D8 → aapt → zipalign → apksigner. Lệnh/return code đầy đủ được ghi tại `build/commands.json`. Thông tin chữ ký/hash/kích thước cuối ở `build/build-result.json`; bản sao đã loại đường dẫn riêng được lưu kèm đầu ra.

## Đầu ra

- `output/dai-minh-chu-offline-0.1.0.apk`.
- `output/dai-minh-chu-offline-source.zip`: mã nguồn, dữ liệu/ảnh tham chiếu, hướng dẫn và kiểm tra; không chứa khóa ký hoặc bản lưu cá nhân.
- Toàn bộ dự án làm việc ở `dai-minh-chu-offline/`.

Để tiến tới mức giống 100%, cần bổ sung đặc tả/backend gốc và đối chiếu gameplay/giao diện đầy đủ. Những phần còn thiếu được liệt kê ở trên, không thay thế bằng cam kết đã hoàn thành.
