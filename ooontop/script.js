/* =========================================================================
  NPTT.SHOP — script.js  (Phase 1: frontend only, mock data)
   -------------------------------------------------------------------------
   Sections in this file:
     1. Mock data                (Phase 2 will replace with /api/get-deals)
     2. Small utilities          (debounce, throttle)
     3. Sakura canvas            (ambient background animation)
     4. Meow easter egg          (single reused Audio instance)
     5. Alpine mixins            (toast, tiktok downloader — shared logic)
     6. Alpine components        (dealShopApp, contactForm, tiktokDownloader,
                                   navMenu — registered before Alpine boots)
     7. Boot                     (year stamp, fade-in, canvas init)
   ========================================================================= */

/* ---------------------------------------------------------------------
   1. MOCK DATA
   Field names are in Vietnamese on purpose — this is the exact shape
   /api/get-deals.js will return in Phase 2, so swapping the data source
   later means changing ONE function (see `loadDeals()` below) — no
   markup or Alpine bindings need to change.
   --------------------------------------------------------------------- */
const MOCK_DEALS = [
  { id: 1,  anh: "https://picsum.photos/seed/deal1/600/600",  ten: "Giảm 50% Thời Trang Nữ",       mo_ta: "Đơn từ 199k, áp dụng toàn shop",     link_aff: "#", shop: "Shopee", tag: "Sale",       clicks: 0 },
  { id: 2,  anh: "https://picsum.photos/seed/deal2/600/600",  ten: "Deal Sốc Đồ Gia Dụng",          mo_ta: "Giảm đến 40%, số lượng có hạn",      link_aff: "#", shop: "Lazada", tag: "Hot",        clicks: 0 },
  { id: 3,  anh: "https://picsum.photos/seed/deal3/600/600",  ten: "Sách Hay Giảm 30%",             mo_ta: "Áp dụng cho toàn bộ gian hàng",      link_aff: "#", shop: "Tiki",   tag: "Mới",        clicks: 0 },
  { id: 4,  anh: "https://picsum.photos/seed/deal4/600/600",  ten: "Flash Sale Giày Sneaker",       mo_ta: "Chỉ diễn ra 12h–13h hôm nay",        link_aff: "#", shop: "Shopee", tag: "Flash Sale", clicks: 0 },
  { id: 5,  anh: "https://picsum.photos/seed/deal5/600/600",  ten: "Voucher 100k Đơn Từ 500k",      mo_ta: "Ngành hàng điện tử, điện máy",       link_aff: "#", shop: "Lazada", tag: "Voucher",    clicks: 0 },
  { id: 6,  anh: "https://picsum.photos/seed/deal6/600/600",  ten: "Combo Mỹ Phẩm Giảm 35%",        mo_ta: "Số lượng có hạn trong ngày",         link_aff: "#", shop: "Tiki",   tag: "Sale",       clicks: 0 },
  { id: 7,  anh: "https://picsum.photos/seed/deal7/600/600",  ten: "Miễn Phí Vận Chuyển Toàn Sàn",  mo_ta: "Áp dụng cho đơn từ 0đ",              link_aff: "#", shop: "Shopee", tag: "Freeship",   clicks: 0 },
  { id: 8,  anh: "https://picsum.photos/seed/deal8/600/600",  ten: "Đồ Chơi Trẻ Em Giảm 45%",       mo_ta: "Mua 2 tặng 1 cho một số mẫu",        link_aff: "#", shop: "Lazada", tag: "Hot",        clicks: 0 },
  { id: 9,  anh: "https://picsum.photos/seed/deal9/600/600",  ten: "Laptop Văn Phòng Giá Sốc",      mo_ta: "Trả góp 0% lãi suất 6 tháng",        link_aff: "#", shop: "Tiki",   tag: "Flash Sale", clicks: 0 },
  { id: 10, anh: "https://picsum.photos/seed/deal10/600/600", ten: "Nồi Chiên Không Dầu Giảm 50%",  mo_ta: "Sản phẩm bán chạy số 1 tuần này",    link_aff: "#", shop: "Shopee", tag: "Sale",       clicks: 0 },
  { id: 11, anh: "https://picsum.photos/seed/deal11/600/600", ten: "Thời Trang Nam Sale Kép",       mo_ta: "Giảm thêm 20% khi nhập mã",          link_aff: "#", shop: "Lazada", tag: "Mới",        clicks: 0 },
  { id: 12, anh: "https://picsum.photos/seed/deal12/600/600", ten: "Deal Sách Thiếu Nhi",           mo_ta: "Giảm đến 60%, freeship từ 150k",     link_aff: "#", shop: "Tiki",   tag: "Sale",       clicks: 0 },
];

const MOCK_UPDATES = [
  { date: "14/08", text: "Đã cập nhật" },
  { date: "10/08", text: "." },
  { date: "05/08", text: "Nâng cấp trải nghiệm người dùng" },
];

