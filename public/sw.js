// Service worker tối giản: chỉ để trình duyệt cho phép "Cài đặt ứng dụng". KHÔNG lưu đệm gì, mọi yêu cầu đi thẳng ra
// mạng, nên đăng bản mới là người dùng thấy ngay, không dính bundle cũ.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil((async () => { for (const k of await caches.keys()) await caches.delete(k); await self.clients.claim() })()))
self.addEventListener("fetch", () => {})
