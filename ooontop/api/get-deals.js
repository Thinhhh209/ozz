/**
 * /api/get-deals
 * -------------------------------------------------------------------------
 * Đọc danh sách Deal từ Google Sheet, cache 5 phút, trả về JSON array cho
 * Frontend. Đây là nguồn dữ liệu chính thức — không dùng /assets/data.js.
 */

// ===============================
// DÁN GOOGLE SHEET ID CỦA BẠN VÀO ĐÂY
// ===============================
const SHEET_ID = "1rCmvVJfqmAa91ACyO33swPiS6JwZWAg1-gOtEThaWqA";

const { getDeals, toFriendlyError } = require("../lib/sheets");

let cache = { data: null, ts: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút — giảm số lần gọi Google Sheets API

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed", message: "Chỉ hỗ trợ GET." });
  }

  try {
    const now = Date.now();
    if (!cache.data || now - cache.ts > CACHE_TTL_MS) {
      const deals = await getDeals(SHEET_ID);
      // Bỏ field nội bộ _row trước khi trả về Frontend — không phải dữ liệu công khai.
      cache = { data: deals.map(({ _row, ...deal }) => deal), ts: now };
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json(cache.data);
  } catch (err) {
    const { status, code, message } = toFriendlyError(err);
    return res.status(status).json({ error: code, message });
  }
};

// go.js cần dùng đúng SHEET_ID này để tìm deal và cập nhật click — export để tránh khai báo trùng.
module.exports.SHEET_ID = SHEET_ID;
