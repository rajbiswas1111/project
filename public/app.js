const state = {
  products: [],
  categories: loadJson("moharani-categories", []),
  cart: loadJson("moharani-cart", []),
  wishlist: loadJson("moharani-wishlist", []),
  auth: loadSessionJson("moharani-auth", null),
  activeCategory: "All",
  searchQuery: "",
  editingProductId: null,
};

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function loadSessionJson(key, fallback) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveCart() {
  localStorage.setItem("moharani-cart", JSON.stringify(state.cart));
  updateCounts();
}

function saveWishlist() {
  localStorage.setItem("moharani-wishlist", JSON.stringify(state.wishlist));
  updateCounts();
}

function saveProducts(products) {
  state.products = products;
  localStorage.setItem("moharani-products", JSON.stringify(products));
}

function saveCategories(categories) {
  state.categories = categories;
  localStorage.setItem("moharani-categories", JSON.stringify(categories));
}

function saveAuth(auth) {
  state.auth = auth;
  if (auth) {
    sessionStorage.setItem("moharani-auth", JSON.stringify(auth));
    localStorage.removeItem("moharani-auth");
  } else {
    sessionStorage.removeItem("moharani-auth");
    localStorage.removeItem("moharani-auth");
  }
  updateNavAuthState();
}

function loadLocalUsers() {
  const fallback = Array.isArray(window.MOHARANI_USERS) ? window.MOHARANI_USERS : [];
  const stored = loadJson("moharani-users", null);
  if (Array.isArray(stored) && stored.length) {
    return stored;
  }
  return fallback;
}

function saveLocalUsers(users) {
  localStorage.setItem("moharani-users", JSON.stringify(users));
}

function loadLocalOtpStore() {
  return loadJson("moharani-otp-store", {
    register: {},
    reset: {},
  });
}

function saveLocalOtpStore(store) {
  localStorage.setItem("moharani-otp-store", JSON.stringify(store));
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function validateStrongPassword(password = "") {
  const rule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return rule.test(String(password));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function toPublicUser(user) {
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

function localLogin(email, password) {
  const users = loadLocalUsers();
  const identifier = String(email || "").trim().toLowerCase();
  const user = users.find((entry) => {
    const byEmail = entry.email.toLowerCase() === identifier;
    return byEmail && entry.password === password;
  });
  if (!user) {
    throw new Error("Invalid email or password");
  }
  return {
    token: `local-${user.id}`,
    user: toPublicUser(user),
  };
}

function localRegister(payload) {
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const phone = normalizePhone(payload.phone || "");
  const users = loadLocalUsers();
  const otpStore = loadLocalOtpStore();

  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required");
  }
  if (phone && phone.length !== 10) {
    throw new Error("Enter a valid 10-digit mobile number");
  }
  if (!validateStrongPassword(password)) {
    throw new Error(
      "Password must be 8+ chars with uppercase, lowercase, number, and special character"
    );
  }
  if (!payload.otp) {
    throw new Error("OTP is required");
  }
  if (otpStore.register[email] !== String(payload.otp || "").trim()) {
    throw new Error("Invalid OTP");
  }

  const exists = users.find((entry) => entry.email.toLowerCase() === email);
  if (exists) {
    throw new Error("Email already registered");
  }
  const phoneExists = users.find((entry) => normalizePhone(entry.phone || "") === phone);
  if (phoneExists) {
    throw new Error("Mobile number already registered");
  }

  const user = {
    id: `user-${Date.now()}`,
    name,
    email,
    password,
    phone,
    avatar: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    role: "customer",
  };

  users.push(user);
  saveLocalUsers(users);
  delete otpStore.register[email];
  saveLocalOtpStore(otpStore);
  return {
    token: `local-${user.id}`,
    user: toPublicUser(user),
  };
}

function localSendRegisterOtp(payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = normalizePhone(payload.phone || "");
  const name = String(payload.name || "").trim();
  if (!name || !email) {
    throw new Error("Name and valid email are required");
  }
  const users = loadLocalUsers();
  const exists = users.find((entry) => entry.email.toLowerCase() === email);
  if (exists) {
    throw new Error("Email already registered");
  }
  const otpStore = loadLocalOtpStore();
  const otp = generateOtp();
  otpStore.register[email] = otp;
  saveLocalOtpStore(otpStore);
  return otp;
}

function localResetPassword(payload) {
  const identifier = String(payload.identifier || payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const otp = String(payload.otp || "").trim();
  const users = loadLocalUsers();
  const otpStore = loadLocalOtpStore();
  const index = users.findIndex((entry) => entry.email.toLowerCase() === identifier);
  const userEmail = index >= 0 ? users[index].email.toLowerCase() : "";
  if (index === -1) {
    throw new Error("Account not found");
  }
  if (!otp) {
    throw new Error("OTP is required");
  }
  if (otpStore.reset[userEmail] !== otp) {
    throw new Error("Invalid OTP");
  }
  if (!password) {
    throw new Error("New password is required");
  }
  if (!validateStrongPassword(password)) {
    throw new Error(
      "Password must be 8+ chars with uppercase, lowercase, number, and special character"
    );
  }
  users[index].password = password;
  saveLocalUsers(users);
  delete otpStore.reset[userEmail];
  saveLocalOtpStore(otpStore);
}

function localSendResetOtp(payload) {
  const identifier = String(payload.identifier || payload.email || "").trim().toLowerCase();
  if (!identifier) {
    throw new Error("Registered email is required");
  }
  const users = loadLocalUsers();
  const user = users.find((entry) => entry.email.toLowerCase() === identifier);
  if (!user) {
    throw new Error("Account not found");
  }
  const otpStore = loadLocalOtpStore();
  const otp = generateOtp();
  otpStore.reset[user.email.toLowerCase()] = otp;
  saveLocalOtpStore(otpStore);
  return otp;
}

function localUpdateProfile(payload) {
  const users = loadLocalUsers();
  const userId = state.auth?.user?.id;
  const index = users.findIndex((entry) => entry.id === userId);
  if (index === -1) {
    throw new Error("Customer account not found");
  }

  users[index] = {
    ...users[index],
    name: String(payload.name || users[index].name || "").trim(),
    phone: String(payload.phone || users[index].phone || "").trim(),
    avatar: String(payload.avatar || users[index].avatar || "").trim(),
    address: String(payload.address || users[index].address || "").trim(),
    city: String(payload.city || users[index].city || "").trim(),
    state: String(payload.state || users[index].state || "").trim(),
    zip: String(payload.zip || users[index].zip || "").trim(),
  };

  saveLocalUsers(users);
  return toPublicUser(users[index]);
}

function loadLocalOrders() {
  return loadJson("moharani-orders", []);
}

function saveLocalOrders(orders) {
  localStorage.setItem("moharani-orders", JSON.stringify(orders));
}

function updateLocalOrderStatus(orderId, status) {
  const orders = loadLocalOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) {
    throw new Error("Order not found");
  }
  orders[index] = {
    ...orders[index],
    status,
  };
  saveLocalOrders(orders);
  return orders[index];
}

function loadLocalProducts() {
  const fallback = Array.isArray(window.MOHARANI_CATALOG) ? window.MOHARANI_CATALOG : [];
  return loadJson("moharani-products", fallback);
}

function isLocalFetchError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("failed") || message.includes("fetch");
}

function getLocalAdminSummary() {
  const products = loadLocalProducts();
  const orders = loadLocalOrders();
  const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock) <= 10);
  return {
    admin: state.auth?.user || {
      name: "Moharani Admin",
      role: "admin",
    },
    stats: {
      revenue,
      orders: orders.length,
      products: products.length,
      lowStock: lowStock.length,
    },
    products,
    orders,
  };
}

