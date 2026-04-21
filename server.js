const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

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

const sessions = new Map();

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
          role: "admin",
        },
        {
          id: "user-1",
          name: "Priya Sharma",
          email: "customer@themoharani.com",
          password: "user123",
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

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
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
    role: user.role,
  };
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getUserFromRequest(req, store) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  const token = auth.slice(7);
  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  return store.users.find((user) => user.id === session.userId) || null;
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

async function handleApi(req, res, parsedUrl) {
  const store = readStore();
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
    const user = store.users.find(
      (entry) => entry.email === body.email && entry.password === body.password
    );

    if (!user) {
      sendJson(res, 401, { error: "Invalid email or password" });
      return;
    }

    const token = generateToken();
    sessions.set(token, { userId: user.id, createdAt: Date.now() });
    sendJson(res, 200, { token, user: publicUser(user) });
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

  if (req.method === "POST" && pathname === "/api/checkout") {
    const body = await parseBody(req);
    const { items = [], customer = {}, payment = {} } = body;
    const totals = calculateOrderTotals(items, store.products);

    if (!totals.detailedItems.length) {
      sendJson(res, 400, { error: "Cart is empty" });
      return;
    }

    const order = {
      id: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zip: customer.zip || "",
      },
      payment: {
        method: payment.method || "Card",
        status: "Paid",
      },
      status: "Processing",
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
    writeStore(store);
    sendJson(res, 201, { order });
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

  if (req.method === "POST" && pathname === "/api/admin/products") {
    const user = requireRole(req, res, store, "admin");
    if (!user) {
      return;
    }

    const body = await parseBody(req);
    const product = sanitizeProduct(body);
    store.products.unshift(product);
    writeStore(store);
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
    writeStore(store);
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
    writeStore(store);
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

ensureStore();
server.listen(PORT, () => {
  console.log(`The Moharani server running at http://localhost:${PORT}`);
});