const MOCK_UPCOMING_TOOLS = [
  { icon: "💰", name: "So Sánh Giá" },
  { icon: "🎯", name: "Săn Flash Sale" },
  { icon: "👛", name: "Shopee pay" },
];

/**
 * Single point of truth for where deal data comes from.
 * Phase 2: reads the real Google Sheet–backed API. Rejects with a
 * friendly Vietnamese message on any non-OK response so the caller can
 * show it directly in the error state.
 */
function loadDeals() {
  return fetch("/api/get-deals").then((r) => {
    if (!r.ok) {
      return r
        .json()
        .catch(() => ({}))
        .then((body) => Promise.reject(new Error(body.message || "Không tải được deal, vui lòng thử lại.")));
    }
    return r.json();
  });
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
/**
 * Where the "NHẬN ƯU ĐÃI" button points.
 * Phase 2: goes through the tracked redirect in api/go.js, so every click
 * increments the deal's click count in the Sheet before landing on the
 * real affiliate link.
 */
function dealLink(deal) {
  return `/go/${encodeId(deal.id)}`;
}

/**
 * The link that gets copied to the clipboard is already the future
 * short-link shape, so Phase 2 doesn't need to touch this either.
 */
function shareLink(deal) {
  return `${window.location.origin}/go/${encodeId(deal.id)}`;
}

/* ---------------------------------------------------------------------
   2. SMALL UTILITIES
   --------------------------------------------------------------------- */
function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function throttle(fn, wait = 150) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
}

/* ---------------------------------------------------------------------
   3. SAKURA CANVAS
   Lightweight falling-petal ambience. Particle count is cut down on
   small screens, the loop pauses when the tab isn't visible, and it
   does nothing at all if the user prefers reduced motion.
   --------------------------------------------------------------------- */
class SakuraCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.petals = [];
    this.raf = null;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.colors = ["#EC489980", "#8B5CF680", "#F9731660"];

    if (this.reduced) return; // leave the canvas empty and skip all listeners

    this.resize();
    this.seed();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);

    window.addEventListener("resize", debounce(() => this.resize(), 200));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(this.raf);
      } else {
        this.raf = requestAnimationFrame(this.loop);
      }
    });
  }

  petalCount() {
    return window.innerWidth < 640 ? 10 : window.innerWidth < 1280 ? 18 : 26;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed(); // re-seed so density matches the new viewport size
  }

  seed() {
    const count = this.petalCount();
    this.petals = Array.from({ length: count }, () => this.makePetal(true));
  }

  makePetal(randomY = false) {
    return {
      x: Math.random() * window.innerWidth,
      y: randomY ? Math.random() * window.innerHeight : -10,
      size: 5 + Math.random() * 6,
      speedY: 0.4 + Math.random() * 0.6,
      speedX: Math.sin(Math.random() * Math.PI) * 0.6,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
    };
  }

  loop() {
    const { ctx } = this;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of this.petals) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;
      if (p.y > window.innerHeight + 10) {
        Object.assign(p, this.makePetal(false));
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.raf = requestAnimationFrame(this.loop);
  }
}

/* ---------------------------------------------------------------------
   4. MEOW EASTER EGG
   One Audio instance, reused for every click — never re-instantiated.
   Playback is only ever triggered from inside a click handler, so it
   always runs on a real user gesture and stays inside autoplay rules.
   --------------------------------------------------------------------- */
const meowAudio = new Audio("/assets/meow.mp3");
meowAudio.preload = "none";
meowAudio.volume = 0.3;

document.addEventListener(
  "click",
  () => {
    meowAudio.currentTime = 0;
    meowAudio.play().catch(() => {
      /* browser blocked it or the file isn't ready yet — fail silently */
    });
  },
  { passive: true }
);

/* ---------------------------------------------------------------------
   5. ALPINE MIXINS (shared logic, composed into components below)
   --------------------------------------------------------------------- */
function toastMixin() {
  return {
    toastVisible: false,
    toastMessage: "",
    toastType: "success",
    _toastTimer: null,
    showToast(message, type = "success") {
      clearTimeout(this._toastTimer);
      this.toastMessage = message;
      this.toastType = type;
      this.toastVisible = true;
      this._toastTimer = setTimeout(() => {
        this.toastVisible = false;
      }, 2500);
    },
  };
}

function tiktokMixin() {
  return {
    tiktokUrl: "",
    tiktokStatus: "idle", // idle | loading | error | result
    tiktokError: "",
    tiktokResult: null,
    downloadTikTok() {
      const url = this.tiktokUrl.trim();
      if (!url) {
        this.tiktokStatus = "error";
        this.tiktokError = "Vui lòng dán link video TikTok.";
        return;
      }
      if (!url.includes("tiktok.com")) {
        this.tiktokStatus = "error";
        this.tiktokError = "Link không hợp lệ — cần là link tiktok.com.";
        return;
      }
      this.tiktokStatus = "loading";
      this.tiktokError = "";
      this.tiktokResult = null;

      fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
        .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
        .then(({ ok, body }) => {
          if (!ok) {
            this.tiktokStatus = "error";
            this.tiktokError = body.message || "Không tải được video.";
            return;
          }
          this.tiktokResult = body;
          this.tiktokStatus = "result";
        })
        .catch(() => {
          this.tiktokStatus = "error";
          this.tiktokError = "Không kết nối được máy chủ, thử lại sau.";
        });
    },
    resetTiktok() {
      this.tiktokUrl = "";
      this.tiktokStatus = "idle";
      this.tiktokError = "";
      this.tiktokResult = null;
    },
  };
}

