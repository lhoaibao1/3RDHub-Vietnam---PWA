# AGENTS.md — Android app "3RDHub Vietnam" (dành cho Publisher)

Bạn (Codex) làm **app Android native** trong thư mục `android-app/` này.
App iOS do người khác làm ở thư mục gốc của repo (Expo / React Native). **Hai bản tách hẳn nhau: không import, không copy code, không sửa file ngoài `android-app/`.** Chỉ dùng chung **API backend** và **bộ nhận diện** (logo/màu) ghi bên dưới. Giao diện tiếng Việt.

Chủ dự án nói tiếng Việt; commit message và comment ngắn gọn, tiếng Việt hoặc Anh đều được.

---

## 1. Mục tiêu

Một app cho **Publisher (affiliate)** của hệ thống 3RDHub Vietnam: đăng nhập, xem tổng quan hoa hồng, duyệt chiến dịch (có ảnh), đăng ký tham gia, lấy link giới thiệu, xem đơn hàng, ví/rút tiền, thông báo (có push), ảnh đại diện.

Bản iOS đã có đủ các tính năng này; bản Android phải **tương đương về tính năng** và có giao diện đẹp, đúng nhận diện (mục 3).

## 2. Công nghệ (bắt buộc, trừ khi có lý do rõ)

- Kotlin, **Jetpack Compose + Material 3**, Navigation Compose, `minSdk 26`, `targetSdk` mới nhất ổn định.
- Mạng: Retrofit + OkHttp + kotlinx.serialization (hoặc Moshi). Ảnh: Coil. Lưu token: `EncryptedSharedPreferences` / Keystore.
- Kiến trúc: MVVM (ViewModel + StateFlow), một `Repository` mỏng quanh API, Hilt hoặc DI thủ công.
- Push: Firebase Cloud Messaging (xem mục 7).
- `applicationId`: `vn.threerdhub.app`. Tên app: **3RDHub Vietnam**.
- Build bằng Gradle Kotlin DSL. Phải build được bằng `./gradlew assembleDebug` và `assembleRelease` trên Linux (GitHub Actions `ubuntu-latest`, JDK 17).
- Không dùng thư viện cross-platform (Flutter, RN, KMP UI). Chỉ Android native.

## 3. Nhận diện (đã chốt)

Logo nằm ở `android-app/design/` (đã copy sẵn, dùng trực tiếp):

| File | Dùng cho |
|---|---|
| `logo.png` | Logo ngang **"3RDHub Vietnam" + "Powered by"** (navy + cam, tỉ lệ ~5,3:1). Đăng nhập, splash |
| `mark.png` | Biểu tượng robot (đầu robot, navy) dùng làm icon nhỏ |
| `icon.png` | Icon app 1024×1024 (đầu robot navy trên nền trắng) |
| `android-icon-foreground.png` / `-background.png` / `-monochrome.png` | Adaptive icon (1024×1024, vùng an toàn đã chừa) |
| `logo-white.png` | Logo chữ trắng tách nền, dùng trên nền navy |
| `splash-icon.png` | Ảnh cho Splash Screen API (logo, nền trong suốt) |

> **Logo trong app là file `design/logo.png` (do chủ gửi), dùng nó cho splash, đăng nhập và mọi chỗ cần logo. KHÔNG lấy logo, icon hay ảnh splash từ API** (`/api/v1/brand`, `/api/v1/appearance`): ảnh trên server hiện là hình cũ (chú robot mascot) và sẽ đè lên logo đúng. Muốn đổi logo thì thay file trong `design/`. Icon launcher và splash hệ điều hành cũng lấy từ `design/`. Tên app cố định "3RDHub Vietnam".

Màu (Material 3 `ColorScheme`, chỉ light theme):

```
navy      #0B2A6F   primary
navy2     #1B3F94   gradient cuối / primaryContainer đậm
navySoft  #E8EDF9   nền chip, icon
orange    #FF6A2B   accent (số tiền hoa hồng, CTA phụ, cột cuối biểu đồ)
orangeSoft #FFEDE4
bg        #F4F6FB   nền màn hình
card      #FFFFFF   thẻ, bo góc 16dp, bóng nhẹ
text      #0F1B3D
sub       #6B7690
line      #E4E8F1
ok #15803D (nền #E3F5E8)  warn #B45309 (nền #FDF0DC)  bad #B91C1C (nền #FBE6E6)
```

Phong cách: thẻ trắng bo 16dp, "hero" gradient navy→navy2 bo góc dưới 28dp ở Trang chủ/Tôi, chip bo tròn, số tiền chữ đậm. Sạch, nhiều khoảng trắng. Tiền định dạng `1.234.567đ` (`vi-VN`, không phần thập phân).

