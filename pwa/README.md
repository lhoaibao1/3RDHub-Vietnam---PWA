# Bản web PWA của app 3RDHub Vietnam

Cùng một bộ code với app iOS / Android (thư mục `app/` và `src/`), xuất ra web tĩnh và cài được lên màn hình chính
như một PWA. Mục đích: thay bản PWA điện thoại hiện tại (đang chung code Nuxt với bản PC) bằng giao diện mới này.

## Lấy bản build

- **Tự build** (trong VSCode / trên VPS, cần Node 20+):

  ```bash
  npm install
  npm run build:pwa        # ra thư mục dist-pwa/
  ```

- **Hoặc tải file zip** GitHub đã build sẵn sau mỗi lần đẩy code: trang
  [Releases](https://github.com/lhoaibao1/3RDHub-Vietnam---PWA/releases), bản có tên "PWA bản N", file
  `3RDHub-Vietnam-pwa.zip`. (Bản "latest" của trang Releases vẫn là file APK Android.)

`dist-pwa/` là web tĩnh hoàn toàn: `index.html`, thư mục `_expo/` và `assets/`, `manifest.webmanifest`, `sw.js`, icon.

## Điều kiện bắt buộc khi đặt lên server

1. **Phải cùng tên miền với API.** App gọi `/api/v1/...` bằng đường dẫn tương đối, vì backend không mở CORS cho tên
   miền khác (xem `backend/server/zalo_cors.go` ở repo hub). Tức là đặt sau cùng nginx đang phục vụ
   `app.3rdvn.io.vn` (hoặc `uat-app.3rdvn.io.vn` để thử trước), giữ nguyên khối `location /api/`.
   Muốn đặt ở tên miền khác thì build với `EXPO_PUBLIC_API_URL=https://app.3rdvn.io.vn npm run build:pwa` **và** mở
   CORS cho tên miền đó ở backend.
2. **Đặt ở gốc tên miền** (`/`), không đặt trong thư mục con: đường dẫn file trong `index.html` và `manifest` đều
   bắt đầu bằng `/`.
3. **Mọi đường dẫn không phải file phải trả về `index.html`** (app tự điều hướng: `/orders`, `/campaign/<id>`…).

**Nếu nginx chia điện thoại / máy tính (như hiện tại) thì bắt buộc dùng [`pwa/nginx.conf`](nginx.conf)**: file JS, font,
manifest, service worker của PWA phải trả cho mọi thiết bị. Không làm vậy thì máy tính / bot xin `/_expo/...js` sẽ
nhận trang HTML của Nuxt, Cloudflare lưu cái HTML đó 4 tiếng và trả cho cả điện thoại → PWA trắng màn hoặc màn mở
được màn không (lỗi gặp ngày 24/11/2026). Đổi xong thì purge cache Cloudflare.

Ví dụ nginx (thay cho upstream :3422 của bản điện thoại hiện tại; phần `/api/` giữ như đang có):

```nginx
root /opt/3rdhub-pwa/dist-pwa;

location /api/ { proxy_pass http://127.0.0.1:3410; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }

location = /index.html { add_header Cache-Control "no-cache"; }
location = /sw.js      { add_header Cache-Control "no-cache"; }
location /_expo/       { add_header Cache-Control "public, max-age=31536000, immutable"; }
location /             { try_files $uri /index.html; }
```

Tên file trong `_expo/` đổi theo nội dung mỗi lần build, nên cho cache dài được; `index.html` và `sw.js` thì không
cache để người dùng nhận bản mới ngay. Service worker của bản này **không lưu đệm gì** (chỉ để trình duyệt cho cài
app), nên không có chuyện dính bundle cũ.

## Bản web khác app điện thoại ở đâu

| Việc | App iOS / Android | Bản web PWA |
|---|---|---|
| Thanh tab | Thanh gốc của hệ điều hành | Thanh nổi ở đáy vẽ bằng web (`app/(tabs)/_layout.web.tsx`) |
| Tìm kiếm | Tab kính lúp (iOS) / nút ở Trang chủ (Android) | Nút kính lúp ở Trang chủ |
| Hộp xác nhận | Hộp gốc của hệ thống | Hộp tự vẽ (`src/webalert.tsx`), vì `Alert.alert` không chạy trên web |
| eKYC | Chụp trong app | Chuyển sang trang eKYC của web (có tự nhận diện khuôn mặt) |
| Face ID / vân tay | Có | Không có |
| Thông báo đẩy | Cần backend push mới | Chưa nối (bản web cũ dùng Web Push; muốn giữ thì phải nối lại `/tenant/push/subscribe`) |
| Rung khi chạm, kính Liquid Glass | Có (iOS) | Không; dùng nền mờ |
| Đăng nhập | Token Bearer lưu trong Keychain | Token Bearer lưu trong `localStorage` |

Trên màn hình rộng (máy tính), app tự giữ khung rộng tối đa 520px ở giữa. Nó là giao diện điện thoại, **không thay
bản PC**.

## Việc còn phải tự làm khi gắn vào hệ thống

- Quyết định tên miền / cách chia điện thoại và PC ở nginx (hiện nginx chia theo thiết bị sang :3422).
- Web Push cho bản web (nếu cần giữ như PWA cũ).
- Bản PWA cũ có service worker riêng: sau khi đổi, người dùng cũ nên mở lại app một lần để service worker mới
  (không lưu đệm) thay thế cái cũ.
- Theo quy tắc của repo hub: đưa lên UAT trước, Prod sau.
