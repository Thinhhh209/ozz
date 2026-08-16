# NPTT.SHOP

Nền tảng tổng hợp Deal / Affiliate cho người dùng Việt Nam.
**Phase 2 — Backend thật đã hoàn thành**: Google Sheets là nguồn dữ liệu chính thức, `/go/:id` redirect có tracking click thật, `/api/tiktok` gọi TikWM thật. Giao diện Frontend giữ nguyên từ Phase 1, chỉ đổi nguồn dữ liệu.

---

## 1. Trạng thái Phase 2

✅ Đã hoàn thành:

- `api/get-deals.js` — đọc Google Sheet thật, parse an toàn, cache 5 phút, trả JSON array
- `api/go.js` — tìm deal theo id, tăng `clicks` trong Sheet, redirect sang `link_aff`; không tìm thấy → `/404`
- `api/tiktok.js` — gọi TikWM (`tikwm.com/api`), validate link, timeout 10s, trả JSON nhất quán
- `lib/sheets.js` — helper dùng chung: xác thực Google Sheets API, đọc/ghi Sheet, chuẩn hoá lỗi thân thiện
- Frontend (`script.js`, `index.html`, `tiktok.html`) đã đổi từ mock data sang gọi API thật, **không redesign giao diện** — chỉ thêm state Loading / Empty / Error cho lưới deal (dùng dữ liệu thật nên cần các state này, Phase 1 dùng mock nên chưa cần)
- Nút "NHẬN ƯU ĐÃI" giờ trỏ tới `/go/{id}` để tracking; "Copy Link" vẫn copy `{origin}/go/{id}` như Phase 1
- `vercel.json` bổ sung rewrite `/about`, `/contact`, `/tiktok` → file `.html` tương ứng
- `package.json` mới, khai báo dependency `googleapis`

⏳ Còn lại (ngoài phạm vi Phase 2):

- Gửi email thật cho form liên hệ (`contact.html` vẫn chỉ validate + giả lập gửi ở frontend)
- Trang quản trị để thêm/sửa deal ngoài việc sửa trực tiếp trên Google Sheet

---

## 2. Hai thay đổi so với bản mô tả gốc — và lý do

Đội ngũ nên biết 2 chỗ code khác với mô tả ban đầu, cả hai đều để bảo vệ đúng mục tiêu ("tracking click chính xác"):

1. **`/api/go.js` dùng redirect 302 thay vì 301.** Một redirect 301 (vĩnh viễn) sẽ bị trình duyệt cache lại — lần click thứ hai của cùng một người dùng sẽ đi thẳng tới `link_aff` mà không qua server nữa, khiến `clicks` bị đếm thiếu. 302 (tạm thời) đảm bảo mọi click đều qua server.
2. **Nếu ghi `clicks` vào Sheet thất bại, `go.js` vẫn redirect người dùng tới ưu đãi** (chỉ log lỗi ở server) thay vì chặn họ lại — trải nghiệm người dùng được ưu tiên hơn một lần đếm click bị thiếu.

---

## 3. Google Sheet — cấu trúc & thiết lập

### 3.1 Cấu trúc cột (tab tên **`Deals`**, hàng 1 là header)

| Cột | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| Tên | id | anh | ten | mo_ta | link_aff | shop | tag | clicks |

Ví dụ hàng dữ liệu (bắt đầu từ hàng 2):

```
1 | https://picsum.photos/.../600 | Giảm 50% | Đơn từ 299k | https://shopee.vn/... | Shopee | Sale | 100
```

> Nếu bạn đặt tên tab khác `Deals`, sửa hằng số `SHEET_TAB_NAME` ở đầu file `lib/sheets.js`.

### 3.2 Tạo Service Account (để đọc **và** ghi Sheet)