**Màn hình mở app (splash)**: Splash Screen API (`androidx.core:core-splashscreen`) hiện logo; sau đó một màn in-app: nền trắng, logo hiện dần + scale nhẹ, dòng "Dành cho Publisher" màu cam ở đáy; giữ tối thiểu ~1,6 s và chỉ biến mất khi đã biết trạng thái đăng nhập, rồi mờ dần ~350 ms.

## 4. Màn hình và tính năng

Bottom navigation 5 tab: **Trang chủ · Chiến dịch · Đơn hàng · Ví · Tôi** (Tôi có badge số thông báo chưa đọc). Chưa đăng nhập → màn Đăng nhập.

1. **Đăng nhập**: logo, ô email + mật khẩu (nút hiện/ẩn), nút Đăng nhập, link "Quên mật khẩu" (mở trình duyệt `{API}/forgot-password`), "Đăng ký" (mở `{API}/signup`). Hỗ trợ **2FA**: nếu server trả `two_factor`, hiện ô nhập mã rồi gọi bước 2FA.
2. **Trang chủ**: hero gradient có avatar + lời chào theo giờ + chuông thông báo (badge); chip khoảng thời gian *Hôm nay / 7 ngày / 30 ngày*; số **hoa hồng** lớn kèm % so với kỳ trước; biểu đồ cột hoa hồng theo ngày (tự vẽ bằng Canvas, cột cuối màu cam); lưới 4 ô: Click, Đơn, Đơn đã duyệt, Doanh số; hàng lối tắt (Link của tôi, Chiến dịch, Rút tiền); **carousel banner** (chạm → mở chiến dịch hoặc link ngoài); **Chiến dịch nổi bật** (cuộn ngang, ảnh + tên + danh mục); **Đơn gần đây** (5 đơn). Kéo để làm mới.
3. **Chiến dịch**: ô tìm kiếm; chip lọc *Tất cả / Đã tham gia / từng danh mục*; danh sách thẻ **có ảnh banner** (150dp), tên, "Đến X%" (mức hoa hồng cao nhất), tag (Hot, Nổi bật, Hoa hồng cao, Mới, Lên đơn nhanh, Duyệt nhanh, Trả nhanh), badge "Đã tham gia", số publisher.
4. **Chi tiết chiến dịch**: gallery ảnh vuốt ngang (chấm trang), tên, chip danh mục/chu kỳ đối soát/lịch trả, **bảng hoa hồng**, khối link giới thiệu (Sao chép / Chia sẻ), các mục có thể xổ ra: Giới thiệu, Chính sách hoa hồng, Điều kiện, Cookie, Lý do hủy đơn, Quy định traffic. Thanh dưới cố định: *Đăng ký tham gia* (chưa tham gia) / *Đang chờ duyệt* / *Lấy link giới thiệu* hoặc *Tạo link mới* (đã duyệt).
5. **Đơn hàng**: lấy **toàn bộ** đơn bằng `GET /api/v1/conversions` (KHÔNG kèm `limit`, vì `limit` bị cắt ở 50); tên chiến dịch tự ghép từ `/campaigns` theo `campaign_id`, tên thành viên từ `/publishers` theo `publisher_id`. Có: ô tìm (mã đơn / tên chiến dịch); lọc **thời gian** (Mọi thời gian / Hôm nay / 7 ngày / 30 ngày (mặc định) / Tháng này / Tháng trước), **chiến dịch**, **thành viên** (chỉ khi có quyền `publishers.read`), **sắp xếp** (mới nhất, cũ nhất, hoa hồng cao, doanh số cao); chip trạng thái kèm **số đơn từng trạng thái**; 3 ô tổng: số đơn, tổng hoa hồng, hoa hồng đã duyệt (số dài viết gọn "10,57 tr"); nút "Xóa lọc"; danh sách tải dần 30 đơn mỗi lần. Thẻ đơn: vạch màu trạng thái, tên chiến dịch, mã đơn, thời gian, tên thành viên (nếu có quyền), hoa hồng, doanh số. **Chạm → Chi tiết đơn.**
5b. **Chi tiết đơn**: trạng thái, hoa hồng lớn, doanh số; mã đơn (chạm để sao chép), chiến dịch (chạm → chi tiết chiến dịch), thành viên (chạm → chi tiết thành viên), ngày tạo / duyệt (`approved_on`) / cập nhật; **Lịch sử xử lý** từ `GET /api/v1/conversions/{id}/history` → mảng `{at, source:"hub"|"partner", status?, biz_status?, partner_status?, sale_amount?}` vẽ dạng dòng thời gian (mới nhất trên cùng). 403/404 thì hiện "chưa xem được lịch sử", không lỗi cả màn.
5c. **Thành viên** (chỉ hiện khi `GET /api/v1/tenant/context` → `permissions["publishers.read"]` là true, tức TeamLead/AM/HOD/admin; thành viên thường gọi sẽ bị 403): `GET /api/v1/publishers` → `[{id, name, email, phone, status, avatar_url (cần Bearer), rd_code, uid_code, role, role_code, team, region, channel, kyc_status, login_status, manager_name, team_lead_name, am_name, hod_name, created_at, bank_*}]`. Màn danh sách: tìm theo tên / mã RD / email / SĐT; lọc vai trò, nhóm, eKYC (đã / chưa); sắp xếp tên, mới tham gia, hoa hồng cao, nhiều đơn; mỗi dòng có avatar, mã RD · vai trò · nhóm, nhãn eKYC, tổng hoa hồng và số đơn (tính từ danh sách đơn theo `publisher_id`). Chi tiết thành viên: thông tin, gọi/mail, tuyến quản lý (TeamLead, AM, HOD, nhóm, khu vực), số đơn / đơn duyệt / hoa hồng, 10 đơn gần nhất (chạm → chi tiết đơn). Lối vào ở Trang chủ (lối tắt) và tab Tôi.
5d. **Chiến dịch (danh sách)** phải trông như một sàn ưu đãi, không phải danh sách chữ: thẻ ảnh lớn (tỉ lệ 2:1) có lớp tối dần ở dưới, **tên và ngành hàng đè lên ảnh**, nhãn nổi bật ở góc trái, trạng thái tham gia ở góc phải (lấy từ `GET /api/v1/campaigns-membership` → `{campaign_id: "approved"|"pending"|…}`), chân thẻ có "Hoa hồng đến" + số tiền/% màu cam, số publisher, điểm đánh giá, nút "Tham gia" / "Lấy link". Tab phân đoạn: Tất cả / Của tôi / Nổi bật / Mới; lọc ngành hàng; sắp xếp (đề xuất theo `position`, mới nhất, hoa hồng cao, nhiều người chạy).
- **Điều hướng**: mọi màn phụ (chi tiết chiến dịch, đơn, thành viên, thông báo, link, hồ sơ) mở chồng lên và **luôn có thanh tiêu đề với nút quay lại**, nội dung không được đè lên thanh trạng thái.
6. **Ví**: hero số dư có thể rút + Chờ về ví / Đã rút / Tổng ghi nhận; thẻ **Rút tiền** (nhập số tiền, xác nhận bằng dialog); lịch sử rút kèm trạng thái; hoa hồng đã vào ví. Chặn rút + hiện lý do nếu chưa có tài khoản ngân hàng / chưa KYC / thiếu thông tin.
7. **Tôi**: avatar lớn, tên, email, vai trò, **Mã Publisher** (sao chép), menu: Thông tin cá nhân, Link giới thiệu của tôi, Thông báo, Mở bản web, Đăng xuất (có xác nhận), hiện phiên bản app.
8. **Thông tin cá nhân**: **đổi / xóa ảnh đại diện** (Photo Picker, crop vuông, upload), hiển thị họ tên, email, SĐT, địa chỉ, MST, ngân hàng, STK, chủ TK, trạng thái hợp đồng (chỉ xem; sửa trên web).
9. **Link của tôi**: danh sách link tracking: tên, ngày tạo, số click, bật/tắt, URL, Sao chép / Chia sẻ / Bật-Tắt.
10. **Thông báo**: tab lọc *Tất cả / Đơn hàng / Ví / Thư / Hệ thống*, chưa đọc có viền cam, chạm để đánh dấu đã đọc và điều hướng theo `link`, nút "Đọc hết".

