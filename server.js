const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const { URL } = require("url");
const { MongoClient } = require("mongodb");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const otpStore = {
  register: new Map(),
  reset: new Map(),
};
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_PER_WINDOW = 5;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
const AUTH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || "moharani-dev-secret-change-in-production";
const OTP_PROVIDER = process.env.OTP_PROVIDER || "dev";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "";
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "";
const OTP_DELIVERY = (process.env.OTP_DELIVERY || "sms").toLowerCase(); // sms | whatsapp
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || "";
const FAST2SMS_SENDER = process.env.FAST2SMS_SENDER || "FSTSMS";
const EMAIL_OTP_PROVIDER = process.env.EMAIL_OTP_PROVIDER || "dev"; // dev | brevo
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const OTP_EMAIL_FROM = process.env.OTP_EMAIL_FROM || "no-reply@themoharani.com";
const otpRateStore = new Map();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const MONGO_URI = process.env.MONGO_URI || "";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "themoharani";
const MONGO_USERS_COLLECTION = process.env.MONGO_USERS_COLLECTION || "users";
const MONGO_PRODUCTS_COLLECTION = process.env.MONGO_PRODUCTS_COLLECTION || "products";
const MONGO_ORDERS_COLLECTION = process.env.MONGO_ORDERS_COLLECTION || "orders";
const MONGO_SETTINGS_COLLECTION = process.env.MONGO_SETTINGS_COLLECTION || "settings";
const MONGO_META_COLLECTION = process.env.MONGO_META_COLLECTION || "app_meta";
const MONGO_SETTINGS_ID = "store_settings";
const MONGO_MIGRATION_ID = "v2_collections";
let mongoCollections = null;

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    const seed = {
      users: [
        {
          id: "admin-1",
          name: "Moharani Admin",
          email: "admin@themoharani.com",
          password: "Moharani@2026",
          phone: "",
          avatar: "",
          address: "",
          city: "",
          state: "",
          zip: "",
          role: "admin",
        },
        {
          id: "user-1",
          name: "Priya Sharma",
          email: "customer@themoharani.com",
          password: "user123",
          phone: "+91 9876543210",
          avatar: "",
          address: "12 Park Street",
          city: "Kolkata",
          state: "West Bengal",
          zip: "700016",
          role: "customer",
        },
      ],
      products: [
        {
          id: "TM001",
          name: "Royal Banarasi Silk Saree",
          category: "Wedding",
          fabric: "Pure Silk",
          price: 8499,
          oldPrice: 9999,
          stock: 14,
          featured: true,
          image:
            "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
          badge: "Best Seller",
          shortDescription: "Luxurious zari work with rich bridal detailing.",
          description:
            "Crafted for celebrations, this Banarasi silk saree blends heritage weaving, premium zari motifs, and a graceful drape designed for wedding and festive occasions.",
        },
        {
          id: "TM002",
          name: "Kanchipuram Temple Border Saree",
          category: "Festive",
          fabric: "Kanchipuram Silk",
          price: 7299,
          oldPrice: 8299,
          stock: 11,
          featured: true,
          image:
            "https://images.unsplash.com/photo-1583391733981-84961a4f5f1b?auto=format&fit=crop&w=900&q=80",
          badge: "New Arrival",
          shortDescription: "Classic gold temple border with vibrant body tones.",
          description:
            "A timeless Kanchipuram saree with a ceremonial temple border, hand-finished texture, and statement pallu for festive dressing.",
        },
        {
          id: "TM003",
          name: "Soft Linen Printed Saree",
          category: "Daily Wear",
          fabric: "Linen Blend",
          price: 2499,
          oldPrice: 2999,
          stock: 22,
          featured: false,
          image:
            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
          badge: "Lightweight",
          shortDescription: "Breathable comfort with elegant floral printing.",
          description:
            "Designed for day-long ease, this linen blend saree offers soft texture, subtle prints, and versatile styling for office and casual wear.",
        },
        {
          id: "TM004",
          name: "Chiffon Partywear Saree",
          category: "Party",
          fabric: "Chiffon",
          price: 3999,
          oldPrice: 4699,
          stock: 18,
          featured: true,
          image:
            "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
          badge: "Trending",
          shortDescription: "Flowy silhouette with sequin-highlighted pallu.",
          description:
            "An effortless partywear pick featuring fluid chiffon drape, subtle shimmer accents, and a polished evening-ready finish.",
        },
        {
          id: "TM005",
          name: "Cotton Handloom Saree",
          category: "Office Wear",
          fabric: "Handloom Cotton",
          price: 2199,
          oldPrice: 2599,
          stock: 30,
          featured: false,
          image:
            "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
          badge: "Everyday Essential",
          shortDescription: "Handloom comfort with elegant contrast stripes.",
          description:
            "A breathable cotton handloom saree built for all-day wear, featuring artisanal weaving and understated elegance for work and day events.",
        },
        {
          id: "TM006",
          name: "Designer Georgette Saree",
          category: "Reception",
          fabric: "Georgette",
          price: 5599,
          oldPrice: 6499,
          stock: 16,
          featured: true,
          image:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
          badge: "Premium",
          shortDescription: "Contemporary designer drape with embellished blouse piece.",
          description:
            "Modern georgette styling with graceful fall, embellished details, and versatile elegance for receptions and curated evening looks.",
        },
      ],
      orders: [],
      settings: {
        brandName: "The Moharani",
        supportEmail: "sbfashion4553@gmail.com",
        supportPhone: "+91 98765 43210",
        address: "India",
      },
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

function readStoreFromFile() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function writeStoreToFile(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function initMongoStore() {
  if (!MONGO_URI) {
    return false;
  }
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(MONGO_DB_NAME);
  mongoCollections = {
    users: db.collection(MONGO_USERS_COLLECTION),
    products: db.collection(MONGO_PRODUCTS_COLLECTION),
    orders: db.collection(MONGO_ORDERS_COLLECTION),
    settings: db.collection(MONGO_SETTINGS_COLLECTION),
    meta: db.collection(MONGO_META_COLLECTION),
  };

  const migration = await mongoCollections.meta.findOne({ _id: MONGO_MIGRATION_ID });
  if (!migration) {
    const seedStore = readStoreFromFile();
    const existingUsers = await mongoCollections.users.countDocuments();
    const existingProducts = await mongoCollections.products.countDocuments();
    const existingOrders = await mongoCollections.orders.countDocuments();
    const existingSettings = await mongoCollections.settings.countDocuments({
      _id: MONGO_SETTINGS_ID,
    });

    if (!existingUsers && Array.isArray(seedStore.users) && seedStore.users.length) {
      await mongoCollections.users.insertMany(seedStore.users);
    }
    if (!existingProducts && Array.isArray(seedStore.products) && seedStore.products.length) {
      await mongoCollections.products.insertMany(seedStore.products);
    }
    if (!existingOrders && Array.isArray(seedStore.orders) && seedStore.orders.length) {
      await mongoCollections.orders.insertMany(seedStore.orders);
    }
    if (!existingSettings) {
      await mongoCollections.settings.replaceOne(
        { _id: MONGO_SETTINGS_ID },
        { _id: MONGO_SETTINGS_ID, ...(seedStore.settings || {}) },
        { upsert: true }
      );
    }
    await mongoCollections.meta.replaceOne(
      { _id: MONGO_MIGRATION_ID },
      { _id: MONGO_MIGRATION_ID, completedAt: new Date().toISOString() },
      { upsert: true }
    );
  }
  return true;
}

async function readStore() {
  if (!mongoCollections) {
    return readStoreFromFile();
  }
  const [users, products, orders, settingsDoc] = await Promise.all([
    mongoCollections.users.find({}).toArray(),
    mongoCollections.products.find({}).toArray(),
    mongoCollections.orders.find({}).toArray(),
    mongoCollections.settings.findOne({ _id: MONGO_SETTINGS_ID }),
  ]);
  return {
    users: users.map(({ _id, ...rest }) => rest),
    products: products.map(({ _id, ...rest }) => rest),
    orders: orders.map(({ _id, ...rest }) => rest),
    settings: settingsDoc
      ? (() => {
          const { _id, ...rest } = settingsDoc;
          return rest;
        })()
      : {},
  };
}

async function writeStore(store) {
  if (!mongoCollections) {
    writeStoreToFile(store);
    return;
  }
  await Promise.all([
    mongoCollections.users.deleteMany({}),
    mongoCollections.products.deleteMany({}),
    mongoCollections.orders.deleteMany({}),
  ]);
  if (Array.isArray(store.users) && store.users.length) {
    await mongoCollections.users.insertMany(store.users);
  }
  if (Array.isArray(store.products) && store.products.length) {
    await mongoCollections.products.insertMany(store.products);
  }
  if (Array.isArray(store.orders) && store.orders.length) {
    await mongoCollections.orders.insertMany(store.orders);
  }
  await mongoCollections.settings.replaceOne(
    { _id: MONGO_SETTINGS_ID },
    { _id: MONGO_SETTINGS_ID, ...(store.settings || {}) },
    { upsert: true }
  );
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || "application/octet-stream";
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatar: user.avatar || "",
    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    zip: user.zip || "",
    role: user.role,
  };
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signJwt(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(unsigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${unsigned}.${signature}`;
}

function verifyJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(unsigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload || typeof payload !== "object") {
      return null;
    }
    if (!payload.exp || Date.now() > Number(payload.exp)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function generateAuthToken(user) {
  return signJwt({
    sub: user.id,
    role: user.role,
    exp: Date.now() + AUTH_TOKEN_TTL_MS,
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, user) {
  const plain = String(user.password || "");
  if (plain && plain === String(password || "")) {
    return { ok: true, needsMigration: true };
  }

  const passwordHash = String(user.passwordHash || "");
  if (!passwordHash.startsWith("scrypt$")) {
    return { ok: false, needsMigration: false };
  }
  const [, salt, hash] = passwordHash.split("$");
  if (!salt || !hash) {
    return { ok: false, needsMigration: false };
  }
  const testHash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  const ok = crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  return { ok, needsMigration: false };
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function isStrongPassword(password = "") {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(String(password));
}

function createOtpRecord(map, key) {
  const otp = generateOtp();
  map.set(key, { otp, expiresAt: Date.now() + OTP_TTL_MS });
  return otp;
}

function enforceOtpRateLimit(key) {
  const now = Date.now();
  const current = otpRateStore.get(key) || { sentAt: [], lastSentAt: 0 };
  if (now - Number(current.lastSentAt || 0) < OTP_RESEND_COOLDOWN_MS) {
    throw new Error("Please wait before requesting another OTP");
  }
  const nextSentAt = current.sentAt.filter((time) => now - time <= OTP_RATE_WINDOW_MS);
  if (nextSentAt.length >= OTP_MAX_PER_WINDOW) {
    throw new Error("Too many OTP requests. Try again later");
  }
  nextSentAt.push(now);
  otpRateStore.set(key, { sentAt: nextSentAt, lastSentAt: now });
}

function doHttpsRequest(options, body = "") {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode || 500, body: data });
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function sendOtpViaTwilio(phone, otp) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are missing");
  }
  const isWhatsapp = OTP_DELIVERY === "whatsapp";
  if (isWhatsapp && !TWILIO_WHATSAPP_FROM) {
    throw new Error("Twilio WhatsApp sender is missing");
  }
  if (!isWhatsapp && !TWILIO_FROM_NUMBER) {
    throw new Error("Twilio SMS sender is missing");
  }
  const to = isWhatsapp ? `whatsapp:+91${phone}` : `+91${phone}`;
  const from = isWhatsapp ? TWILIO_WHATSAPP_FROM : TWILIO_FROM_NUMBER;
  const postData = new URLSearchParams({
    To: to,
    From: from,
    Body: `Your The Moharani OTP is ${otp}. Valid for 5 minutes.`,
  }).toString();
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await doHttpsRequest(
    {
      hostname: "api.twilio.com",
      path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    },
    postData
  );
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error("Twilio OTP send failed");
  }
}

async function sendOtpViaFast2SMS(phone, otp) {
  if (!FAST2SMS_API_KEY) {
    throw new Error("Fast2SMS API key is missing");
  }
  const postData = JSON.stringify({
    route: "q",
    message: `Your The Moharani OTP is ${otp}. Valid for 5 minutes.`,
    language: "english",
    flash: 0,
    numbers: phone,
    sender_id: FAST2SMS_SENDER,
  });
  const response = await doHttpsRequest(
    {
      hostname: "www.fast2sms.com",
      path: "/dev/bulkV2",
      method: "POST",
      headers: {
        authorization: FAST2SMS_API_KEY,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    },
    postData
  );
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error("Fast2SMS OTP send failed");
  }
}

async function sendOtpToPhone(phone, otp) {
  if (OTP_PROVIDER === "twilio") {
    await sendOtpViaTwilio(phone, otp);
    return;
  }
  if (OTP_PROVIDER === "fast2sms") {
    await sendOtpViaFast2SMS(phone, otp);
    return;
  }
  console.log(`[OTP:DEV] ${phone} -> ${otp}`);
}

async function sendOtpViaBrevo(email, otp) {
  if (!BREVO_API_KEY) {
    throw new Error("Brevo API key is missing");
  }
  const postData = JSON.stringify({
    sender: { email: OTP_EMAIL_FROM, name: "The Moharani" },
    to: [{ email }],
    subject: "Your OTP Code - The Moharani",
    htmlContent: `<p>Your OTP is <strong>${otp}</strong>. Valid for 5 minutes.</p>`,
  });
  const response = await doHttpsRequest(
    {
      hostname: "api.brevo.com",
      path: "/v3/smtp/email",
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    },
    postData
  );
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error("Email OTP send failed");
  }
}

async function sendOtpToEmail(email, otp) {
  if (EMAIL_OTP_PROVIDER === "brevo") {
    await sendOtpViaBrevo(email, otp);
    return;
  }
  console.log(`[OTP:EMAIL:DEV] ${email} -> ${otp}`);
}

function verifyOtpRecord(map, key, otp) {
  const record = map.get(key);
  if (!record) {
    return false;
  }
  if (Date.now() > Number(record.expiresAt || 0)) {
    map.delete(key);
    return false;
  }
  return String(record.otp) === String(otp);
}

function getUserFromRequest(req, store) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  const token = auth.slice(7);
  const payload = verifyJwt(token);
  if (!payload?.sub) {
    return null;
  }
  return store.users.find((user) => user.id === payload.sub) || null;
}

function requireRole(req, res, store, role) {
  const user = getUserFromRequest(req, store);
  if (!user || user.role !== role) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return user;
}

function sanitizeProduct(input, existing = {}) {
  const gallery = Array.isArray(input.gallery)
    ? input.gallery.filter(Boolean)
    : Array.isArray(existing.gallery)
      ? existing.gallery
      : [input.image || existing.image || ""].filter(Boolean);

  return {
    id: input.id || existing.id || `TM${Date.now()}`,
    name: input.name || existing.name || "",
    category: input.category || existing.category || "",
    fabric: input.fabric || existing.fabric || "",
    price: Number(input.price ?? existing.price ?? 0),
    oldPrice: Number(input.oldPrice ?? existing.oldPrice ?? 0),
    stock: Number(input.stock ?? existing.stock ?? 0),
    featured: Boolean(input.featured ?? existing.featured),
    image: input.image || existing.image || "",
    gallery,
    badge: input.badge || existing.badge || "",
    shortDescription: input.shortDescription || existing.shortDescription || "",
    description: input.description || existing.description || "",
  };
}

function remapProductReferences(store, previousId, nextId) {
  if (!previousId || previousId === nextId) {
    return;
  }

  for (const order of store.orders) {
    for (const item of order.items) {
      if (item.productId === previousId) {
        item.productId = nextId;
      }
    }
  }
}

function calculateOrderTotals(items, products) {
  const detailedItems = items
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) {
        return null;
      }
      const quantity = Number(item.quantity || 1);
      return {
        productId: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity,
        lineTotal: product.price * quantity,
      };
    })
    .filter(Boolean);

  const subtotal = detailedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 5000 ? 0 : subtotal > 0 ? 149 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;

  return { detailedItems, subtotal, shipping, tax, total };
}

function buildOrderAndApplyStock(store, user, customer = {}, payment = {}, items = []) {
  const totals = calculateOrderTotals(items, store.products);
  if (!totals.detailedItems.length) {
    throw new Error("Cart is empty");
  }

  const order = {
    id: `ORD-${Date.now()}`,
    createdAt: new Date().toISOString(),
    userId: user.id,
    customer: {
      name: customer.name || user.name || "",
      email: customer.email || user.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zip: customer.zip || "",
    },
    payment: {
      method: payment.method || "Card",
      status: payment.status || "Paid",
      reference: payment.reference || "",
    },
    status: "Pending",
    items: totals.detailedItems,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    tax: totals.tax,
    total: totals.total,
  };

  for (const item of totals.detailedItems) {
    const product = store.products.find((entry) => entry.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  }
  store.orders.unshift(order);
  return order;
}

async function handleApi(req, res, parsedUrl) {
  const store = await readStore();
  const pathname = parsedUrl.pathname;

  if (req.method === "GET" && pathname === "/api/products") {
    const category = parsedUrl.searchParams.get("category");
    const featured = parsedUrl.searchParams.get("featured");

    let products = [...store.products];
    if (category && category !== "All") {
      products = products.filter((product) => product.category === category);
    }
    if (featured === "true") {
      products = products.filter((product) => product.featured);
    }

    sendJson(res, 200, { products, settings: store.settings });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/products/")) {
    const id = pathname.split("/").pop();
    const product = store.products.find((item) => item.id === id);
    if (!product) {
      sendJson(res, 404, { error: "Product not found" });
      return;
    }
    sendJson(res, 200, { product });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await parseBody(req);
    const identifier = String(body.identifier || body.email || "").trim().toLowerCase();
    const user = store.users.find((entry) => entry.email.toLowerCase() === identifier);

    if (!user || !verifyPassword(body.password, user).ok) {
      sendJson(res, 401, { error: "Invalid email or password" });
      return;
    }

    const check = verifyPassword(body.password, user);
    if (check.needsMigration) {
      user.passwordHash = hashPassword(body.password);
      delete user.password;
      await writeStore(store);
    }

    const token = generateAuthToken(user);
    sendJson(res, 200, { token, user: publicUser(user) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register") {
    const body = await parseBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = normalizePhone(body.phone || "");
    const otp = String(body.otp || "").trim();

    if (!name || !email || !password) {
      sendJson(res, 400, { error: "Name, email, and password are required" });
      return;
    }
    if (phone && phone.length !== 10) {
      sendJson(res, 400, { error: "Enter a valid 10-digit mobile number" });
      return;
    }
    if (!isStrongPassword(password)) {
      sendJson(res, 400, { error: "Password must be 8+ chars with uppercase, lowercase, number, and special character" });
      return;
    }
    if (!otp) {
      sendJson(res, 400, { error: "OTP is required" });
      return;
    }
    if (!verifyOtpRecord(otpStore.register, email, otp)) {
      sendJson(res, 400, { error: "Invalid OTP" });
      return;
    }

    const exists = store.users.find((entry) => entry.email.toLowerCase() === email);
    if (exists) {
      sendJson(res, 400, { error: "Email already registered" });
      return;
    }
    const phoneExists = phone
      ? store.users.find((entry) => normalizePhone(entry.phone || "") === phone)
      : null;
    if (phone && phoneExists) {
      sendJson(res, 400, { error: "Mobile number already registered" });
      return;
    }

    const user = {
      id: `user-${Date.now()}`,
      name,
      email,
      passwordHash: hashPassword(password),
      phone,
      avatar: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      role: "customer",
    };

    store.users.push(user);
    await writeStore(store);
    otpStore.register.delete(email);

    const token = generateAuthToken(user);
    sendJson(res, 201, { token, user: publicUser(user) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register/send-otp") {
    const body = await parseBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!name || !email) {
      sendJson(res, 400, { error: "Name and valid email are required" });
      return;
    }
    const exists = store.users.find((entry) => entry.email.toLowerCase() === email);
    if (exists) {
      sendJson(res, 400, { error: "Email already registered" });
      return;
    }
    try {
      enforceOtpRateLimit(`register:${email}`);
      const otp = createOtpRecord(otpStore.register, email);
      await sendOtpToEmail(email, otp);
      sendJson(res, 200, { success: true, message: "OTP sent" });
    } catch (error) {
      sendJson(res, 429, { error: error.message || "Failed to send OTP" });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/me") {
    const user = getUserFromRequest(req, store);
    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/reset-password") {
    const body = await parseBody(req);
    const identifier = String(body.identifier || body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();
    const password = String(body.password || "");
    const user = store.users.find((entry) => entry.email.toLowerCase() === identifier);
    if (!user) {
      sendJson(res, 404, { error: "Account not found" });
      return;
    }
    const email = user.email.toLowerCase();

    if (!otp) {
      sendJson(res, 400, { error: "OTP is required" });
      return;
    }
    if (!verifyOtpRecord(otpStore.reset, email, otp)) {
      sendJson(res, 400, { error: "Invalid OTP" });
      return;
    }

    if (!password) {
      sendJson(res, 400, { error: "New password is required" });
      return;
    }
    if (!isStrongPassword(password)) {
      sendJson(res, 400, { error: "Password must be 8+ chars with uppercase, lowercase, number, and special character" });
      return;
    }

    user.passwordHash = hashPassword(password);
    delete user.password;
    await writeStore(store);
    otpStore.reset.delete(email);
    sendJson(res, 200, { success: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/reset-password/send-otp") {
    const body = await parseBody(req);
    const identifier = String(body.identifier || body.email || "").trim().toLowerCase();
    if (!identifier) {
      sendJson(res, 400, { error: "Registered email is required" });
      return;
    }
    const user = store.users.find((entry) => entry.email.toLowerCase() === identifier);
    if (!user) {
      sendJson(res, 404, { error: "Account not found" });
      return;
    }
    try {
      enforceOtpRateLimit(`reset:${user.email.toLowerCase()}`);
      const otp = createOtpRecord(otpStore.reset, user.email.toLowerCase());
      await sendOtpToEmail(user.email.toLowerCase(), otp);
      sendJson(res, 200, { success: true, message: "OTP sent" });
    } catch (error) {
      sendJson(res, 429, { error: error.message || "Failed to send OTP" });
    }
    return;
  }

  if (req.method === "PUT" && pathname === "/api/auth/profile") {
    const user = getUserFromRequest(req, store);
    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const body = await parseBody(req);
    user.name = String(body.name || user.name || "").trim();
    user.phone = String(body.phone || user.phone || "").trim();
    user.avatar = String(body.avatar || user.avatar || "").trim();
    user.address = String(body.address || user.address || "").trim();
    user.city = String(body.city || user.city || "").trim();
    user.state = String(body.state || user.state || "").trim();
    user.zip = String(body.zip || user.zip || "").trim();

    await writeStore(store);
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/orders/my") {
    const user = getUserFromRequest(req, store);
    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const orders = store.orders.filter(
      (order) => order.userId === user.id || order.customer.email === user.email
    );
    sendJson(res, 200, { orders });
    return;
  }

  if (req.method === "POST" && pathname === "/api/checkout") {
    const user = getUserFromRequest(req, store);
    if (!user) {
      sendJson(res, 401, { error: "Login required for checkout" });
      return;
    }

    const body = await parseBody(req);
    const { items = [], customer = {}, payment = {} } = body;
    try {
      const order = buildOrderAndApplyStock(store, user, customer, payment, items);
      await writeStore(store);
      sendJson(res, 201, { order });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Checkout failed" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/payment/razorpay/order") {
    const user = getUserFromRequest(req, store);
    if (!user) {
      sendJson(res, 401, { error: "Login required" });
      return;
    }
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      sendJson(res, 500, { error: "Razorpay is not configured" });
      return;
    }

    const body = await parseBody(req);
    const { items = [] } = body;
    const totals = calculateOrderTotals(items, store.products);
    if (!totals.detailedItems.length) {
      sendJson(res, 400, { error: "Cart is empty" });
      return;
    }

    const postData = JSON.stringify({
      amount: Math.round(totals.total * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
    });
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    try {
      const response = await doHttpsRequest(
        {
          hostname: "api.razorpay.com",
          path: "/v1/orders",
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
          },
        },
        postData
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        sendJson(res, 500, { error: "Failed to create Razorpay order" });
        return;
      }
      const razorpayOrder = JSON.parse(response.body || "{}");
      sendJson(res, 200, {
        keyId: RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
      });
    } catch (error) {
      sendJson(res, 500, { error: "Razorpay request failed" });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/payment/razorpay/verify") {
    const user = getUserFromRequest(req, store);
    if (!user) {
      sendJson(res, 401, { error: "Login required" });
      return;
    }
    if (!RAZORPAY_KEY_SECRET) {
      sendJson(res, 500, { error: "Razorpay is not configured" });
      return;
    }

    const body = await parseBody(req);
    const {
      customer = {},
      items = [],
      razorpay_order_id = "",
      razorpay_payment_id = "",
      razorpay_signature = "",
    } = body;

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");
    if (expected !== razorpay_signature) {
      sendJson(res, 400, { error: "Invalid payment signature" });
      return;
    }
    try {
      const order = buildOrderAndApplyStock(
        store,
        user,
        customer,
        {
          method: "Razorpay",
          status: "Paid",
          reference: razorpay_payment_id,
        },
        items
      );
      await writeStore(store);
      sendJson(res, 201, { order });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Order creation failed" });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/summary") {
    const user = requireRole(req, res, store, "admin");
    if (!user) {
      return;
    }

    const revenue = store.orders.reduce((sum, order) => sum + order.total, 0);
    const lowStock = store.products.filter((product) => product.stock <= 10);
    sendJson(res, 200, {
      admin: publicUser(user),
      stats: {
        revenue,
        orders: store.orders.length,
        products: store.products.length,
        lowStock: lowStock.length,
      },
      products: store.products,
      orders: store.orders,
      settings: store.settings,
    });
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/admin/orders/")) {
    const user = requireRole(req, res, store, "admin");
    if (!user) {
      return;
    }
    const id = pathname.split("/").pop();
    const body = await parseBody(req);
    const status = String(body.status || "").trim();
    if (!["Pending", "Hold", "Ready to Ship", "Shipped", "Delivered", "Cancelled"].includes(status)) {
      sendJson(res, 400, { error: "Invalid order status" });
      return;
    }
    const index = store.orders.findIndex((order) => order.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: "Order not found" });
      return;
    }
    store.orders[index].status = status;
    await writeStore(store);
    sendJson(res, 200, { order: store.orders[index] });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/admin/settings/categories") {
    const user = requireRole(req, res, store, "admin");
    if (!user) {
      return;
    }
    const body = await parseBody(req);
    const categories = Array.isArray(body.categories)
      ? [...new Set(body.categories.map((entry) => String(entry || "").trim()).filter(Boolean))]
      : [];
    store.settings = store.settings || {};
    store.settings.categories = categories;
    await writeStore(store);
    sendJson(res, 200, { categories });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/products") {
    const user = requireRole(req, res, store, "admin");
    if (!user) {
      return;
    }

    const body = await parseBody(req);
    const product = sanitizeProduct(body);
    store.products.unshift(product);
    await writeStore(store);
    sendJson(res, 201, { product });
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/admin/products/")) {
    const user = requireRole(req, res, store, "admin");
    if (!user) {
      return;
    }

    const id = pathname.split("/").pop();
    const index = store.products.findIndex((item) => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: "Product not found" });
      return;
    }

    const body = await parseBody(req);
    const originalProduct = store.products[index];
    const updatedProduct = sanitizeProduct(body, originalProduct);
    const duplicateId = store.products.find(
      (item, itemIndex) => item.id === updatedProduct.id && itemIndex !== index
    );

    if (duplicateId) {
      sendJson(res, 400, { error: "Product ID already exists" });
      return;
    }

    store.products[index] = updatedProduct;
    remapProductReferences(store, originalProduct.id, updatedProduct.id);
    await writeStore(store);
    sendJson(res, 200, { product: store.products[index] });
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/admin/products/")) {
    const user = requireRole(req, res, store, "admin");
    if (!user) {
      return;
    }

    const id = pathname.split("/").pop();
    const nextProducts = store.products.filter((item) => item.id !== id);
    if (nextProducts.length === store.products.length) {
      sendJson(res, 404, { error: "Product not found" });
      return;
    }
    store.products = nextProducts;
    await writeStore(store);
    sendJson(res, 200, { success: true });
    return;
  }

  sendJson(res, 404, { error: "Endpoint not found" });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  try {
    if (parsedUrl.pathname.startsWith("/api/")) {
      await handleApi(req, res, parsedUrl);
      return;
    }

    let filePath = path.join(
      PUBLIC_DIR,
      parsedUrl.pathname === "/" ? "index.html" : parsedUrl.pathname
    );

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, "index.html");
    }

    sendFile(res, filePath);
  } catch (error) {
    sendJson(res, 500, { error: "Internal server error", details: error.message });
  }
});

async function startServer() {
  ensureStore();
  try {
    const mongoReady = await initMongoStore();
    if (mongoReady) {
      console.log(
        `MongoDB connected (${MONGO_DB_NAME}: ${MONGO_USERS_COLLECTION}, ${MONGO_PRODUCTS_COLLECTION}, ${MONGO_ORDERS_COLLECTION}, ${MONGO_SETTINGS_COLLECTION})`
      );
    } else {
      console.log("MongoDB not configured. Using file store fallback.");
    }
  } catch (error) {
    console.error(`MongoDB init failed, falling back to file store: ${error.message}`);
  }

  server.listen(PORT, () => {
    console.log(`The Moharani server running at http://localhost:${PORT}`);
  });
}

startServer();
