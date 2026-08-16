/**
 * /api/tiktok   (POST { url: string })
 * -------------------------------------------------------------------------
 * Xác thực link TikTok, gọi TikWM (https://www.tikwm.com/api/) để lấy link
 * video không watermark, timeout nếu upstream không phản hồi, trả JSON
 * nhất quán cho Frontend. TikWM là API công khai — không cần secret.
 */

const TIKWM_ENDPOINT = "https://www.tikwm.com/api/";
const REQUEST_TIMEOUT_MS = 10000;

function isValidTikTokUrl(url) {
  return /^(https?:\/\/)?(www\.|vm\.|vt\.|m\.)?tiktok\.com\//i.test(url.trim());
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed", message: "Chỉ hỗ trợ POST." });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== "string" || !isValidTikTokUrl(url)) {
    return res.status(400).json({ error: "invalid_url", message: "Link TikTok không hợp lệ." });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${TIKWM_ENDPOINT}?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: "upstream_error", message: "TikWM đang gặp sự cố, thử lại sau." });
    }

    const payload = await upstream.json();

    if (payload.code !== 0 || !payload.data) {
      return res.status(422).json({
        error: "video_not_found",
        message: payload.msg || "Không lấy được video từ link này — kiểm tra lại link.",
      });
    }

    const d = payload.data;
    return res.status(200).json({
      title: d.title || "",
      cover: d.cover || d.origin_cover || "",
      author: (d.author && d.author.nickname) || "",
      downloadUrl: d.play || "",
      musicUrl: d.music || "",
      durationSeconds: d.duration || 0,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "timeout", message: "TikWM phản hồi quá lâu, vui lòng thử lại." });
    }
    return res.status(500).json({ error: "server_error", message: "Có lỗi xảy ra khi xử lý video." });
  } finally {
    clearTimeout(timer);
  }
};