Mọi danh sách: kéo để làm mới, trạng thái rỗng (biểu tượng đơn giản + dòng chữ, không dùng hình mascot), trạng thái lỗi có nút Thử lại, không treo giao diện khi mất mạng (thông báo "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.").


### 4b. Bổ sung theo góp ý của chủ (bắt buộc)

- **Trạng thái thành viên** (`/publishers` → `status`): `approved` = bình thường (KHÔNG hiện nhãn), `pending` = "Chờ duyệt" (cam), còn lại (`disabled`…) = "Ngừng hoạt động" (đỏ).
- **Trang chủ**: logo (`design/logo.png`) trên nền trắng bo góc ở góc trái trên cùng của phần đầu màu navy, chuông thông báo bên phải; lời chào và avatar ở dòng dưới.
- **Đăng nhập**: nền nửa trên gradient navy có vòng tròn trang trí, thẻ trắng nổi (logo, email, mật khẩu, quên mật khẩu, nút đăng nhập), đường kẻ "hoặc", nút **"Tiếp tục với Google" / "Tiếp tục với Microsoft"** (chỉ hiện nhà cung cấp đang bật: `GET /api/v1/auth/oauth/providers` → `{google, microsoft, zalo}`), dòng "Chưa có tài khoản? Đăng ký Publisher". Hiệu ứng thẻ trượt lên khi mở.
- **Đăng nhập Google/Microsoft không cần sửa backend** (dùng luồng của Zalo Mini App): tạo mã ngẫu nhiên an toàn 64 ký tự `[A-Za-z0-9_-]`, mở Custom Tab tới `{API}/api/v1/auth/oauth/{google|microsoft}/start?mini=<mã>`, đồng thời mỗi 1,5 giây gọi `GET /api/v1/auth/oauth/mini/<mã>`: 404 = đang chờ; `{"data":{"token":"…"}}` = xong (lưu token, gọi `/auth/me`, đóng Custom Tab); `{"data":{"error":"no_account"}}` = "Tài khoản này chưa gắn với thành viên 3RDHub Vietnam…". Hết 10 phút hoặc người dùng đóng tab quá 5 giây thì dừng.
- **Tab Tôi**: phần đầu gradient có vòng trang trí, avatar viền trắng + nút máy ảnh (mở Thông tin cá nhân), tên, email, nhãn vai trò (cam) và "Mã RDxxxx" (chạm để sao chép); thẻ nổi đè lên mép dưới với 3 số: Số dư ví (`/wallet` → `balance.available`), Hoa hồng tháng này, Đơn tháng này (tính từ danh sách đơn); menu chia nhóm **Tài khoản / Kinh doanh / Ứng dụng**, mỗi dòng có icon màu riêng; nút Đăng xuất nền đỏ nhạt; cuối trang logo + phiên bản.
- **Chiến dịch**: lưới **2 thẻ mỗi hàng**: ảnh (tỉ lệ ~4:3) có nhãn nổi bật góc trái, dấu tick xanh (đã tham gia) / đồng hồ cam (chờ duyệt) góc phải, nhãn "Tạm dừng" nếu không active; dưới ảnh: ngành hàng (cam), tên 2 dòng, "Hoa hồng đến" + số tiền/% cam, số publisher, điểm sao.
- **Phân trang** mọi danh sách (chiến dịch 20, đơn 30, thành viên 25, thông báo 20, link 20 mỗi lần): tự tải thêm khi cuộn gần cuối + nút "Xem thêm · x/y", hết thì "Đã hiện hết N …". Đổi bộ lọc là về trang đầu.
- **Thanh tiêu đề gọn**: tab chính tiêu đề căn trái cỡ lớn, cao vừa đủ; màn phụ chỉ có mũi tên quay lại (không chữ) + tiêu đề nhỏ 16sp.
- **Hiệu ứng**: chuyển màn trượt từ phải, chuyển tab mờ/trượt nhẹ; màn mở app có logo "thở" nhẹ + thanh chạy màu cam; khi đang tải hiện **khung xương nhấp nháy** (không dùng vòng xoay trống); khi mạng chậm (>350 ms) hiện **thanh mảnh màu cam chạy ở mép trên**.


