# Đại Minh Chủ Offline — bản tái dựng thử nghiệm 0.1.0

Ứng dụng Android offline dựng từ dữ liệu tham chiếu trong APK Đại Minh Chủ 8.0.2 do người dùng cung cấp. Có thể chơi, lưu tiến trình và xuất/nhập bản lưu. **Đây chưa phải bản clone giống 100% game gốc.**

## Tài nguyên giữ cục bộ

Repo GitHub chỉ chứa mã nguồn, công cụ, tài liệu và kiểm tra. `assets/art/` và `assets/data.js` được bỏ qua trong Git vì chúng là ảnh/bảng dữ liệu trích từ APK. Các số lượng tài nguyên bên dưới mô tả bản build cục bộ đã kiểm tra, không phải tài nguyên được công khai trong repo.

Để chuẩn bị tài nguyên trên máy có Python 3.12, dùng môi trường Python có các gói trong `requirements.txt`, rồi chạy từ gốc repo:

```powershell
python dai-minh-chu-offline/tools/import_apk.py "C:/path/to/dai-minh-chu-8.0.2.apk"
node --test dai-minh-chu-offline/tests/engine.test.cjs
```

Nếu cần cài dependency trong môi trường riêng, lệnh là `python -m pip install -r dai-minh-chu-offline/requirements.txt`; công cụ nhập không tự cài gói. Nó đọc bản sao APK, tạo dữ liệu phân tích trong `work/dai-minh-chu-audit/`, rồi sinh lại ảnh/bảng dữ liệu cục bộ. Không chạy code game trong APK.

## Chơi trên điện thoại

- Mở ứng dụng **Đại Minh Chủ Offline**, package `vn.personal.dmcoffline`.
- Bắt đầu với Lệnh Hồ Xung, Nhạc Linh San, Lâm Bình Chi, 1.000 vàng và 30.000 bạc.
- **Môn phái**: tiếp tục hành hiệp, nhận quà mỗi ngày, mua bạc/thể lực bằng vàng trong game.
- **Đội hình**: chọn đệ tử, bồi dưỡng, xuất/nghỉ chiến, đổi vị trí, trang bị và học võ công. Tối đa 8 người.
- **Giang hồ**: vượt các nhiệm vụ theo thứ tự; thắng lần đầu để mở ải kế. Càn quét các ải đã thắng. Có thể đọc hội thoại chương.
- **Chiêu mộ**: ba loại lời mời, tỷ lệ và giá lấy từ cấu hình APK. Đệ tử trùng chuyển thành hồn phách để đột phá.
- **Hành trang**: xem trang bị, cường hóa, võ công và hồn phách.
- **Cài đặt** (bánh răng): đổi tên, bật âm thanh, xuất hoặc nhập tệp JSON lưu tiến trình.

Tiến trình tự lưu sau mỗi thao tác vào vùng dữ liệu riêng của ứng dụng. Đóng game hoặc khởi động lại điện thoại vẫn giữ tiến trình. **Gỡ ứng dụng/xóa dữ liệu sẽ mất bản lưu cục bộ**; hãy xuất tệp sao lưu trước. APK cập nhật được ký cùng khóa sẽ cài đè bằng `adb install -r` và giữ tiến trình.

## Nội dung tham chiếu đã khôi phục

- 333 bản ghi nhân vật: 262 mã NV và 71 mã NPC; 258 nhân vật đủ điều kiện trong bộ chọn chiêu mộ của bản thử.
- 159 võ công, 145 trang bị.
- 92 chương, 1.405 nhiệm vụ với tên, mô tả, đội hình đối thủ, chỉ số và phần thưởng cấu hình.
- 1.449 ảnh/sprite, gồm ảnh lớn và ảnh nhỏ; tất cả 333 bản ghi nhân vật có ảnh tương ứng.
- Các hội thoại chương và dữ liệu duyên phận trong APK.

## Phần được viết lại và giới hạn

Giao diện, bộ máy chiến đấu, điều khiển, lưu trữ và kinh tế offline được viết mới bằng JavaScript; vỏ Android là Java/WebView. Không sử dụng lại Unity runtime, SDK đăng nhập hoặc code thực thi của APK gốc. APK mới không yêu cầu quyền Android nào, không có quyền Internet và WebView chặn tải mạng.

Thông số nền của nhân vật, chỉ số đội hình đối thủ, mô tả võ công, tỷ lệ chiêu mộ và các phần thưởng có trong cấu hình được đọc từ dữ liệu APK. **Công thức sát thương, xác định thắng thua, duyên phận khi phối hợp, tăng cấp, bồi dưỡng, đột phá, thể lực, thưởng vàng và quà hằng ngày là cách mô phỏng của bản thử**, không phải công thức đã xác nhận từ server gốc. Bộ máy hiện mô phỏng giao chiến tối đa 30 vòng; hết số vòng mà còn đối thủ thì tính thua.

