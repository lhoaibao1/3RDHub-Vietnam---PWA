# 3RDHub Vietnam (iOS + Android)

App Expo / React Native cho Publisher, một bộ code cho cả iOS và Android.

## Web PWA

Bản web cài được như app, cùng bộ code: xem `pwa/README.md` (build bằng `npm run build:pwa`, hoặc tải file zip ở trang Releases).

## Android: tải file APK

Link cố định, luôn là bản mới nhất:

```
https://github.com/lhoaibao1/3RDHub-Vietnam---PWA/releases/latest/download/3RDHub-Vietnam.apk
```

Mở link trên điện thoại Android → tải về → mở file → cho phép "Cài ứng dụng không rõ nguồn gốc" → Cài đặt. Có bản mới thì tải lại và cài đè (không mất đăng nhập). Mỗi lần đẩy code, GitHub Actions (`.github/workflows/android.yml`) tự build bản mới, khoảng 15–20 phút.

## Cho người dùng thử (Expo Go), link cố định, luôn là bản mới nhất

1. Cài **Expo Go** từ App Store, đăng nhập tài khoản Expo.
2. Quét `docs/expo-go-qr.png` bằng Camera, hoặc mở link này trên iPhone:

```
exp://u.expo.dev/0e659853-5785-40fb-b2c3-e27a66165604?channel-name=preview&runtime-version=1.0.0&platform=ios
```

Mỗi lần code được đẩy lên GitHub (`main` hoặc nhánh `claude/nifty-wozniak-y6il87`), GitHub Actions
(`.github/workflows/update.yml`) tự đăng bản mới lên kênh `preview`. Người dùng chỉ cần đóng hẳn và mở lại app,
**không đổi link, không cài lại**. Đừng đổi `version` trong `app.json` (đang là `1.0.0`, `runtimeVersion` bám theo
nó): đổi là link trên phải đổi `runtime-version` theo.

Bản đã cài qua TestFlight/App Store tự nạp bản mới mỗi khi mở hoặc quay lại app (`src/autoupdate.ts`).