### 4c. Bổ sung đợt 3 (bắt buộc)

- **Logo trên nền tối**: dùng `design/logo-white.png` (chữ trắng, giữ màu cam, nền trong suốt) ở phần đầu màu navy của Trang chủ, KHÔNG đặt trong ô trắng.
- **Đăng ký trong app** (không mở web): họ tên, email, SĐT, mật khẩu, nhập lại, mã giới thiệu (tuỳ chọn), ô đồng ý Điều khoản + Chính sách → `POST /api/v1/auth/signup` `{email, password, display_name, phone, referral_code}` → 202 → màn "Kiểm tra email" (người dùng bấm link xác nhận trong mail). Lỗi: `403 signup_disabled`, 400 với message tiếng Anh (`email is invalid`, `name is required…`, `password must be 8 to 200 characters`, `phone number is invalid`, `referral code not found`) → dịch sang tiếng Việt; 429 = thử lại sau.
- **Quên mật khẩu trong app**: `POST /api/v1/auth/password/forgot` `{email}` → màn "Đã gửi email"; `403 reset_disabled` = chưa bật.
- **Đổi mật khẩu**: `POST /api/v1/tenant/account/password` `{current_password, new_password}`.
- **Điều khoản / Chính sách**: mở `{API}/terms`, `{API}/privacy` trong Custom Tab; có link ở màn đăng nhập (dòng nhỏ cuối), đăng ký (ô đồng ý) và Cài đặt.
- **Đăng nhập bằng vân tay / khuôn mặt** (BiometricPrompt): sau lần đăng nhập mật khẩu thành công hỏi "Đăng nhập nhanh bằng vân tay?"; bật thì lưu email + mật khẩu bằng EncryptedSharedPreferences/Keystore (khoá yêu cầu xác thực sinh trắc); màn đăng nhập có nút "Đăng nhập bằng vân tay" và tự hỏi khi mở. Có công tắc trong Cài đặt (bật = nhập mật khẩu + xác nhận vân tay). Đổi mật khẩu thì cập nhật bản lưu. (Passkey WebAuthn thật để sau.)
- **Cài đặt** (bánh răng ở góc phải phần đầu tab Tôi + mục "Cài đặt" trong menu): Bảo mật (vân tay, đổi mật khẩu), Thông báo (trạng thái quyền, mở cài đặt hệ thống, gửi thông báo thử trên máy), Hỗ trợ & pháp lý (nhóm Zalo hỗ trợ `https://zalo.me/g/thba8hjdrcuut4hl6rue`, Điều khoản, Chính sách), Ứng dụng (phiên bản, xoá bộ nhớ đệm), Đăng xuất.
- **Thanh tiêu đề**: màn phụ dùng nút quay lại tròn hiệu ứng kính/mờ bên trái + tiêu đề 17sp ở giữa; chi tiết chiến dịch thì nút quay lại và nút chia sẻ **nổi trên ảnh**. Tab chính dùng tiêu đề lớn 32sp căn trái (kiểu iOS).
- **Phân trang có số** (thay "Xem thêm"): "‹ 1 2 3 … 8 ›" + dòng "21–40 trên 160 đơn · Trang 2/8", 20 mục mỗi trang, đổi trang thì cuộn lên đầu.
- **Đơn hàng**: mỗi dòng có **ảnh chiến dịch** (thumb_url) 52dp bo góc, chấm màu trạng thái ở góc ảnh.
- **Thông báo khi app đang mở**: hỏi số chưa đọc mỗi 30 giây; tăng lên thì hiện thông báo hệ thống cho các tin mới.
- **Rung phản hồi nhẹ** khi chạm nút, tab, thẻ.


