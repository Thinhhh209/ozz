/**
 * lib/sheets.js
 * -------------------------------------------------------------------------
 * Shared Google Sheets access for api/get-deals.js and api/go.js.
 * Lives OUTSIDE /api/ on purpose — anything inside /api/ becomes its own
 * Vercel route, and this file is a plain helper module, not an endpoint.
 *
 * Auth: a Google service account (Sheets API v4). Credentials come from
 * Vercel Environment Variables, never hard-coded:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 * The Sheet itself must be shared with that service account email as
 * "Editor" (Editor covers both reading deals and writing click counts,
 * so only one sharing step is needed).
 *
 * Sheet layout expected (tab name below, columns A→H):
 *   id | anh | ten | mo_ta | link_aff | shop | tag | clicks
 * Row 1 = header (skipped). Data starts on row 2.
 */

const { google } = require("googleapis");

const SHEET_TAB_NAME = "Deals"; // đổi tên này nếu tab của bạn đặt tên khác
const SHEET_RANGE = `${SHEET_TAB_NAME}!A2:H`;
const COLUMNS = ["id", "anh", "ten", "mo_ta", "link_aff", "shop", "tag", "clicks"];
const CLICKS_COLUMN_LETTER = "H"; // cột "clicks" — phải khớp thứ tự COLUMNS ở trên

/** Races a promise against a timeout so upstream hangs don't hang our function. */
function withTimeout(promise, ms, timeoutMessage) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error("MISSING_CREDENTIALS");
  }
  return new google.auth.JWT({
    email,
    // Vercel env vars store the key with literal "\n" — turn them back into real newlines.
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuthClient() });
}

function rowToDeal(row, i) {
  if (!row || row[0] === undefined || row[0] === "") return null;
  const obj = {};
  COLUMNS.forEach((col, idx) => {
    obj[col] = row[idx] !== undefined ? row[idx] : "";
  });
  const numericId = Number(obj.id);
  return {
    id: Number.isNaN(numericId) ? String(obj.id).trim() : numericId,
    anh: String(obj.anh || "").trim(),
    ten: String(obj.ten || "").trim(),
    mo_ta: String(obj.mo_ta || "").trim(),
    link_aff: String(obj.link_aff || "").trim(),
    shop: String(obj.shop || "").trim(),
    tag: String(obj.tag || "").trim(),
    clicks: Number(obj.clicks) || 0,
    _row: i + 2, 
  };
}

/** Reads every deal row from the Sheet. Throws on auth/timeout/API errors — caller handles them. */
async function getDeals(sheetId) {
  const sheets = await getSheetsClient();
  const response = await withTimeout(
    sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: SHEET_RANGE }),
    10000,
    "SHEETS_TIMEOUT"
  );
  const rows = response.data.values || [];
  return rows.map(rowToDeal).filter(Boolean);
}

async function incrementClicks(sheetId, deal) {
  const sheets = await getSheetsClient();
  const newClicks = (deal.clicks || 0) + 1;
  await withTimeout(
    sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB_NAME}!${CLICKS_COLUMN_LETTER}${deal._row}`,
      valueInputOption: "RAW",
      requestBody: { values: [[newClicks]] },
    }),
    10000,
    "SHEETS_TIMEOUT"
  );
  return newClicks;
}

/** Maps any error thrown above into a safe, friendly { status, code, message } — never leaks internals. */
function toFriendlyError(err) {
  const msg = err && err.message;

  if (msg === "MISSING_CREDENTIALS") {
    return {
      status: 500,
      code: "missing_credentials",
      message: "Thiếu Environment Variables GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY trên Vercel.",
    };
  }
  if (msg === "SHEETS_TIMEOUT") {
    return { status: 504, code: "timeout", message: "Google Sheets phản hồi quá lâu, vui lòng thử lại." };
  }

  const httpCode = err && (err.code || (err.response && err.response.status));
  if (httpCode === 404) {
    return { status: 502, code: "sheet_not_found", message: "Không tìm thấy Google Sheet — kiểm tra lại SHEET_ID." };
  }
  if (httpCode === 403) {
    return {
      status: 502,
      code: "permission_denied",
      message: "Service Account chưa được chia sẻ quyền Editor trên Sheet này.",
    };
  }
  if (httpCode === 400) {
    return {
      status: 502,
      code: "invalid_range",
      message: `Không đọc được tab "${SHEET_TAB_NAME}" — kiểm tra lại tên tab trong Sheet.`,
    };
  }

  return { status: 500, code: "google_api_error", message: "Có lỗi không xác định khi truy cập Google Sheet." };
}


const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const OFFSET = 1000000000;      
const SECRET = 'nptt.shop';     

function generateAlphabet(secret) {
  const chars = BASE62_CHARS.split('');
  let seed = 0;
  for (let i = 0; i < secret.length; i++) {
    seed = (seed * 31 + secret.charCodeAt(i)) >>> 0;
  }
  function random() {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function encodeId(id) {
  const alphabet = generateAlphabet(SECRET);
  let n = Number(id) + OFFSET;
  const base = alphabet.length;
  let encoded = '';
  do {
    encoded = alphabet[n % base] + encoded;
    n = Math.floor(n / base);
  } while (n > 0);
  return encoded;
}

function decodeId(code) {
  const alphabet = generateAlphabet(SECRET);
  const base = alphabet.length;
  let n = 0;
  for (let i = 0; i < code.length; i++) {
    const index = alphabet.indexOf(code[i]);
    if (index === -1) return null;
    n = n * base + index;
  }
  return n - OFFSET;
}

module.exports = { getDeals, incrementClicks, toFriendlyError, SHEET_TAB_NAME, encodeId, decodeId };