function mergeAdminSummary(summary = {}) {
  const localSummary = getLocalAdminSummary();
  const summaryProducts = Array.isArray(summary.products) ? summary.products : [];
  const summaryOrders = Array.isArray(summary.orders) ? summary.orders : [];
  const mergedProducts = summaryProducts.length ? summaryProducts : localSummary.products;
  const mergedOrders = [
    ...summaryOrders,
    ...localSummary.orders.filter(
      (localOrder) => !summaryOrders.some((order) => order.id === localOrder.id)
    ),
  ];

  return {
    admin: summary.admin || localSummary.admin,
    products: mergedProducts,
    orders: mergedOrders,
    stats: {
      revenue: mergedOrders.reduce((sum, order) => sum + (order.total || 0), 0),
      orders: mergedOrders.length,
      products: mergedProducts.length,
      lowStock: mergedProducts.filter((product) => Number(product.stock) <= 10).length,
    },
  };
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function discountPercent(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) {
    return 0;
  }
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function productRating(product) {
  const ratings = {
    TM001: { rating: 4.9, reviews: 2566, label: "Ready To Wear" },
    TM002: { rating: 4.8, reviews: 280, label: "New" },
    TM003: { rating: 4.7, reviews: 46, label: "Popular" },
    TM004: { rating: 4.9, reviews: 512, label: "New" },
    TM005: { rating: 4.8, reviews: 189, label: "Ready To Wear" },
    TM006: { rating: 4.7, reviews: 124, label: "Premium" },
  };
  return ratings[product.id] || { rating: 4.8, reviews: 120, label: product.badge || "New" };
}

function starRow(rating) {
  const full = Math.round(rating);
  return `${"★".repeat(full)}${"☆".repeat(Math.max(0, 5 - full))}`;
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.auth?.token) {
    headers.Authorization = `Bearer ${state.auth.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && state.auth) {
      saveAuth(null);
    }
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function updateCounts() {
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = state.wishlist.length;
  document.querySelectorAll("#cartCount").forEach((item) => {
    item.textContent = cartCount;
  });
  document.querySelectorAll("#wishlistCount").forEach((item) => {
    item.textContent = wishlistCount;
  });
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) {
    return "U";
  }
  return parts.map((part) => part[0].toUpperCase()).join("");
}

function getCurrentPageTarget() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  return `${page}${window.location.search || ""}`;
}

function redirectToLogin(target = getCurrentPageTarget()) {
  window.location.href = `./login.html?redirect=${encodeURIComponent(target)}`;
}

function handlePostAuthRedirect(userRole) {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (redirect) {
    window.location.href = `./${redirect}`;
    return true;
  }
  if (userRole === "admin") {
    window.location.href = "./moharani-studio.html";
    return true;
  }
  window.location.href = "./index.html";
  return true;
}

function updateNavAuthState() {
  document.querySelectorAll(".main-nav").forEach((nav) => {
    const loginLink = nav.querySelector('a[href="./login.html"]');
    let navUser = nav.querySelector(".nav-user");

    if (state.auth?.user) {
      if (loginLink) {
        loginLink.style.display = "none";
      }
      if (!navUser) {
        navUser = document.createElement("div");
        navUser.className = "nav-user";
        nav.appendChild(navUser);
      }
      const profileHref =
        state.auth.user.role === "admin" ? "./moharani-studio.html" : "./profile.html";
      const avatarMarkup = state.auth.user.avatar
        ? `<img class="nav-avatar-image" src="${state.auth.user.avatar}" alt="${state.auth.user.name}" />`
        : `<span class="nav-avatar">${getInitials(state.auth.user.name)}</span>`;
      navUser.innerHTML = `
        <a class="nav-user-pill" href="${profileHref}">
          ${avatarMarkup}
          <span class="nav-user-name">${state.auth.user.name}</span>
        </a>
      `;
      if (state.auth.user.role === "admin") {
        navUser.insertAdjacentHTML(
          "beforeend",
          '<button type="button" class="nav-logout-btn">Logout</button>'
        );
        navUser.querySelector(".nav-logout-btn").addEventListener("click", () => {
          saveAuth(null);
          window.location.href = "./login.html";
        });
      }
    } else {
      if (loginLink) {
        loginLink.style.display = "";
      }
      if (navUser) {
        navUser.remove();
      }
    }
  });
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-toggle-target]").forEach((button) => {
    if (button.dataset.bound === "true") {
      return;
    }
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.toggleTarget);
      if (!target) {
        return;
      }
      const show = target.type === "password";
      target.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
    });
  });
}

function setupAuthTabs() {
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");
  if (!tabs.length || !panels.length) {
    return;
  }

  const setTab = (target) => {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.authTab === target);
    });
    panels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.authPanel !== target);
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.authTab));
  });

  setTab("login");
}

function requireAuthForCheckout() {
  if (state.auth?.user) {
    return true;
  }
  redirectToLogin("checkout.html");
  return false;
}

async function loadCustomerOrders() {
  if (!state.auth?.user) {
    return [];
  }

  try {
    const data = await api("/api/orders/my");
    return Array.isArray(data.orders) ? data.orders : [];
  } catch (error) {
    const localOrders = loadLocalOrders();
    return localOrders.filter(
      (order) =>
        order.userId === state.auth.user.id ||
        order.customer?.email === state.auth.user.email
    );
  }
}

async function setupProfilePage() {
  const form = document.getElementById("profileForm");
  const ordersMount = document.getElementById("profileOrders");
  const avatarPreview = document.getElementById("profileAvatarPreview");
  const profileName = document.getElementById("profileHeadingName");
  const profileEmail = document.getElementById("profileHeadingEmail");

  if (!form) {
    return;
  }

  if (!state.auth?.user) {
    redirectToLogin("profile.html");
    return;
  }

  const user = state.auth.user;
  form.elements.name.value = user.name || "";
  form.elements.email.value = user.email || "";
  form.elements.phone.value = user.phone || "";
  form.elements.avatar.value = user.avatar || "";
  form.elements.address.value = user.address || "";
  form.elements.city.value = user.city || "";
  form.elements.state.value = user.state || "";
  form.elements.zip.value = user.zip || "";

  const renderProfileHeader = (currentUser) => {
    if (profileName) {
      profileName.textContent = currentUser.name || "Customer Profile";
    }
    if (profileEmail) {
      profileEmail.textContent = currentUser.email || "";
    }
    if (avatarPreview) {
      avatarPreview.innerHTML = currentUser.avatar
        ? `<img src="${currentUser.avatar}" alt="${currentUser.name}" />`
        : `<span>${getInitials(currentUser.name)}</span>`;
    }
  };

  renderProfileHeader(user);

  form.elements.avatar.addEventListener("input", () => {
    renderProfileHeader({
      ...state.auth.user,
      name: form.elements.name.value,
      avatar: form.elements.avatar.value,
      email: form.elements.email.value,
    });
  });

  form.elements.name.addEventListener("input", () => {
    renderProfileHeader({
      ...state.auth.user,
      name: form.elements.name.value,
      avatar: form.elements.avatar.value,
      email: form.elements.email.value,
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("profileMessage");
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      let nextUser;
      try {
        const data = await api("/api/auth/profile", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        nextUser = data.user;
      } catch (error) {
        if (!isLocalFetchError(error)) {
          throw error;
        }
        nextUser = localUpdateProfile(payload);
      }

      saveAuth({
        token: state.auth.token,
        user: nextUser,
      });
      renderProfileHeader(nextUser);
      message.textContent = "Profile saved successfully.";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  const logoutButton = document.getElementById("profileLogoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      saveAuth(null);
      window.location.href = "./login.html";
    });
  }

  if (ordersMount) {
    const orders = await loadCustomerOrders();
    ordersMount.innerHTML = orders.length
      ? orders
          .slice(0, 6)
          .map(
            (order) => `
              <article class="profile-order-card">
                <div class="between">
                  <strong>${order.id}</strong>
                  <span>${currency(order.total)}</span>
                </div>
                <p>${new Date(order.createdAt).toLocaleDateString("en-IN")} | ${order.status}</p>
                <a class="small-btn" href="./order-tracking.html?id=${order.id}">Track Order</a>
              </article>
            `
          )
          .join("")
      : "<p class='status-text'>No orders yet.</p>";
  }
}

async function renderOrderTrackingPage() {
  const mount = document.getElementById("trackingMount");
  if (!mount) {
    return;
  }
  if (!state.auth?.user) {
    redirectToLogin("order-tracking.html");
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get("id");
  if (!targetId) {
    mount.innerHTML = "<p class='status-text'>Order ID missing.</p>";
    return;
  }
  const orders = await loadCustomerOrders();
  const order = orders.find((entry) => entry.id === targetId);
  if (!order) {
    mount.innerHTML = "<p class='status-text'>Order not found.</p>";
    return;
  }

  const baseFlow = ["Pending", "Hold", "Ready to Ship", "Shipped", "Delivered"];
  const currentStatus = String(order.status || "Pending");
  let timeline = baseFlow;
  if (currentStatus === "Cancelled") {
    timeline = ["Pending", "Cancelled"];
  }
  const reachedIndex = timeline.indexOf(currentStatus);
  mount.innerHTML = `
    <div class="tracking-head">
      <p><strong>Order:</strong> ${order.id}</p>
      <p><strong>Status:</strong> ${currentStatus}</p>
      <p><strong>Placed:</strong> ${new Date(order.createdAt).toLocaleString("en-IN")}</p>
    </div>
    <div class="tracking-timeline">
      ${timeline
        .map((status, index) => {
          const active = reachedIndex >= index ? "active" : "";
          const current = currentStatus === status ? "current" : "";
          return `<div class="tracking-step ${active} ${current}">
            <span class="tracking-dot"></span>
            <span>${status}</span>
          </div>`;
        })
        .join("")}
    </div>
    <div class="tracking-items">
      ${(order.items || [])
        .map(
          (item) => `
          <div class="summary-line">
            <span>${item.name} x ${item.quantity}</span>
            <strong>${currency(item.lineTotal)}</strong>
          </div>
        `
        )
        .join("")}
      <div class="summary-line"><span>Total</span><strong>${currency(order.total)}</strong></div>
    </div>
  `;
}

function setupMobileMenu() {
  const shell = document.querySelector(".nav-shell");
  const nav = document.querySelector(".main-nav");
  if (!shell || !nav || shell.querySelector(".menu-toggle")) {
    return;
  }

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "menu-toggle";
  toggle.setAttribute("aria-label", "Open menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = "<span></span><span></span><span></span>";
  shell.insertBefore(toggle, nav);

  const closeMenu = () => {
    nav.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      closeMenu();
    }
  });
}

function setupHomeSlider() {
  const track = document.getElementById("homeSliderTrack");
  const dots = Array.from(document.querySelectorAll(".home-slider-dot"));
  if (!track || !dots.length) {
    return;
  }

  let currentIndex = 0;
  let timerId = null;

  const goToSlide = (index) => {
    currentIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === index);
    });
  };

  const startAutoSlide = () => {
    clearInterval(timerId);
    timerId = setInterval(() => {
      const nextIndex = (currentIndex + 1) % dots.length;
      goToSlide(nextIndex);
    }, 3000);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      goToSlide(index);
      startAutoSlide();
    });
  });

  goToSlide(0);
  startAutoSlide();
}

function isWishlisted(productId) {
  return state.wishlist.includes(productId);
}

function toggleWishlist(productId) {
  if (isWishlisted(productId)) {
    state.wishlist = state.wishlist.filter((id) => id !== productId);
  } else {
    state.wishlist.push(productId);
  }
  saveWishlist();
  if (document.body.dataset.page === "wishlist") {
    renderWishlist();
  } else if (document.body.dataset.page === "home") {
    renderHome();
  } else if (document.body.dataset.page === "product") {
    renderProductDetail();
  } else {
    renderCurrentProductGrid();
  }
}

function showAddToCartToast(text = "Added to cart") {
  let toast = document.getElementById("cartToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cartToast";
    toast.className = "cart-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.remove("show");
  requestAnimationFrame(() => toast.classList.add("show"));
  clearTimeout(showAddToCartToast.timer);
  showAddToCartToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1200);
}

function addToCart(productId, sourceButton = null) {
  const existing = state.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }
  saveCart();
  if (sourceButton) {
    sourceButton.classList.add("added");
    sourceButton.textContent = "Added";
    setTimeout(() => {
      sourceButton.classList.remove("added");
      sourceButton.textContent = "Add to Cart";
    }, 850);
  }
  showAddToCartToast("Added to cart");
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);
  saveCart();
  renderCart();
  renderCheckoutSummary();
}

function updateQuantity(productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  if (!item) {
    return;
  }

  item.quantity = Math.max(1, item.quantity + delta);
  saveCart();
  renderCart();
  renderCheckoutSummary();
}

function getCheckoutItems() {
  const buyNowItems = loadJson("moharani-buy-now", null);
  if (Array.isArray(buyNowItems) && buyNowItems.length) {
    return buyNowItems;
  }
  return state.cart;
}

function clearBuyNowItems() {
  localStorage.removeItem("moharani-buy-now");
}

function getCartDetails(items = state.cart) {
  const details = items
    .map((item) => {
      const product = state.products.find((entry) => entry.id === item.productId);
      if (!product) {
        return null;
      }
      return {
        ...product,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      };
    })
    .filter(Boolean);

  const subtotal = details.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 5000 ? 0 : subtotal > 0 ? 149 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;

  return { details, subtotal, shipping, tax, total };
}

function createLocalOrder(payload, items = getCheckoutItems()) {
  const authUser = state.auth?.user || {};
  const { details, subtotal, shipping, tax, total } = getCartDetails(items);
  const order = {
    id: `ORD-${Date.now()}`,
    createdAt: new Date().toISOString(),
    userId: authUser.id || "",
    customer: {
      name: payload.name || authUser.name || "",
      email: payload.email || authUser.email || "",
      phone: payload.phone || "",
      address: payload.address || "",
      city: payload.city || "",
      state: payload.state || "",
      zip: payload.zip || "",
    },
    payment: {
      method: payload.method || "Card",
      status: "Paid",
    },
    status: "Pending",
    items: details.map((item) => ({
      productId: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal,
    shipping,
    tax,
    total,
  };

  const orders = loadLocalOrders();
  orders.unshift(order);
  saveLocalOrders(orders);
  const nextProducts = loadLocalProducts().map((product) => {
    const orderedItem = details.find((item) => item.id === product.id);
    if (!orderedItem) {
      return product;
    }
    return {
      ...product,
      stock: Math.max(0, Number(product.stock) - Number(orderedItem.quantity)),
    };
  });
  saveProducts(nextProducts);
  return order;
}

function saveLocalAdminProduct(payload, originalId = null) {
  const products = loadLocalProducts();
  const gallery = [
    payload.image,
    payload.gallery1,
    payload.gallery2,
    payload.gallery3,
    payload.gallery4,
  ].filter(Boolean);
  const nextProduct = {
    id: payload.id,
    name: payload.name,
    category: payload.category,
    fabric: payload.fabric,
    price: Number(payload.price),
    oldPrice: Number(payload.oldPrice),
    stock: Number(payload.stock),
    featured: Boolean(payload.featured),
    image: payload.image,
    gallery: gallery.length ? gallery : [payload.image],
    badge: payload.badge,
    shortDescription: payload.shortDescription,
    description: payload.description,
  };

  const duplicate = products.find(
    (product) => product.id === nextProduct.id && product.id !== originalId
  );
  if (duplicate) {
    throw new Error("Product ID already exists");
  }

  let nextProducts;
  if (originalId) {
    nextProducts = products.map((product) =>
      product.id === originalId ? nextProduct : product
    );
    const orders = loadLocalOrders().map((order) => ({
      ...order,
      items: order.items.map((item) =>
        item.productId === originalId
          ? {
              ...item,
              productId: nextProduct.id,
              name: nextProduct.name,
              price: nextProduct.price,
              lineTotal: nextProduct.price * item.quantity,
            }
          : item
      ),
    }));
    saveLocalOrders(orders);
  } else {
    nextProducts = [nextProduct, ...products];
  }

  saveProducts(nextProducts);
}

function deleteLocalAdminProduct(productId) {
  const nextProducts = loadLocalProducts().filter((product) => product.id !== productId);
  saveProducts(nextProducts);
}

function productCard(product) {
  const heart = isWishlisted(product.id) ? "&#9829;" : "&#9825;";
  const activeClass = isWishlisted(product.id) ? "active" : "";
  const ratingData = productRating(product);
  const discount = discountPercent(product.price, product.oldPrice);
  return `
    <article class="product-card">
      <div class="product-media">
        <span class="product-flag">${ratingData.label}</span>
        <button class="wishlist-btn ${activeClass}" data-wishlist="${product.id}" aria-label="Toggle wishlist">${heart}</button>
        <a class="product-image-link" href="./product.html?id=${product.id}">
          <img class="product-image" src="${product.image}" alt="${product.name}" />
        </a>
      </div>
      <div class="product-content">
        <a class="product-title-link" href="./product.html?id=${product.id}">
          <h3>${product.name}</h3>
        </a>
        <div class="product-buy-row">
          <div class="price-row">
            <span class="old-price">${currency(product.oldPrice)}</span>
            <strong>${currency(product.price)}</strong>
            ${discount ? `<span class="discount-pill">-${discount}%</span>` : ""}
          </div>
          <button class="card-cart-btn" data-add-cart="${product.id}">Add to Cart</button>
        </div>
        <div class="delivery-tag">Free Delivery</div>
        <div class="rating-line">
          <span class="stars">${starRow(ratingData.rating)}</span>
          <span>(${ratingData.reviews})</span>
        </div>
      </div>
    </article>
  `;
}

function bindProductButtons(scope = document) {
  scope.querySelectorAll("[data-add-cart]").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.addCart, button));
  });

  scope.querySelectorAll("[data-wishlist]").forEach((button) => {
    button.addEventListener("click", () => toggleWishlist(button.dataset.wishlist));
  });
}

function filteredProducts() {
  return state.products.filter((product) => {
    const matchesCategory =
      state.activeCategory === "All" || product.category === state.activeCategory;
    const searchText = [
      product.name,
      product.category,
      product.fabric,
      product.shortDescription,
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = searchText.includes(state.searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

async function loadProducts() {
  try {
    const data = await api("/api/products");
    saveProducts(data.products);
    const fromSettings = Array.isArray(data.settings?.categories) ? data.settings.categories : [];
    const fromProducts = [...new Set((data.products || []).map((item) => item.category).filter(Boolean))];
    const merged = [...new Set([...fromSettings, ...fromProducts])];
    saveCategories(merged);
    return data.products;
  } catch (error) {
    const fallback = loadLocalProducts();
    state.products = fallback;
    if (!state.categories.length) {
      saveCategories([...new Set(fallback.map((item) => item.category).filter(Boolean))]);
    }
    return fallback;
  }
}

function getCategoryEmoji(category = "") {
  const map = {
    Wedding: "👰",
    Festive: "🎉",
    Party: "✨",
    "Office Wear": "💼",
    "Daily Wear": "🌸",
    Reception: "👑",
  };
  return map[category] || "🧵";
}

function renderHomeCategories() {
  const mount = document.getElementById("homeCategoryRow");
  if (!mount) {
    return;
  }
  const categories = state.categories.length
    ? state.categories
    : [...new Set(state.products.map((item) => item.category).filter(Boolean))];
  mount.innerHTML = categories
    .slice(0, 8)
    .map(
      (category) =>
        `<a class="home-cat-pill" href="./products.html?category=${encodeURIComponent(category)}"><span>${getCategoryEmoji(
          category
        )}</span>${category}</a>`
    )
    .join("");
}

function renderCategoryFilters() {
  const mount = document.getElementById("categoryFilters");
  if (!mount) {
    return;
  }
  const categories = state.categories.length
    ? state.categories
    : [...new Set(state.products.map((item) => item.category).filter(Boolean))];
  mount.innerHTML = [
    `<button class="filter-chip ${state.activeCategory === "All" ? "active" : ""}" data-category="All">All</button>`,
    ...categories.map(
      (category) =>
        `<button class="filter-chip ${state.activeCategory === category ? "active" : ""}" data-category="${category}">${category}</button>`
    ),
  ].join("");
}

function renderCurrentProductGrid() {
  const page = document.body.dataset.page;
  if (page === "products") {
    const mount = document.getElementById("productsGrid");
    if (!mount) {
      return;
    }
    const products = filteredProducts();
    mount.innerHTML = products.length
      ? products.map(productCard).join("")
      : "<div class='panel'><h3>No products found</h3><p>Try another search or filter.</p></div>";
    bindProductButtons(mount);
  }
}

async function renderHome() {
  const featuredMount = document.getElementById("featuredProducts");
  if (!featuredMount) {
    return;
  }
  const featured = state.products.filter((product) => product.featured).slice(0, 8);
  const newArrivals = [...state.products].reverse().slice(0, 8);
  const budget = state.products
    .filter((product) => Number(product.price) <= 3000)
    .slice(0, 8);

  featuredMount.innerHTML = featured.map(productCard).join("");
  bindProductButtons(featuredMount);

  const newArrivalMount = document.getElementById("newArrivalProducts");
  if (newArrivalMount) {
    newArrivalMount.innerHTML = newArrivals.map(productCard).join("");
    bindProductButtons(newArrivalMount);
  }

  const budgetMount = document.getElementById("budgetProducts");
  if (budgetMount) {
    const budgetProducts = budget.length ? budget : state.products.slice(0, 8);
    budgetMount.innerHTML = budgetProducts.map(productCard).join("");
    bindProductButtons(budgetMount);
  }
  renderHomeCategories();
}

async function renderProducts() {
  renderCurrentProductGrid();
}

async function renderWishlist() {
  const mount = document.getElementById("wishlistGrid");
  if (!mount) {
    return;
  }
  const products = state.products.filter((product) => state.wishlist.includes(product.id));
  mount.innerHTML = products.length
    ? products.map(productCard).join("")
    : "<div class='panel'><h3>Your wishlist is empty</h3><p>Save sarees you love and they will appear here.</p></div>";
  bindProductButtons(mount);
}

async function renderProductDetail() {
  const mount = document.getElementById("productDetail");
  if (!mount) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    mount.innerHTML = "<div class='panel'><h3>Product not found</h3></div>";
    return;
  }

  let product;
  try {
    const response = await api(`/api/products/${id}`);
    product = response.product;
  } catch (error) {
    const fallback = state.products.find((item) => item.id === id);
    product = fallback || null;
  }

  if (!product) {
    mount.innerHTML = "<div class='panel'><h3>Product not found</h3><p>Please go back to the collection page.</p></div>";
    const relatedMount = document.getElementById("relatedProducts");
    if (relatedMount) {
      relatedMount.innerHTML = "";
    }
    return;
  }

  const gallery = product.gallery?.length
    ? product.gallery
    : [product.image, product.image, product.image];
  const heart = isWishlisted(product.id) ? "&#9829;" : "&#9825;";
  const activeClass = isWishlisted(product.id) ? "active" : "";
  const relatedMount = document.getElementById("relatedProducts");
  const related = state.products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, 4);
  mount.innerHTML = `
    <section class="detail-grid">
      <div class="panel detail-gallery">
        <img class="detail-main-image" src="${gallery[0]}" alt="${product.name}" />
        <div class="detail-thumbs">
          ${gallery
            .map(
              (image, index) =>
                `<img class="detail-thumb" src="${image}" alt="${product.name} view ${index + 1}" />`
            )
            .join("")}
        </div>
      </div>
      <div class="panel detail-copy">
        <button class="wishlist-btn ${activeClass}" data-wishlist="${product.id}" aria-label="Toggle wishlist">${heart}</button>
        <span class="badge">${product.badge}</span>
        <h1>${product.name}</h1>
        <div class="rating-row">
          <span>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          <span>4.8 rating</span>
        </div>
        <p>${product.description}</p>
        <div class="summary-line"><span>Category</span><strong>${product.category}</strong></div>
        <div class="summary-line"><span>Fabric</span><strong>${product.fabric}</strong></div>
        <div class="summary-line"><span>Stock</span><strong>${product.stock}</strong></div>
        <div class="price-row">
          <strong>${currency(product.price)}</strong>
          <span>${currency(product.oldPrice)}</span>
        </div>
        <div class="delivery-tag detail-delivery-tag">Free Delivery</div>
        <div class="inline-actions">
          <button class="btn btn-primary" data-add-cart="${product.id}">Add to Cart</button>
          <a class="small-btn" href="./checkout.html">Buy Now</a>
        </div>
      </div>
    </section>
  `;
  bindProductButtons(mount);
  if (relatedMount) {
    relatedMount.innerHTML = related.length
      ? related.map(productCard).join("")
      : state.products.filter((item) => item.id !== product.id).slice(0, 4).map(productCard).join("");
    bindProductButtons(relatedMount);
  }
}

function renderCart() {
  const itemsMount = document.getElementById("cartItems");
  const summaryMount = document.getElementById("cartSummary");
  if (!itemsMount || !summaryMount) {
    return;
  }

  const { details, subtotal, shipping, tax, total } = getCartDetails();
  itemsMount.innerHTML = details.length
    ? details
        .map(
          (item) => `
            <article class="cart-card">
              <div class="cart-item-header cart-item-row">
                <img class="cart-product-thumb" src="${item.image}" alt="${item.name}" />
                <div>
                  <h3>${item.name}</h3>
                  <p>${item.category} | ${item.fabric} | ID: ${item.id}</p>
                </div>
                <strong>${currency(item.lineTotal)}</strong>
              </div>
              <div class="between">
                <p>Qty: ${item.quantity}</p>
                <div class="inline-actions">
                  <button class="small-btn" data-qty="${item.id}" data-delta="-1">-</button>
                  <button class="small-btn" data-qty="${item.id}" data-delta="1">+</button>
                  <button class="small-btn" data-buy-now="${item.id}">Buy Now</button>
                  <button class="small-btn" data-remove="${item.id}">Remove</button>
                </div>
              </div>
            </article>
          `
        )
        .join("")
    : "<div class='cart-card'><h3>Your cart is empty</h3><p>Explore the collection and add your favorite sarees.</p></div>";

  summaryMount.innerHTML = `
    <div class="summary-line"><span>Subtotal</span><strong>${currency(subtotal)}</strong></div>
    <div class="summary-line"><span>Shipping</span><strong>${currency(shipping)}</strong></div>
    <div class="summary-line"><span>Tax</span><strong>${currency(tax)}</strong></div>
    <div class="summary-line"><span>Total</span><strong>${currency(total)}</strong></div>
  `;

  const checkoutLink = document.querySelector('a[href="./checkout.html"]');
  if (checkoutLink) {
    checkoutLink.style.display = details.length ? "" : "none";
  }

  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeFromCart(button.dataset.remove));
  });
  document.querySelectorAll("[data-qty]").forEach((button) => {
    button.addEventListener("click", () =>
      updateQuantity(button.dataset.qty, Number(button.dataset.delta))
    );
  });
  document.querySelectorAll("[data-buy-now]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.buyNow;
      const item = state.cart.find((entry) => entry.productId === id);
      if (!item) {
        return;
      }
      localStorage.setItem("moharani-buy-now", JSON.stringify([item]));
      window.location.href = "./checkout.html";
    });
  });

  const buyAllButton = document.getElementById("buyAllButton");
  if (buyAllButton) {
    buyAllButton.style.display = details.length ? "" : "none";
    buyAllButton.disabled = state.cart.length < 2;
    buyAllButton.onclick = () => {
      if (!state.cart.length) {
        return;
      }
      localStorage.setItem("moharani-buy-now", JSON.stringify(state.cart));
      window.location.href = "./checkout.html";
    };
  }
}

function renderCheckoutSummary() {
  const mount = document.getElementById("checkoutSummary");
  if (!mount) {
    return;
  }
  const checkoutItems = getCheckoutItems();
  const { details, subtotal, shipping, tax, total } = getCartDetails(checkoutItems);
  mount.innerHTML = `
    ${details
      .map(
        (item) =>
          `<div class="summary-line"><span>${item.name} x ${item.quantity}</span><strong>${currency(
            item.lineTotal
          )}</strong></div>`
      )
      .join("")}
    <div class="summary-line"><span>Subtotal</span><strong>${currency(subtotal)}</strong></div>
    <div class="summary-line"><span>Shipping</span><strong>${currency(shipping)}</strong></div>
    <div class="summary-line"><span>Tax</span><strong>${currency(tax)}</strong></div>
    <div class="summary-line"><span>Total Payable</span><strong>${currency(total)}</strong></div>
  `;
}

function showOrderSuccessAndRedirect() {
  const modal = document.getElementById("orderSuccessModal");
  if (!modal) {
    window.location.href = "./products.html";
    return;
  }
  modal.classList.remove("hidden");
  setTimeout(() => {
    window.location.href = "./products.html";
  }, 1700);
}

async function startRazorpayCheckout(payload, form, message) {
  const checkoutItems = getCheckoutItems();
  if (!checkoutItems.length) {
    throw new Error("Cart is empty");
  }
  if (typeof window.Razorpay !== "function") {
    throw new Error("Razorpay SDK failed to load");
  }

  const orderData = await api("/api/payment/razorpay/order", {
    method: "POST",
    body: JSON.stringify({
      items: checkoutItems,
    }),
  });

  await new Promise((resolve, reject) => {
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: "The Moharani",
      description: "Saree Order Payment",
      order_id: orderData.razorpayOrderId,
      prefill: {
        name: payload.name || "",
        email: payload.email || "",
        contact: payload.phone || "",
      },
      theme: {
        color: "#1d4ed8",
      },
      handler: async (response) => {
        try {
          await api("/api/payment/razorpay/verify", {
            method: "POST",
            body: JSON.stringify({
              customer: payload,
              items: checkoutItems,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled")),
      },
    };
    const gateway = new window.Razorpay(options);
    gateway.open();
  });

  const selectedIds = new Set(checkoutItems.map((item) => item.productId));
  state.cart = state.cart.filter((item) => !selectedIds.has(item.productId));
  clearBuyNowItems();
  saveCart();
  form.reset();
  message.textContent = "Payment successful. Order confirmed.";
  showOrderSuccessAndRedirect();
}

function setupCheckout() {
  const form = document.getElementById("checkoutForm");
  if (!form) {
    return;
  }

  if (!requireAuthForCheckout()) {
    return;
  }

  renderCheckoutSummary();
  if (state.auth?.user) {
    if (form.elements.name && !form.elements.name.value) {
      form.elements.name.value = state.auth.user.name || "";
    }
    if (form.elements.email && !form.elements.email.value) {
      form.elements.email.value = state.auth.user.email || "";
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("checkoutMessage");
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      if (payload.method === "Razorpay") {
        await startRazorpayCheckout(payload, form, message);
        return;
      }
      try {
        await api("/api/checkout", {
          method: "POST",
          body: JSON.stringify({
            customer: payload,
            payment: {
              method: payload.method,
              reference: payload.cardNumber,
            },
            items: getCheckoutItems(),
          }),
        });
      } catch (error) {
        if (!isLocalFetchError(error)) {
          throw error;
        }
        createLocalOrder(payload, getCheckoutItems());
      }
      const selectedItems = getCheckoutItems();
      const selectedIds = new Set(selectedItems.map((item) => item.productId));
      state.cart = state.cart.filter((item) => !selectedIds.has(item.productId));
      clearBuyNowItems();
      saveCart();
      form.reset();
      message.textContent = "Order confirmed.";
      showOrderSuccessAndRedirect();
    } catch (error) {
      const text = String(error.message || "").toLowerCase();
      if (text.includes("login required") || text.includes("unauthorized")) {
        redirectToLogin("checkout.html");
        return;
      }
      message.textContent = error.message;
    }
  });
}

function setupLogin() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const forgotForm = document.getElementById("forgotForm");
  if (!loginForm && !registerForm && !forgotForm) {
    return;
  }

  setupAuthTabs();
  setupPasswordToggles();

  const registerSendOtpButton = document.getElementById("registerSendOtpButton");
  if (registerSendOtpButton && registerForm) {
    registerSendOtpButton.addEventListener("click", async () => {
      const message = document.getElementById("registerMessage");
      const payload = Object.fromEntries(new FormData(registerForm).entries());
      try {
        try {
          await api("/api/auth/register/send-otp", {
            method: "POST",
            body: JSON.stringify({
              name: payload.name,
              email: payload.email,
            }),
          });
        } catch (error) {
          if (!isLocalFetchError(error)) {
            throw error;
          }
          localSendRegisterOtp(payload);
        }
        message.textContent = "OTP sent successfully.";
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.getElementById("loginMessage");
      const payload = Object.fromEntries(new FormData(loginForm).entries());

      try {
        let data;
        try {
          data = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
              identifier: payload.identifier,
              password: payload.password,
            }),
          });
        } catch (error) {
          if (!isLocalFetchError(error)) {
            throw error;
          }
          data = localLogin(payload.identifier, payload.password);
        }
        saveAuth(data);
        message.textContent = `Welcome ${data.user.name}.`;
        if (!handlePostAuthRedirect(data.user.role)) {
          updateNavAuthState();
        }
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.getElementById("registerMessage");
      const payload = Object.fromEntries(new FormData(registerForm).entries());

      try {
        if (payload.password !== payload.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (!validateStrongPassword(payload.password)) {
          throw new Error(
            "Password must be 8+ chars with uppercase, lowercase, number, and special character"
          );
        }

        let data;
        try {
          data = await api("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
              password: payload.password,
              otp: payload.otp,
            }),
          });
        } catch (error) {
          if (!isLocalFetchError(error)) {
            throw error;
          }
          data = localRegister(payload);
        }

        saveAuth(data);
        message.textContent = `Account created for ${data.user.name}.`;
        if (!handlePostAuthRedirect(data.user.role)) {
          updateNavAuthState();
        }
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  if (forgotForm) {
    const forgotSendOtpButton = document.getElementById("forgotSendOtpButton");
    if (forgotSendOtpButton) {
      forgotSendOtpButton.addEventListener("click", async () => {
        const message = document.getElementById("forgotMessage");
        const payload = Object.fromEntries(new FormData(forgotForm).entries());
        try {
          try {
            await api("/api/auth/reset-password/send-otp", {
              method: "POST",
              body: JSON.stringify({
                identifier: payload.identifier,
              }),
            });
          } catch (error) {
            if (!isLocalFetchError(error)) {
              throw error;
            }
            localSendResetOtp(payload);
          }
          message.textContent = "OTP sent successfully.";
        } catch (error) {
          message.textContent = error.message;
        }
      });
    }

    forgotForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.getElementById("forgotMessage");
      const payload = Object.fromEntries(new FormData(forgotForm).entries());

      try {
        if (payload.password !== payload.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (!validateStrongPassword(payload.password)) {
          throw new Error(
            "Password must be 8+ chars with uppercase, lowercase, number, and special character"
          );
        }

        try {
          await api("/api/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({
              identifier: payload.identifier,
              otp: payload.otp,
              password: payload.password,
            }),
          });
        } catch (error) {
          if (!isLocalFetchError(error)) {
            throw error;
          }
          localResetPassword(payload);
        }

        message.textContent = "Password updated successfully. Redirecting to login...";
        setTimeout(() => {
          window.location.href = "./login.html";
        }, 1200);
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }
}

function adminStat(label, value, href = "") {
  const tag = href ? "a" : "article";
  const attr = href ? `href="${href}"` : "";
  return `
    <${tag} class="stat-card ${href ? "stat-card-link" : ""}" ${attr}>
      <span>${label}</span>
      <strong>${value}</strong>
    </${tag}>
  `;
}

function fillProductForm(product) {
  const form = document.getElementById("productForm");
  if (!form) {
    return;
  }
  populateAdminCategorySelect(product.category);
  form.elements.editId.value = product.id;
  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.category.value = product.category;
  form.elements.fabric.value = product.fabric;
  form.elements.price.value = product.price;
  form.elements.oldPrice.value = product.oldPrice;
  form.elements.stock.value = product.stock;
  form.elements.badge.value = product.badge;
  form.elements.image.value = product.image;
  form.elements.gallery1.value = product.gallery?.[1] || "";
  form.elements.gallery2.value = product.gallery?.[2] || "";
  form.elements.gallery3.value = product.gallery?.[3] || "";
  form.elements.gallery4.value = product.gallery?.[4] || "";
  form.elements.shortDescription.value = product.shortDescription;
  form.elements.description.value = product.description;
  form.elements.featured.checked = product.featured;
  state.editingProductId = product.id;
  form.dataset.mode = "edit";
  document.getElementById("productFormTitle").textContent = "Edit Product";
  document.getElementById("cancelEditButton").classList.remove("hidden");
}

function getAvailableCategories() {
  if (state.categories.length) {
    return state.categories;
  }
  return [...new Set(state.products.map((item) => item.category).filter(Boolean))];
}

function populateAdminCategorySelect(selected = "") {
  const select = document.getElementById("productCategorySelect");
  if (!select) {
    return;
  }
  const categories = getAvailableCategories();
  select.innerHTML = [
    '<option value="">Select Category</option>',
    ...categories.map((category) => `<option value="${category}">${category}</option>`),
    '<option value="__new__">+ Add New Category</option>',
  ].join("");
  if (selected && categories.includes(selected)) {
    select.value = selected;
  }
}

function resetProductForm() {
  const form = document.getElementById("productForm");
  if (!form) {
    return;
  }
  form.reset();
  populateAdminCategorySelect();
  form.elements.editId.value = "";
  state.editingProductId = null;
  delete form.dataset.mode;
  document.getElementById("productFormTitle").textContent = "Add New Product";
  document.getElementById("cancelEditButton").classList.add("hidden");
}

async function renderAdmin() {
  const banner = document.getElementById("adminMessage");
  const dashboard = document.getElementById("adminDashboard");
  if (!banner || !dashboard) {
    return;
  }

  if (!state.auth?.token) {
    banner.textContent = "Login as admin to manage The Moharani catalog.";
    return;
  }

  if (state.auth?.user?.role !== "admin") {
    banner.textContent = "Only admin accounts can access this page.";
    dashboard.classList.add("hidden");
    return;
  }

  try {
    let data;
    try {
      data = await api("/api/admin/summary");
    } catch (error) {
      if (!isLocalFetchError(error)) {
        throw error;
      }
      data = getLocalAdminSummary();
    }
    data = mergeAdminSummary(data);
    banner.textContent = `Welcome ${data.admin.name}.`;
    dashboard.classList.remove("hidden");

    document.getElementById("adminStats").innerHTML = [
      adminStat("Revenue", currency(data.stats.revenue)),
      adminStat("Orders", data.stats.orders, "./admin-orders.html?tab=pending"),
      adminStat("Products", data.stats.products),
      adminStat("Low Stock", data.stats.lowStock),
    ].join("");

    const recentOrders = data.orders.filter(
      (order) => !["Shipped", "Cancelled"].includes(String(order.status || ""))
    );

    document.getElementById("ordersList").innerHTML = recentOrders.length
      ? recentOrders
          .map(
            (order, index) => {
              const itemsMarkup = (order.items || [])
                .map((item) => {
                  const product = data.products.find((entry) => entry.id === item.productId) || {};
                  const image = item.image || product.image || "";
                  return `
                    <div class="admin-order-item-row">
                      <img class="admin-order-thumb" src="${image}" alt="${item.name}" />
                      <div>
                        <p><strong>${item.name}</strong> (ID: ${item.productId})</p>
                        <p>Qty ${item.quantity} | ${currency(item.price)} | Line ${currency(item.lineTotal)}</p>
                      </div>
                    </div>
                  `;
                })
                .join("");
              return `
              <article class="admin-item">
                <div class="admin-item-header">
                  <strong>#${index + 1} | ${order.id}</strong>
                  <span>${currency(order.total)}</span>
                </div>
                <p>${order.customer.name} | ${order.payment.method} | ${order.status}</p>
                <p>${order.customer.phone || "-"} | ${order.customer.email || "-"}</p>
                <p>${order.customer.address || "-"}, ${order.customer.city || "-"}, ${order.customer.state || "-"} - ${order.customer.zip || "-"}</p>
                <div>${itemsMarkup}</div>
                <div class="inline-actions">
                  <button class="small-btn" data-dispatch-order="${order.id}">Dispatch</button>
                  <button class="small-btn" data-cancel-order="${order.id}">Cancel</button>
                </div>
              </article>
            `;
            }
          )
          .join("")
      : "<p>No orders yet.</p>";

    const bindOrderActionButtons = () => {
      document.querySelectorAll("[data-dispatch-order]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            try {
              await api(`/api/admin/orders/${button.dataset.dispatchOrder}`, {
                method: "PUT",
                body: JSON.stringify({ status: "Shipped" }),
              });
            } catch (error) {
              if (!isLocalFetchError(error)) {
                throw error;
              }
              updateLocalOrderStatus(button.dataset.dispatchOrder, "Shipped");
            }
            renderAdmin();
          } catch (error) {
            banner.textContent = error.message;
          }
        });
      });
      document.querySelectorAll("[data-cancel-order]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            try {
              await api(`/api/admin/orders/${button.dataset.cancelOrder}`, {
                method: "PUT",
                body: JSON.stringify({ status: "Cancelled" }),
              });
            } catch (error) {
              if (!isLocalFetchError(error)) {
                throw error;
              }
              updateLocalOrderStatus(button.dataset.cancelOrder, "Cancelled");
            }
            renderAdmin();
          } catch (error) {
            banner.textContent = error.message;
          }
        });
      });
    };
    bindOrderActionButtons();

    document.getElementById("adminProducts").innerHTML = data.products
      .map(
        (product) => `
          <article class="admin-item">
            <div class="admin-item-header">
              <div>
                <strong>${product.name}</strong>
                <p>${product.id} | Stock ${product.stock}</p>
              </div>
              <div class="inline-actions">
                <span>${currency(product.price)}</span>
                <button class="small-btn" data-edit-product="${product.id}">Edit</button>
                <button class="small-btn" data-delete-product="${product.id}">Delete</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");

    document.querySelectorAll("[data-delete-product]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          try {
            await api(`/api/admin/products/${button.dataset.deleteProduct}`, {
              method: "DELETE",
            });
          } catch (error) {
            if (!isLocalFetchError(error)) {
              throw error;
            }
            deleteLocalAdminProduct(button.dataset.deleteProduct);
          }
          await loadProducts();
          renderCurrentProductGrid();
          renderHome();
          renderWishlist();
          renderAdmin();
        } catch (error) {
          banner.textContent = error.message;
        }
      });
    });

    document.querySelectorAll("[data-edit-product]").forEach((button) => {
      button.addEventListener("click", () => {
        const product = state.products.find((item) => item.id === button.dataset.editProduct);
        if (product) {
          fillProductForm(product);
        }
      });
    });
  } catch (error) {
    banner.textContent = error.message;
  }
}

