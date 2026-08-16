/**
 * /api/go?id=:id   (reached via the /go/:id rewrite in vercel.json)
 * -------------------------------------------------------------------------
 * Quy trình: tìm deal theo id → tăng clicks trong Google Sheet → redirect
 * sang link_aff thật. Nếu không tìm thấy deal → chuyển hướng /404.
 */

const { SHEET_ID } = require("./get-deals");
const { getDeals, incrementClicks, toFriendlyError } = require("../lib/sheets");

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "missing_id", message: "Thiếu tham số id." });
  }

  try {
    const deals = await getDeals(SHEET_ID);
    const deal = deals.find((d) => String(d.id) === String(id));

    if (!deal || !deal.link_aff) {
      // Deal không tồn tại — chuyển về trang 404 thay vì lỗi JSON.
      res.writeHead(302, { Location: "/404" });
      return res.end();
    }

    try {
      await incrementClicks(SHEET_ID, deal);
    } catch (writeErr) {
      // Ghi click thất bại không nên chặn người dùng nhận ưu đãi — chỉ log lại phía server.
      console.error("increment_clicks_failed:", writeErr.message);
    }

    // Dùng 302 (tạm thời) thay vì 301 (vĩnh viễn): một redirect 301 sẽ bị trình duyệt
    // cache lại, khiến các lượt click sau của cùng người dùng không còn đi qua server
    // để đếm nữa — làm sai lệch số liệu clicks.
    res.writeHead(302, { Location: deal.link_aff });
    return res.end();
  } catch (err) {
    const { status, code, message } = toFriendlyError(err);
    return res.status(status).json({ error: code, message });
  }
};