### 4d. Bổ sung đợt 4 (bắt buộc, liên quan tiền nên làm đúng từng chữ)

- **Đơn hàng trình bày như bản web**: số to là **Giá trị đơn** (`sale_amount`, tiền giải ngân), **Hoa hồng** (`publisher_commission`) nhỏ hơn, màu cam, đặt bên phải. Mã đơn = `partner_order_id` nếu có, không thì `external_order_id`. Có nhãn **Sản phẩm** = `fields.product` (NTB / Topup / Xsell…; `fields` là các trường đối tác, server đã che theo quyền). Người có quyền `publishers.read` thấy thêm: tên thành viên · nhóm (`team`) · khu vực (`region`), và dòng "TL: … · AM: …" (lấy từ `/publishers` theo `publisher_id`). Lọc thêm theo **Nhóm**. Không dùng emoji hay icon trang trí trong dòng đơn.
- **Chi tiết đơn**: Giá trị đơn (to) → Hoa hồng → "Hoa hồng TL" (`tl_commission`) và "Hoa hồng AM" (`am_commission`) **chỉ khi server trả về trường đó**; Mã đơn, Chiến dịch, Sản phẩm, Khách hàng (`fields.customer_name` · `fields.customer_phone` nếu có), Ngày phát sinh, Ngày duyệt / giải ngân (`approved_on`), Cập nhật; khối Thành viên: tên, mã RD, nhóm, khu vực, TeamLead, AM.
- **Cộng hoa hồng**: mọi tổng hoa hồng do app tự cộng (ô tổng ở Đơn hàng, "HH tháng này" ở tab Tôi, tổng theo thành viên) **bỏ đơn `rejected` và `cancelled`**, và ghi chú "Hoa hồng cộng theo từng đơn… Số tiền thực nhận xem ở Ví". Không tự tính hay suy ra hoa hồng theo cách nào khác; số ở Trang chủ lấy nguyên từ `/dashboard/overview`. Ba ô tổng ở Đơn hàng: Số đơn · Giá trị đơn · Hoa hồng.
- **Sinh trắc học**: KHÔNG tự bật hộp thoại vân tay khi mở màn đăng nhập (kể cả sau khi đăng xuất); chỉ hỏi khi người dùng bấm nút "Đăng nhập bằng vân tay".
- **Font**: font hệ thống (Android: Roboto/mặc định máy), không nhúng font riêng; không dùng độ đậm 900 (tối đa 800). Bỏ icon trang trí ở 4 ô số liệu Trang chủ.

## 5. API — hợp đồng (đã đọc từ source backend, không đoán)

