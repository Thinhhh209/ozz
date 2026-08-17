const { getDeals, incrementClicks, toFriendlyError, decodeId } = require("../lib/sheets");

module.exports = async function handler(req, res) {
  const { id: encodedId } = req.query; // id ở đây thực chất là chuỗi mã hóa

  if (!encodedId) {
    return res.status(400).json({ error: "missing_id", message: "Thiếu tham số id." });
  }

  const id = decodeId(encodedId); // giải mã về ID gốc
  if (!id) {
    res.writeHead(302, { Location: "/404" });
    return res.end();
  }

  try {
    const deals = await getDeals(SHEET_ID);
    const deal = deals.find((d) => String(d.id) === String(id));

    if (!deal || !deal.link_aff) {
      res.writeHead(302, { Location: "/404" });
      return res.end();
    }

    try {
      await incrementClicks(SHEET_ID, deal);
    } catch (writeErr) {
      console.error("increment_clicks_failed:", writeErr.message);
    }

    res.writeHead(302, { Location: deal.link_aff });
    return res.end();
  } catch (err) {
    const { status, code, message } = toFriendlyError(err);
    return res.status(status).json({ error: code, message });
  }
};