/* ---------------------------------------------------------------------
   6. ALPINE COMPONENTS
   Registered on 'alpine:init' so they exist before Alpine scans the DOM.
   --------------------------------------------------------------------- */
document.addEventListener("alpine:init", () => {
  // ---- mobile nav (used in the header on every page) ----
  Alpine.data("navMenu", () => ({
    open: false,
    toggle() {
      this.open = !this.open;
    },
    close() {
      this.open = false;
    },
  }));

  // ---- homepage: pill tabs, filters, deal grid, mini tiktok widget ----
  Alpine.data("dealShopApp", () => ({
    ...toastMixin(),
    ...tiktokMixin(),
    activeTab: "deals", // 'deals' | 'tools'
    activeShop: "all",
    deals: [],
    dealsStatus: "loading", // loading | ready | error
    dealsError: "",
    updates: MOCK_UPDATES,
    upcomingTools: MOCK_UPCOMING_TOOLS,
    shops: ["all", "Shopee", "Lazada", "Tiki"],

    init() {
      this.dealsStatus = "loading";
      loadDeals()
        .then((data) => {
          this.deals = data;
          this.dealsStatus = "ready";
          this.$nextTick(() => this.animateDeals());
        })
        .catch((err) => {
          this.dealsStatus = "error";
          this.dealsError = err.message || "Có lỗi xảy ra, vui lòng thử lại.";
        });
    },

    retryLoadDeals() {
      this.init();
    },

    get filteredDeals() {
      return this.activeShop === "all"
        ? this.deals
        : this.deals.filter((d) => d.shop === this.activeShop);
    },

    setShop(shop) {
      this.activeShop = shop;
      this.$nextTick(() => this.animateDeals());
    },

    dealLink,

    copyLink(deal) {
      const link = shareLink(deal);
      const done = () => this.showToast("Đã copy link chia sẻ");
      const fail = () => this.showToast("Không thể copy link, thử lại nhé.", "error");
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link).then(done).catch(fail);
      } else {
        // Fallback for non-secure contexts / older browsers.
        const el = document.createElement("textarea");
        el.value = link;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        try {
          document.execCommand("copy");
          done();
        } catch (e) {
          fail();
        }
        el.remove();
      }
    },

    animateDeals() {
      if (!window.gsap) return;
      gsap.fromTo(
        ".deal-card-anim",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: "power2.out" }
      );
    },

    animateTools() {
      if (!window.gsap) return;
      this.$nextTick(() => {
        gsap.fromTo(
          ".tool-card-anim",
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power2.out" }
        );
      });
    },
  }));

  // ---- contact page ----
  Alpine.data("contactForm", () => ({
    ...toastMixin(),
    name: "",
    email: "",
    message: "",
    errors: {},
    submitting: false,

    validate() {
      const errors = {};
      if (!this.name.trim()) errors.name = "Vui lòng nhập tên.";
      if (!this.email.trim()) {
        errors.email = "Vui lòng nhập email.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
        errors.email = "Email chưa đúng định dạng.";
      }
      if (!this.message.trim()) errors.message = "Vui lòng nhập nội dung.";
      this.errors = errors;
      return Object.keys(errors).length === 0;
    },

    submit() {
      if (!this.validate()) return;
      this.submitting = true;
      // Phase 1: no backend yet — simulate a send.
      setTimeout(() => {
        this.submitting = false;
        this.showToast("Đã gửi liên hệ, cảm ơn bạn!");
        this.name = "";
        this.email = "";
        this.message = "";
        this.errors = {};
      }, 700);
    },
  }));

  // ---- standalone /tiktok.html page ----
  Alpine.data("tiktokDownloader", () => ({
    ...tiktokMixin(),
  }));
});

/* ---------------------------------------------------------------------
   7. BOOT
   --------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  document.body.classList.add("page-fade-in");

  const canvas = document.getElementById("sakuraCanvas");
  if (canvas) new SakuraCanvas(canvas);

  // Subtle header shadow once the page scrolls — throttled, not fired on
  // every scroll tick.
  const header = document.querySelector("[data-site-header]");
  if (header) {
    window.addEventListener(
      "scroll",
      throttle(() => {
        header.classList.toggle("shadow-md", window.scrollY > 8);
      }, 100),
      { passive: true }
    );
  }
});