async function renderAdminOrdersPage() {
  const message = document.getElementById("adminOrdersMessage");
  const shell = document.getElementById("adminOrdersShell");
  const bodyMount = document.getElementById("adminOrdersTabBody");
  const tabButtons = Array.from(document.querySelectorAll("[data-order-tab]"));
  if (!message || !shell || !bodyMount || !tabButtons.length) {
    return;
  }
  if (!state.auth?.token || state.auth?.user?.role !== "admin") {
    message.textContent = "Only admin can access orders page.";
    shell.classList.add("hidden");
    return;
  }

  let data;
  try {
    try {
      data = await api("/api/admin/summary");
    } catch (error) {
      if (!isLocalFetchError(error)) {
        throw error;
      }
      data = getLocalAdminSummary();
    }
    data = mergeAdminSummary(data);
  } catch (error) {
    message.textContent = error.message;
    shell.classList.add("hidden");
    return;
  }

  message.textContent = "Manage dispatch and cancellation status.";
  shell.classList.remove("hidden");

  const hold = data.orders.filter((order) => String(order.status || "") === "Hold");
  const pending = data.orders.filter(
    (order) => !String(order.status || "") || String(order.status || "") === "Pending"
  );
  const ready = data.orders.filter((order) => String(order.status || "") === "Ready to Ship");
  const shipped = data.orders.filter((order) => String(order.status || "") === "Shipped");
  const delivered = data.orders.filter((order) => String(order.status || "") === "Delivered");
  const cancelled = data.orders.filter((order) => String(order.status || "") === "Cancelled");

  const counts = {
    hold: hold.length,
    pending: pending.length,
    ready: ready.length,
    shipped: shipped.length,
    delivered: delivered.length,
    cancelled: cancelled.length,
  };
  document.getElementById("countHold").textContent = counts.hold;
  document.getElementById("countPending").textContent = counts.pending;
  document.getElementById("countReady").textContent = counts.ready;
  document.getElementById("countShipped").textContent = counts.shipped;
  document.getElementById("countDelivered").textContent = counts.delivered;
  document.getElementById("countCancelled").textContent = counts.cancelled;

  const renderOrderList = (orders, tabName) => {
    if (!orders.length) {
      return "<p>No orders in this section.</p>";
    }
    return orders
      .map((order, index) => {
        const items = (order.items || [])
          .map((item) => {
            const product = data.products.find((entry) => entry.id === item.productId) || {};
            const image = item.image || product.image || "";
            return `<div class="admin-order-item-row">
              <img class="admin-order-thumb" src="${image}" alt="${item.name}" />
              <div>
                <p><strong>${item.name}</strong> (ID: ${item.productId})</p>
                <p>Qty ${item.quantity} | ${currency(item.lineTotal)}</p>
              </div>
            </div>`;
          })
          .join("");
        let actions = "";
        if (tabName === "pending") {
          actions = `<div class="inline-actions">
            <button class="small-btn action-hold" data-update-order="${order.id}" data-next-status="Hold">Hold</button>
            <button class="small-btn action-accept" data-update-order="${order.id}" data-next-status="Ready to Ship">Accept</button>
            <button class="small-btn action-cancel" data-update-order="${order.id}" data-next-status="Cancelled">Cancel</button>
          </div>`;
        }
        if (tabName === "hold") {
          actions = `<div class="inline-actions">
            <button class="small-btn action-accept" data-update-order="${order.id}" data-next-status="Ready to Ship">Accept</button>
            <button class="small-btn action-cancel" data-update-order="${order.id}" data-next-status="Cancelled">Cancel</button>
          </div>`;
        }
        if (tabName === "ready") {
          actions = `<div class="inline-actions">
            <button class="small-btn action-dispatch" data-update-order="${order.id}" data-next-status="Shipped">Dispatch</button>
            <button class="small-btn action-cancel" data-update-order="${order.id}" data-next-status="Cancelled">Cancel</button>
          </div>`;
        }
        if (tabName === "shipped") {
          actions = `<div class="inline-actions">
            <button class="small-btn action-accept" data-update-order="${order.id}" data-next-status="Delivered">Mark Delivered</button>
          </div>`;
        }
        return `<article class="admin-item">
          <div class="admin-item-header">
            <strong>#${index + 1} | ${order.id}</strong>
            <span>${currency(order.total)}</span>
          </div>
          <p>${order.customer.name} | ${order.payment.method} | ${order.status}</p>
          <p>${order.customer.phone || "-"} | ${order.customer.email || "-"}</p>
          <p>${order.customer.address || "-"}, ${order.customer.city || "-"}, ${order.customer.state || "-"} - ${order.customer.zip || "-"}</p>
          ${items}
          ${actions}
        </article>`;
      })
      .join("");
  };

  const tabsData = { hold, pending, ready, shipped, delivered, cancelled };
  const params = new URLSearchParams(window.location.search);
  let currentTab = params.get("tab") || "pending";
  if (!tabsData[currentTab]) {
    currentTab = "pending";
  }

  const renderTab = (tab) => {
    currentTab = tab;
    tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.orderTab === tab);
    });
    bodyMount.innerHTML = renderOrderList(tabsData[tab], tab);

    document.querySelectorAll("[data-update-order]").forEach((button) => {
      button.addEventListener("click", async () => {
        const orderId = button.dataset.updateOrder;
        const nextStatus = button.dataset.nextStatus;
        try {
          try {
            await api(`/api/admin/orders/${orderId}`, {
              method: "PUT",
              body: JSON.stringify({ status: nextStatus }),
            });
          } catch (error) {
            if (!isLocalFetchError(error)) {
              throw error;
            }
            updateLocalOrderStatus(orderId, nextStatus);
          }
          renderAdminOrdersPage();
        } catch (error) {
          message.textContent = error.message;
        }
      });
    });
  };

  tabButtons.forEach((button) => {
    button.onclick = () => renderTab(button.dataset.orderTab);
  });

  renderTab(currentTab);
}

