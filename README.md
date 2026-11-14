# 3RDHub Vietnam (iOS)

App Expo / React Native cho Publisher. Android làm riêng trong `android-app/`.

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