**Base URL**: cấu hình bằng `BuildConfig.API_URL`. Mặc định **UAT** `https://uat-app.3rdvn.io.vn`. Prod là `https://app.3rdvn.io.vn` (dữ liệu và tiền THẬT).
Tạo `buildConfigField` theo flavor/`local.properties` để đổi được mà không sửa code.

**Quy tắc chung**
- Mọi response thành công: `{"data": ...}`. Lỗi: `{"error": {"code": "...", "message": "..."}}`.
- Auth dùng **Bearer token**, không dùng cookie. Mọi request gửi `Authorization: Bearer <token>`.
- **Quan trọng:** token chỉ có trong body login khi gửi thêm header **`X-Client`**. Prod hiện chỉ nhận giá trị **`zalo`**; backend đã được bổ sung giá trị **`mobile`** (nhánh `claude/mobile-push-backend` của repo hub, chưa lên Prod). Hãy gửi **`X-Client: zalo`** trên mọi request cho tới khi chủ báo Prod đã nhận `mobile`, rồi đổi sang `mobile` (nên để hằng số cấu hình được).
- HTTP 401 trên endpoint không phải `/api/v1/auth/*` → xóa token, về màn đăng nhập.
- Tenant tự nhận từ tài khoản khi chỉ thuộc **một** đơn vị (trường hợp hiện tại). Nếu `GET /api/v1/auth/me` trả `memberships` có **nhiều** đơn vị đang hoạt động thì phải gửi header `X-Tenant-ID: <tenant_id>` trên mọi request, không thì lỗi `400 tenant_required`.
- **Body JSON phải khớp đúng tên trường**: server từ chối trường thừa (`400 invalid json`). Chỉ gửi đúng các trường trong bảng.
- Lỗi đáng xử lý riêng: `401 session_expired` (hết phiên, về màn đăng nhập), `429` (đăng nhập quá nhiều lần: hiện thông báo, đừng tự thử lại), `403 forbidden` (thiếu quyền: ẩn màn tương ứng; dùng `GET /api/v1/tenant/context` → `permissions`), `403 email_unverified`.
- Tiền là số nguyên đồng; thời gian là ISO 8601 UTC. Không có CORS vì app native không dùng trình duyệt.
- Ảnh chiến dịch `/api/v1/campaign-art/<tên>` là **public** (không cần token). Ảnh **avatar** `/api/v1/avatars/<userId>` **bắt buộc có Bearer** (cấu hình Coil `ImageRequest` thêm header, hoặc OkHttp interceptor cho riêng host này). URL tương đối thì nối với base URL.

**Xác thực**
| | |
|---|---|
| `POST /api/v1/auth/login` `{email,password}` | → `data: {user:{id,email,display_name,status,avatar_url}, token}` hoặc `data:{two_factor:true, ticket}` |
| `POST /api/v1/auth/login/2fa` `{ticket, code}` | → như login (có `token`) |
| `GET /api/v1/auth/me` | → `data:{user:{...}}` (kiểm tra token còn sống khi mở app) |
| `POST /api/v1/auth/logout` | thu hồi token |