function setupAdminForm() {
  const form = document.getElementById("productForm");
  if (!form) {
    return;
  }

  populateAdminCategorySelect();
  form.elements.category.addEventListener("change", async () => {
    if (form.elements.category.value !== "__new__") {
      return;
    }
    const created = window.prompt("Enter new category name");
    if (!created) {
      form.elements.category.value = "";
      return;
    }
    const value = String(created).trim();
    if (!value) {
      form.elements.category.value = "";
      return;
    }
    const next = [...new Set([...(state.categories || []), value])];
    saveCategories(next);
    try {
      await saveCategoriesToBackend(next);
    } catch {
      // keep local category in case backend is unavailable
    }
    populateAdminCategorySelect(value);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    if (payload.category === "__new__" || !payload.category) {
      document.getElementById("adminMessage").textContent = "Please select a valid category.";
      return;
    }
    const imageFile = form.elements.imageFile?.files?.[0];
    const imageUrl = String(payload.image || "").trim();
    if (!imageUrl && !imageFile) {
      document.getElementById("adminMessage").textContent =
        "Please add main image by URL or upload image file.";
      return;
    }
    if (imageFile) {
      payload.image = await readFileAsDataUrl(imageFile);
    }
    const galleryFiles = Array.from(form.elements.galleryFiles?.files || []).slice(0, 4);
    if (galleryFiles.length) {
      const fileUrls = [];
      for (const file of galleryFiles) {
        fileUrls.push(await readFileAsDataUrl(file));
      }
      payload.gallery1 = fileUrls[0] || payload.gallery1 || "";
      payload.gallery2 = fileUrls[1] || payload.gallery2 || "";
      payload.gallery3 = fileUrls[2] || payload.gallery3 || "";
      payload.gallery4 = fileUrls[3] || payload.gallery4 || "";
    }
    payload.gallery = [
      payload.image,
      payload.gallery1,
      payload.gallery2,
      payload.gallery3,
      payload.gallery4,
    ].filter(Boolean);
    payload.featured = form.querySelector('[name="featured"]').checked;
    const originalId = form.elements.editId.value || state.editingProductId;

    try {
      if (originalId) {
        try {
          await api(`/api/admin/products/${originalId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } catch (error) {
          if (!isLocalFetchError(error)) {
            throw error;
          }
          saveLocalAdminProduct(payload, originalId);
        }
      } else {
        try {
          await api("/api/admin/products", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } catch (error) {
          if (!isLocalFetchError(error)) {
            throw error;
          }
          saveLocalAdminProduct(payload);
        }
      }

      resetProductForm();
      await loadProducts();
      renderHome();
      renderCurrentProductGrid();
      renderWishlist();
      if (document.body.dataset.page === "product") {
        renderProductDetail();
      }
      renderAdmin();
      document.getElementById("adminMessage").textContent = originalId
        ? "Product updated successfully."
        : "Product added successfully.";
    } catch (error) {
      document.getElementById("adminMessage").textContent = error.message;
    }
  });

  document.getElementById("cancelEditButton").addEventListener("click", () => {
    resetProductForm();
  });
}

function setupFilters() {
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get("category");
  if (preselect) {
    state.activeCategory = preselect;
  }
  renderCategoryFilters();
  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      state.activeCategory = button.dataset.category;
      renderCurrentProductGrid();
    });
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.searchQuery = searchInput.value.trim();
      renderCurrentProductGrid();
    });
  }
}

async function saveCategoriesToBackend(categories) {
  try {
    await api("/api/admin/settings/categories", {
      method: "PUT",
      body: JSON.stringify({ categories }),
    });
  } catch (error) {
    if (!isLocalFetchError(error)) {
      throw error;
    }
  }
}

function setupCategoryManager() {
  const openButton = document.getElementById("openCategoryManager");
  const modal = document.getElementById("categoryModal");
  const closeButton = document.getElementById("closeCategoryModal");
  const addButton = document.getElementById("addCategoryButton");
  const input = document.getElementById("newCategoryInput");
  const list = document.getElementById("categoryList");
  if (!openButton || !modal || !closeButton || !addButton || !input || !list) {
    return;
  }

  const renderList = () => {
    const categories = state.categories.length
      ? state.categories
      : [...new Set(state.products.map((item) => item.category).filter(Boolean))];
    list.innerHTML = categories
      .map(
        (category) => `
      <div class="between">
        <strong>${category}</strong>
        <button class="small-btn action-cancel" data-remove-category="${category}">Delete</button>
      </div>`
      )
      .join("");
    list.querySelectorAll("[data-remove-category]").forEach((button) => {
      button.onclick = async () => {
        const next = state.categories.filter((entry) => entry !== button.dataset.removeCategory);
        saveCategories(next);
        await saveCategoriesToBackend(next);
        renderList();
        if (document.body.dataset.page === "products") {
          renderCategoryFilters();
          setupFilters();
          renderCurrentProductGrid();
        }
      };
    });
  };

  openButton.onclick = () => {
    renderList();
    modal.classList.remove("hidden");
  };
  closeButton.onclick = () => modal.classList.add("hidden");
  addButton.onclick = async () => {
    const value = String(input.value || "").trim();
    if (!value) {
      return;
    }
    const next = [...new Set([...(state.categories || []), value])];
    saveCategories(next);
    await saveCategoriesToBackend(next);
    input.value = "";
    renderList();
  };
}

async function bootstrap() {
  updateCounts();
  updateNavAuthState();
  setupMobileMenu();
  await loadProducts();

  const page = document.body.dataset.page;
  if (page === "home") {
    await renderHome();
    setupHomeSlider();
  }
  if (page === "products") {
    await renderProducts();
    setupFilters();
  }
  if (page === "wishlist") {
    await renderWishlist();
  }
  if (page === "product") {
    await renderProductDetail();
  }
  if (page === "cart") {
    renderCart();
  }
  if (page === "checkout") {
    renderCheckoutSummary();
    setupCheckout();
  }
  if (page === "login") {
    setupLogin();
  }
  if (page === "profile") {
    await setupProfilePage();
  }
  if (page === "admin") {
    setupAdminForm();
    await renderAdmin();
  }
  if (page === "admin-orders") {
    await renderAdminOrdersPage();
  }
  if (page === "order-tracking") {
    await renderOrderTrackingPage();
  }
}

bootstrap();
