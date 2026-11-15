# Android theo Material 3 — thiết kế ngắn

## Vì sao
Owner (2026-11-15): app Android "nhìn lỏ, phèn", không có hiệu ứng như iOS. Chọn hướng **B**: Android ra chất
Material 3 (Pixel/Samsung mới), không bắt chước kính iOS. iOS giữ nguyên.

## Mục tiêu / không làm
- Có: thanh tab Material 3 (viên thuốc chỉ mục đang chọn, gợn sóng), mặt nền tông màu + bóng đổ thay khối trắng
  có viền, gợn sóng khi chạm mọi nút, rung chuẩn Android, chuyển màn kiểu Android.
- Không: đổi bố cục, màu thương hiệu, nội dung màn; không thêm thư viện giao diện (paper, @expo/ui).
- Thất bại nếu: iOS hay web đổi hình/hỏng; tối màu (dark mode) trên Android bị lệch màu.

## Các cách đã cân nhắc
1. **Nhánh Android ở các chỗ dùng chung** (chọn): `Glass`, `tap()`, thanh tab, một `Pressable` chung, animation Stack.
   Ít đụng chạm, iOS không đổi.
2. react-native-paper cho Android: chuẩn hơn nhưng hai bản UI, nặng, sửa hai lần.
3. Jetpack Compose (`@expo/ui`): còn thử nghiệm, phải viết lại nhiều màn.

## Chi tiết
- `app/(tabs)/_layout.tsx`: trên Android đặt `indicatorColor` (tông nhạt của navy, theo theme), `rippleColor`,
  nền thanh tab `t.card`, `labelVisibilityMode="labeled"`.
- `src/theme.ts`: thêm token `t.tonal` (nền tông Material: xanh rất nhạt ở light, navy sẫm ở dark) và `t.ripple`.
- `src/chrome.tsx` `Glass`: nhánh Android = nền `t.tonal` (clear: trắng 16% giữ nguyên), `elevation` nhỏ, bỏ viền.
  `tap()`: Android gọi `Haptics.performAndroidHapticsAsync(Virtual_Key)`.
- Nút bấm: thêm `src/press.tsx` xuất `Pressable` bọc cái của RN; Android tự thêm `android_ripple` (màu `t.ripple`,
  `foreground: true`) và bỏ hiệu ứng thu nhỏ; iOS/web giữ nguyên. Đổi import ở `app/` và `src/` sang file này.
- `app/_layout.tsx`: Stack `animation` = `slide_from_right` trên iOS, `default` (Material) trên Android.
- Web: không đổi (nhánh Android không chạy trên web).

## Để người làm tự quyết
Mức elevation, độ đậm tông nền và màu ripple cụ thể; owner chỉnh lại sau khi xem APK thật.

## Kiểm tra
`npx tsc --noEmit`; export bundle iOS (không minify) để chắc nhánh platform không xoá biến dùng chung; build PWA
chụp một màn so với trước. Giao diện Android chỉ owner xem được trên máy thật.