**Dữ liệu**
| Mục đích | Endpoint | Ghi chú dạng dữ liệu |
|---|---|---|
| Vai trò, mã publisher | `GET /api/v1/tenant/context` | `data.role_name`, `data.me.rd_code`, `data.can_refer` |
| Tổng quan | `GET /api/v1/dashboard/overview?from=YYYY-MM-DD&to=YYYY-MM-DD` | `data.totals` và `data.previous` đều có `clicks, orders, approved, commission, sale, approval_rate` |
| Biểu đồ | `GET /api/v1/dashboard/series?from&to&metric=commission&group=none` | `data.buckets[]`, `data.series[0].values[]` |
| Banner trang chủ | `GET /api/v1/catalog-banners` | `data: [{id, image_url, link_url}]` |
| Danh sách chiến dịch | `GET /api/v1/campaigns` | mỗi phần tử: `id, name, status, participants, rating, offer:{banner_url, thumb_url, category, badge, highlights[], commission_rates[]}`. Bỏ `status=="archived"` |
| Chi tiết chiến dịch | `GET /api/v1/campaigns/{id}` | thêm `offer.banners:[{url,thumb}]`, `offer.sections:{intro, commission_policy, conditions, cookies, cancel_reasons, traffic_rules}` (có thể là HTML → chuyển sang chữ thuần), `offer.settlement_cycle`, `offer.payment_schedule`, `offer.labels:[{text,url}]` |
| Đã tham gia | `GET /api/v1/campaigns-joined` | `data: [campaignId]` |
| Trạng thái tham gia | `GET /api/v1/campaigns/{id}/join` | `data:{status, eligibility, open}`; `status`: `approved` / `pending` / khác = chưa đăng ký |
| Đăng ký tham gia | `POST /api/v1/campaigns/{id}/join` body `{}` | `data.status` = `approved` hoặc `pending` |
| Link của tôi | `GET /api/v1/tracking-links` | `data:[{id, code, name, url, campaign_id, status("active"/"inactive"), created_at}]` |
| Tạo link | `POST /api/v1/tracking-links` `{campaign_id}` | `data.url` |
| Bật/tắt link | `PUT /api/v1/tracking-links/{id}` `{status}` | |
| Click | `GET /api/v1/clicks` | `data:[{link_id,...}]`, đếm theo `link_id` |
| Đơn hàng | `GET /api/v1/conversions?limit=50` | `?limit` **tối đa 50** (đơn mới nhất) và chỉ khi có `limit` mới có `campaign_name`; không có phân trang. Trường: `id, campaign_name, external_order_id, status, biz_status, created_at, publisher_commission, sale_amount` |
| Trạng thái đơn của đơn vị | `GET /api/v1/tenant/order-statuses` | `data.statuses:[{key,label,base,color}]`; `biz_status` của đơn khớp `key` → dùng `label` và `color` |
| Ví | `GET /api/v1/wallet` | `member, balance:{credited,held,pending,withdrawn,available}, bank:{bank_name,bank_account_number,bank_account_name,ready,kyc_done}, min_amount, credits[], withdrawals[]` |
| Rút tiền | `POST /api/v1/wallet/withdraw` `{amount}` (số nguyên VND) | |
| Hồ sơ | `GET /api/v1/tenant/account` | `email, display_name, phone, bank_*, address, tax_code, contract_signed…` |
| Đổi avatar | `POST /api/v1/tenant/account/avatar` multipart, field **`file`** (≤ 5 MB) | → `data.avatar_url` |
| Xóa avatar | `DELETE /api/v1/tenant/account/avatar` | |
| Thông báo | `GET /api/v1/tenant/notifications` | `data:[{id,title,body,link,kind,created_at,read_at}]` |
| Số chưa đọc | `GET /api/v1/tenant/notifications/unread` | `data.count` (poll 60 s) |
| Đọc | `POST /api/v1/tenant/notifications/{id}/read` · `POST /api/v1/tenant/notifications/read-all` | |

**Quy ước dữ liệu**
- `offer.commission_rates[]`: `{label, channel, kind:"percent"|"fixed", rate_bps, amount_minor, note}`. `rate_bps` là **phần trăm × 100** (245 = 2,45%). `amount_minor` là **đồng** (không chia 100). Hiển thị percent: `rate_bps/100` + "%", fixed: tiền VND.
- Màu trạng thái đơn (`color`): `blue #2563eb, sky #0284c7, teal #0d9488, green #16a34a, amber #d97706, orange #ea580c, red #dc2626, pink #db2777, violet #7c3aed, indigo #4f46e5, gray #6b7280`. Nếu `biz_status` rỗng thì dùng `status` gốc: `pending` Chờ xử lý, `hold` Tạm giữ, `approved` Đã duyệt, `paid` Đã trả, `rejected` Từ chối, `cancelled` Đã hủy.
- Phân loại thông báo theo `kind`: bắt đầu `order_`, hoặc `mgr_order_new`, `mgr_lost_order` → Đơn hàng; `wallet_credited`, `payout_created`, bắt đầu `withdraw_` → Ví; bắt đầu `contract_`, `join_`, `kyc_`, hoặc `comment_reply` → Thư; còn lại → Hệ thống. Điều hướng theo `link`: chứa `/campaigns/<id>` → chi tiết chiến dịch; chứa `wallet|payment|withdraw` → tab Ví; chứa `order|conversion` → tab Đơn hàng.
- Trạng thái rút: `pending` Chờ chuyển, `paid` Đã chuyển, `rejected` Bị từ chối, `cancelled` Đã hủy.
- Luôn dùng `limit`/phân trang nếu thêm sau; đừng tải vô hạn.

## 6. Quy tắc an toàn khi test

- **Mặc định trỏ UAT.** UAT là bản sao dữ liệu thật nhưng **không gửi mail/push/thanh toán** (đăng ký và quên mật khẩu bị đóng trên UAT).
- **Không bấm "Rút tiền" trên Prod** khi test. Đó là tiền thật.
- Không commit token, mật khẩu, keystore, `google-services.json` thật nếu là bí mật của chủ; hướng dẫn chủ tự thêm (xem mục 7, 8).
- Không sửa backend, không sửa gì ngoài `android-app/`.

## 7. Push notification (cần chốt với chủ dự án)

