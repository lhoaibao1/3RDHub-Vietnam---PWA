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

## iOS qua Expo Go: hai kênh

| | Ai dùng | Khi nào có bản mới | Link (quét QR bằng Camera iPhone) |
|---|---|---|---|
| **production** | Người dùng | Chỉ khi chủ bấm đẩy prod | `docs/expo-go-qr-prod.png` |
| **preview** | Chủ thử trước | Mỗi lần code được đẩy lên GitHub | `docs/expo-go-qr.png` |

```
exp://u.expo.dev/0e659853-5785-40fb-b2c3-e27a66165604?channel-name=production&runtime-version=1.0.0&platform=ios
```

```
exp://u.expo.dev/0e659853-5785-40fb-b2c3-e27a66165604?channel-name=preview&runtime-version=1.0.0&platform=ios
```

Đẩy prod: GitHub → Actions → **Release iOS (production)** → Run workflow (chọn nhánh `claude/nifty-wozniak-y6il87`),
hoặc nhắn Claude "đẩy prod iOS". Người dùng đóng hẳn rồi mở lại app là có bản mới, **không đổi link, không cài lại**.
Đừng đổi `version` trong `app.json` (đang là `1.0.0`, `runtimeVersion` bám theo nó): đổi là hai link trên phải đổi
`runtime-version` theo.

Bản đã cài qua TestFlight/App Store tự nạp bản mới mỗi khi mở hoặc quay lại app (`src/autoupdate.ts`).
