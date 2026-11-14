// Build bản web PWA: `npm run build:pwa` → thư mục dist-pwa/ (web tĩnh, đặt sau nginx cùng tên miền với API).
// Việc làm: xuất bản web của app Expo, rồi gắn vào index.html những thứ một PWA cần (manifest, icon, màu thanh trạng
// thái, vùng an toàn tai thỏ, đăng ký service worker).
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, rmSync } from "node:fs"

const out = "dist-pwa"
rmSync(out, { recursive: true, force: true })
execSync(`npx expo export --platform web --output-dir ${out}`, { stdio: "inherit" })

const file = `${out}/index.html`
let html = readFileSync(file, "utf8")
const head = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#0B2A6F" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="3RDHub" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <style>html,body,#root{height:100%;background:#F4F6FB}body{overscroll-behavior-y:none;-webkit-tap-highlight-color:transparent}input,textarea{outline:none}</style>
    <script>if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}))</script>
`
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />')
html = html.replace(/<html lang="[^"]*"/, '<html lang="vi"').replace(/<title>[^<]*<\/title>/, "<title>3RDHub Vietnam</title>")
if (!html.includes("</head>")) throw new Error("index.html không có </head>")
html = html.replace("</head>", `${head}  </head>`)
writeFileSync(file, html)
console.log(`\nXong: ${out}/ (index.html đã gắn manifest + service worker)`)