Web Push (VAPID, `POST /api/v1/tenant/push/subscribe`) chỉ dành cho trình duyệt — **Android native không dùng**. Backend cho push native **đã được viết** trên nhánh `claude/mobile-push-backend` của repo hub (chưa deploy; chủ sẽ đưa lên UAT/Prod theo quy trình của họ). Việc của bạn:

1. Tích hợp **FCM** ở phía app: kênh thông báo `default` (importance cao, màu `#0B2A6F`), xin quyền `POST_NOTIFICATIONS` (Android 13+), lấy token, xử lý `onNewToken`, hiển thị khi app đang mở, chạm vào thông báo → mở màn Thông báo.
2. Gọi endpoint đăng ký token (đã chốt, khớp backend; hiện trên Prod trả 404 thì bỏ qua êm, không crash, thử lại lần mở app sau):
   - `POST /api/v1/tenant/push/device` body đúng 3 trường `{"provider":"fcm","token":"<fcm token>","platform":"android"}` (token FCM 100–4096 ký tự `A-Za-z0-9:_-.`; thêm `"test":true` nếu muốn máy nhận một thông báo chào) → `{"data":{"ok":true,"provider":"fcm","sent":0}}`.
   - `POST /api/v1/tenant/push/device/unsubscribe` body `{"token":"..."}` khi đăng xuất.
   - Thông báo FCM tới app có `notification{title,body}` và `data{link,id,tag,unread}` (giá trị đều là chuỗi), kênh `default`. Chạm vào → mở màn Thông báo / điều hướng theo `data.link` (quy tắc như mục 5).
   - Backend chỉ gửi khi chủ đặt file service account Firebase (`FCM_SERVICE_ACCOUNT_FILE`); UAT không gửi gì.
3. Ghi trong README `android-app/` đúng các bước chủ cần làm: tạo project Firebase, tải `google-services.json` đặt vào `android-app/app/`, thêm khóa server cho backend.
4. App phải **chạy bình thường khi chưa có `google-services.json`** (build debug không lỗi): bọc khởi tạo FCM, hoặc dùng plugin google-services có điều kiện.

Đến khi backend xong, badge số chưa đọc và polling 60 s (`/notifications/unread`) vẫn là cơ chế dự phòng khi app đang mở.

## 8. Build, CI, phát hành

- Cấu trúc: project Gradle gốc là `android-app/` (module `app`).
- `android-app/README.md`: cách chạy (Android Studio hoặc `./gradlew assembleDebug`), cách đổi `API_URL`, cách thêm `google-services.json`, cách tạo keystore và ký release.
- Thêm workflow **`.github/workflows/android.yml`**: chạy khi đổi file trong `android-app/**` (và `workflow_dispatch`), JDK 17, `./gradlew assembleRelease` (ký bằng debug key nếu chưa có keystore trong secrets), upload APK làm artifact. **Chỉ tạo file này; không đụng các workflow khác** (`update.yml`, `build.yml` là của iOS).
- Release ký thật: đọc keystore từ GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`); nếu thiếu thì ký debug.

## 9. Định nghĩa "xong"

- [ ] `./gradlew assembleDebug` và `assembleRelease` chạy sạch trên Linux.
- [ ] Đăng nhập (có 2FA), tự đăng nhập lại khi mở app, đăng xuất, xử lý 401.
- [ ] Đủ 10 màn ở mục 4, **chiến dịch có ảnh**, avatar hiển thị (có Bearer) và đổi/xóa được.
- [ ] Splash + màn mở app có logo đúng như mục 3; icon launcher (adaptive + monochrome) đúng.
- [ ] Định dạng tiền, ngày giờ vi-VN; trạng thái rỗng/lỗi/mất mạng không crash.
- [ ] Tích hợp FCM an toàn khi thiếu `google-services.json`; gọi đăng ký token theo mục 7.
- [ ] Unit test cho: format tiền, `rateText`, phân loại thông báo, chuyển HTML→chữ, map trạng thái đơn.
- [ ] `android-app/README.md` + workflow `android.yml`.
- [ ] Commit nhỏ, rõ ràng, trên nhánh được giao. Không tự tạo Pull Request trừ khi chủ yêu cầu.

## 10. Tham chiếu hành vi (chỉ để đối chiếu, KHÔNG copy)

App iOS cùng tính năng nằm ở `app/` và `src/` ở thư mục gốc repo (TypeScript). Có thể **đọc** để hiểu hành vi và cách gọi API (ví dụ `src/api.ts`, `src/format.ts`, `app/(tabs)/*.tsx`, `app/campaign/[id].tsx`), nhưng phải tự viết lại bằng Kotlin, không đưa vào `android-app/`.