Đã kiểm tra luồng chơi ở các ải đầu và mô phỏng kỹ thuật một số ải sau. **Chưa cân bằng hoặc kiểm chứng khả năng hoàn thành toàn bộ 1.405 ải.** Các chương sau có chỉ số đối thủ rất lớn; hệ thống tăng trưởng hiện tại có thể không đủ để vượt qua. Chưa khôi phục đầy đủ các hệ thống bồi dưỡng/kinh mạch/chân khí của bản gốc.

Chưa có giao diện và hiệu ứng giống từng pixel, toàn bộ hoạt ảnh/âm thanh gốc, tất cả loại vật phẩm/sự kiện, bang hội, chat, tài khoản, liên server, PvP và các hoạt động phụ của game gốc. Không kết nối tới máy chủ gốc; không thay đổi kiểm tra đăng nhập/license của game gốc.

Để xác nhận mức tương đương 100%, còn cần luật máy chủ hoặc mã nguồn/backend và dữ liệu phiên bản tương ứng, cùng luồng chơi/video tham chiếu đầy đủ để đối chiếu. APK client một mình không cung cấp đủ bằng chứng đó.

## Mã nguồn

- `assets/engine.js`: dữ liệu trạng thái, chiến đấu, phần thưởng và tăng trưởng.
- `assets/app.js`, `assets/style.css`, `assets/index.html`: giao diện và điều khiển.
- `assets/data.js`, `assets/art/`: dữ liệu/ảnh tham chiếu đã trích xuất.
- `android/src/vn/personal/dmcoffline/MainActivity.java`: vỏ Android, lưu SharedPreferences, chọn tệp sao lưu bằng trình chọn tệp hệ thống.
- `tools/prepare_assets.py`, `tools/extract_atlases.py`: trích xuất tài nguyên từ bản sao APK, chỉ đọc code C# để sinh schema atlas, không thực thi code game gốc.
- `tools/build.py`: biên dịch, đóng gói, zipalign và ký APK bằng khóa cục bộ riêng.
- `tests/engine.test.cjs`: kiểm tra logic với RNG xác định.
- `tools/device_test.cjs`: kiểm tra UI/tích hợp trên điện thoại bằng ADB và CDP, chỉ dùng bản debug; sao lưu và khôi phục trạng thái trước kiểm thử.

Các ảnh và nội dung tham chiếu có nguồn từ game gốc; dự án này được chuẩn bị cho yêu cầu dùng cá nhân, không phải một bộ tài nguyên mang giấy phép tự do hay một bản phát hành chính thức.

## Build và kiểm tra

Không cài thêm công cụ trong lần thực hiện này. Sử dụng Java 19, Node 24, Python 3.12, Android SDK đã có trên máy. Đường dẫn SDK/Java được khai báo ở đầu `tools/build.py`; điều chỉnh nếu chuyển máy.

```powershell
node --test .\dai-minh-chu-offline\tests\engine.test.cjs
& 'C:\Users\NamTien\AppData\Local\Programs\Python\Python312\python.exe' .\dai-minh-chu-offline\tools\build.py
```

APK xuất vào `../output/dai-minh-chu-offline-0.1.0.apk`. Build debug để kiểm thử bằng CDP: thêm `--debug`. Build thường tắt cờ debuggable.

Khóa cập nhật nằm tại `signing/offline.jks`; thông tin ký ở `signing/keystore-info.json`. Giữ hai tệp này trên máy để có thể ký bản cập nhật tương thích. Bản ZIP mã nguồn không kèm khóa ký hoặc tiến trình chơi cá nhân.

## Kết quả xác minh

10 bài kiểm tra logic đã qua: tính hợp lệ bản lưu; thể lực; tỷ lệ/chi phí chiêu mộ; trang bị không trùng; giới hạn đội hình; lưu trận đang đánh; nhận thưởng một lần; khóa ải; quà mỗi ngày; chiến đấu hữu hạn.

10 kiểm tra tích hợp đã qua trên Redmi Android 15: hiển thị/ảnh/font Việt; kích thước thẻ đội hình; bồi dưỡng; cường hóa/trang bị; chiêu mộ; quà một lần; chiến đấu/càn quét/mở ải; từ chối bản lưu hỏng; giữ tiến trình sau force-stop; nhập bản lưu hợp lệ. Không ghi nhận lỗi JavaScript trong kịch bản kiểm thử. Chức năng xuất JSON qua trình chọn tệp Android được kiểm tra thêm và đọc lại thành công từ Download.

Xem `REPORT.md` và `asset-report.json`. Kết quả kiểm tra thiết bị và ảnh được lưu cục bộ trong `verification/`; thư mục này có thể chứa bản lưu cá nhân nên không được commit lên GitHub. Nhật ký build và xác minh chữ ký nằm trong `build/` tại workspace, cũng được bỏ qua khi commit.