1. Vào [Google Cloud Console](https://console.cloud.google.com/) → tạo project mới (hoặc dùng project có sẵn).
2. **APIs & Services → Library** → bật **Google Sheets API**.
3. **APIs & Services → Credentials → Create Credentials → Service Account** → đặt tên bất kỳ, bỏ qua các bước cấp quyền project-level.
4. Vào service account vừa tạo → tab **Keys** → **Add Key → Create new key → JSON** → tải file JSON về.
5. Mở file JSON, lấy 2 giá trị:
   - `client_email` → dùng cho biến `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → dùng cho biến `GOOGLE_PRIVATE_KEY` (giữ nguyên toàn bộ, kể cả `-----BEGIN PRIVATE KEY-----`)
6. Mở Google Sheet chứa deal → **Share** → dán `client_email` ở trên vào, chọn quyền **Editor** (Editor bao gồm cả quyền đọc, nên chỉ cần chia sẻ một lần).
7. Copy **Sheet ID** — là đoạn chuỗi giữa `/d/` và `/edit` trong URL của Sheet:
   `https://docs.google.com/spreadsheets/d/`**`ĐÂY_LÀ_SHEET_ID`**`/edit`

### 3.3 Dán SHEET_ID vào code

Mở `api/get-deals.js`, tìm đoạn:

```js
// ===============================
// DÁN GOOGLE SHEET ID CỦA BẠN VÀO ĐÂY
// ===============================
const SHEET_ID = "DAN_ID_SHEET_CUA_BAN_VAO_DAY";
```

Thay `"DAN_ID_SHEET_CUA_BAN_VAO_DAY"` bằng Sheet ID thật. **Chỉ cần sửa ở đây** — `api/go.js` tự động dùng lại đúng `SHEET_ID` này (import từ `get-deals.js`), không cần sửa 2 nơi.

---

## 4. Environment Variables (bắt buộc — cấu hình trên Vercel)

Vào **Vercel → Project Settings → Environment Variables**, thêm:

| Biến | Giá trị | Dùng cho |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` trong file JSON ở bước 3.2 | Xác thực với Google Sheets API |
| `GOOGLE_PRIVATE_KEY` | `private_key` trong file JSON ở bước 3.2 | Ký request tới Google Sheets API |

**Lưu ý khi dán `GOOGLE_PRIVATE_KEY` trên Vercel:** dán nguyên văn (Vercel cho phép nhiều dòng). Nếu ô nhập của bạn không giữ được ký tự xuống dòng, dán bản một-dòng với `\n` thay cho xuống dòng thật — code trong `lib/sheets.js` đã tự chuyển `\n` thành xuống dòng thật (`key.replace(/\\n/g, "\n")`).

`TikWM` (tikwm.com) là API công khai, **không cần** API key hay Environment Variable nào.

Sau khi thêm biến, **redeploy** project để biến có hiệu lực.

---

## 5. Cài đặt & chạy local

```bash
npm install          # cài googleapis theo package.json
vercel dev            # chạy local với đầy đủ /api (cần Vercel CLI: npm i -g vercel)
```

`vercel dev` sẽ hỏi bạn liên kết project và tự đọc Environment Variables đã cấu hình trên Vercel (hoặc dùng file `.env.local` với 2 biến ở mục 4 nếu muốn chạy hoàn toàn offline-config).

> Chạy thẳng bằng static server như Phase 1 (`npx serve .`) vẫn xem được giao diện, nhưng `/api/*` sẽ không hoạt động — cần `vercel dev` hoặc deploy thật để test backend.

---

## 6. Cách test từng API

### `GET /api/get-deals`

```bash
curl https://<domain-cua-ban>/api/get-deals
```

Kỳ vọng: một JSON array các deal, đúng 8 field (`id, anh, ten, mo_ta, link_aff, shop, tag, clicks`). Gọi lại trong vòng 5 phút sẽ ra dữ liệu cache (không tốn thêm lượt gọi Google Sheets).

### `GET /go/1` (redirect có tracking)

Mở thẳng trên trình duyệt: `https://<domain-cua-ban>/go/1`

- Nếu `id=1` tồn tại trong Sheet → chuyển hướng sang `link_aff` của deal đó, đồng thời cột `clicks` của dòng đó tăng thêm 1 (kiểm tra lại trong Sheet).
- Nếu không tồn tại → chuyển hướng sang `/404`.

### `POST /api/tiktok`

```bash
curl -X POST https://<domain-cua-ban>/api/tiktok \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.tiktok.com/@ten_video/video/1234567890"}'
```

Kỳ vọng: JSON gồm `title`, `cover`, `author`, `downloadUrl`, `musicUrl`, `durationSeconds`. Thử với một URL không phải TikTok để thấy lỗi `invalid_url` (400).

---

## 7. Cấu trúc project (cập nhật Phase 2)

```
/
├── index.html, about.html, contact.html, tiktok.html, 404.html
├── style.css, script.js
├── package.json           MỚI — dependency googleapis
├── vercel.json             Cập nhật — thêm rewrite /about /contact /tiktok
├── lib/
│   └── sheets.js             MỚI — auth + đọc/ghi Google Sheet dùng chung
└── api/
    ├── get-deals.js             Đọc Sheet, cache 5', trả JSON array
    ├── go.js                       Tìm deal, +1 click, redirect 302
    └── tiktok.js                     Proxy TikWM, validate + timeout
```

---

## 8. Xử lý lỗi đã có

`api/get-deals.js` và `api/go.js` (qua `lib/sheets.js`) phân biệt và trả message tiếng Việt thân thiện cho: thiếu Environment Variables, Sheet không tồn tại / sai `SHEET_ID`, chưa chia sẻ quyền Editor cho service account, sai tên tab, timeout Google Sheets API (10s). `api/tiktok.js` xử lý: URL không hợp lệ, TikWM lỗi/không trả video, timeout upstream (10s). Deal không tồn tại ở `/go/:id` → chuyển hướng `/404` thay vì trả lỗi JSON. Frontend hiển thị các lỗi này ở state "Error" của lưới deal (có nút "Thử lại") và ở khối lỗi của công cụ tải TikTok.

---

## 9. Ghi chú về `assets/meow.mp3`

File hiện tại vẫn là âm thanh placeholder từ Phase 1 (không phải tiếng mèo thật) — thay bằng file `.mp3` tiếng mèo thật trước khi ra mắt chính thức, giữ nguyên tên file.
