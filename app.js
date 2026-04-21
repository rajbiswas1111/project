const state = {
  products: [],
  cart: loadCart(),
  auth: loadAuth(),
};

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("vastra-cart") || "[]");
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("vastra-cart", JSON.stringify(state.cart));
  updateCartCount();
}

function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem("vastra-auth") || "null");
  } catch {
    return null;
  }
}

function saveAuth(auth) {
  state.auth = auth;
  localStorage.setItem("vastra-auth", JSON.stringify(auth));
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
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
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function updateCartCount() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("cartCount");
  if (badge) {
    badge.textContent = count;
  }
}

function addToCart(productId) {
  const existing = state.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }
  saveCart();
  alert("Added to cart");
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

function getCartDetails() {
  const details = state.cart
    .map((item) => {
      const product = state.products.find((entry) => entry.id === item.productId);
      if (!product) {
        return null;
      }
      return {
        ...product,
        quantity: item.quantity,
        lineTotal: item.quantity * product.price,
      };
    })
    .filter(Boolean);

  const subtotal = details.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 5000 ? 0 : subtotal > 0 ? 149 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;

  return { details, subtotal, shipping, tax, total };
}

function productCard(product) {
  return `
    <article class="product-card">
      <img class="product-image" src="${product.image}" alt="${product.name}" />
      <div class="product-content">
        <span class="badge">${product.badge}</span>
        <h3>${product.name}</h3>
        <p>${product.shortDescription}</p>
        <div class="product-meta">
          <span>${product.category}</span>
          <span>${product.fabric}</span>
        </div>
        <div class="price-row">
          <strong>${currency(product.price)}</strong>
          <span>${currency(product.oldPrice)}</span>
        </div>
        <div class="inline-actions">
          <button class="btn btn-primary" data-add-cart="${product.id}">Add to Cart</button>
          <a class="small-btn" href="/product.html?id=${product.id}">View Details</a>
        </div>
      </div>
    </article>
  `;
}

function bindCartButtons() {
  document.querySelectorAll("[data-add-cart]").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.addCart));
  });
}

async function loadProducts(category = "All") {
  const query = category === "All" ? "" : `?category=${encodeURIComponent(category)}`;
  const data = await api(`/api/products${query}`);
  state.products = data.products;
  return data.products;
}

async function renderHome() {
  const data = await api("/api/products?featured=true");
  state.products = await loadProducts("All");
  const mount = document.getElementById("featuredProducts");
  if (!mount) {
    return;
  }
  mount.innerHTML = data.products.map(productCard).join("");
  bindCartButtons();
}

async function renderProducts(category = "All") {
  const products = await loadProducts(category);
  const mount = document.getElementById("productsGrid");
  if (!mount) {
    return;
  }
  mount.innerHTML = products.map(productCard).join("");
  bindCartButtons();
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

  const { product } = await api(`/api/products/${id}`);
  mount.innerHTML = `
    <section class="detail-grid">
      <div class="panel">
        <img class="product-image detail-image" src="${product.image}" alt="${product.name}" />
      </div>
      <div class="panel detail-copy">
        <span class="badge">${product.badge}</span>
        <h1>${product.name}</h1>
        <p>${product.description}</p>
        <div class="summary-line"><span>Category</span><strong>${product.category}</strong></div>
        <div class="summary-line"><span>Fabric</span><strong>${product.fabric}</strong></div>
        <div class="summary-line"><span>Stock</span><strong>${product.stock}</strong></div>
        <div class="price-row">
          <strong>${currency(product.price)}</strong>
          <span>${currency(product.oldPrice)}</span>
        </div>
        <div class="inline-actions">
          <button class="btn btn-primary" data-add-cart="${product.id}">Add to Cart</button>
          <a class="small-btn" href="/checkout.html">Buy Now</a>
        </div>
      </div>
    </section>
  `;
  bindCartButtons();
}

function renderCart() {
  const itemsMount = document.getElementById("cartItems");
  const summaryMount = document.getElementById("cartSummary");
  if (!itemsMount || !summaryMount) {
    return;
  }

  const { details, subtotal, shipping, tax, total } = getCartDetails();
  if (!details.length) {
    itemsMount.innerHTML =
      '<div class="cart-card"><h3>Your cart is empty</h3><p>Start shopping from the products page.</p></div>';
  } else {
    itemsMount.innerHTML = details
      .map(
        (item) => `
          <article class="cart-card">
            <div class="cart-item-header">
              <div>
                <h3>${item.name}</h3>
                <p>${item.category} | ${item.fabric}</p>
              </div>
              <strong>${currency(item.lineTotal)}</strong>
            </div>
            <div class="between">
              <p>Qty: ${item.quantity}</p>
              <div class="inline-actions">
                <button class="small-btn" data-qty="${item.id}" data-delta="-1">-</button>
                <button class="small-btn" data-qty="${item.id}" data-delta="1">+</button>
                <button class="small-btn" data-remove="${item.id}">Remove</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  summaryMount.innerHTML = `
    <div class="summary-line"><span>Subtotal</span><strong>${currency(subtotal)}</strong></div>
    <div class="summary-line"><span>Shipping</span><strong>${currency(shipping)}</strong></div>
    <div class="summary-line"><span>Tax</span><strong>${currency(tax)}</strong></div>
    <div class="summary-line"><span>Total</span><strong>${currency(total)}</strong></div>
  `;

  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeFromCart(button.dataset.remove));
  });
  document.querySelectorAll("[data-qty]").forEach((button) => {
    button.addEventListener("click", () =>
      updateQuantity(button.dataset.qty, Number(button.dataset.delta))
    );
  });
}

function renderCheckoutSummary() {
  const mount = document.getElementById("checkoutSummary");
  if (!mount) {
    return;
  }
  const { details, subtotal, shipping, tax, total } = getCartDetails();
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

function setupCheckout() {
  const form = document.getElementById("checkoutForm");
  if (!form) {
    return;
  }

  renderCheckoutSummary();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("checkoutMessage");
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const { order } = await api("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          customer: payload,
          payment: {
            method: payload.method,
            reference: payload.cardNumber,
          },
          items: state.cart,
        }),
      });

      state.cart = [];
      saveCart();
      renderCheckoutSummary();
      form.reset();
      message.textContent = `Order ${order.id} placed successfully. Total: ${currency(
        order.total
      )}`;
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

function setupLogin() {
  const form = document.getElementById("loginForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("loginMessage");
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      saveAuth(data);
      message.textContent = `Welcome ${data.user.name}. Logged in as ${data.user.role}.`;
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

function adminStat(label, value) {
  return `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

async function renderAdmin() {
  const banner = document.getElementById("adminMessage");
  const dashboard = document.getElementById("adminDashboard");
  if (!banner || !dashboard) {
    return;
  }

  if (!state.auth?.token) {
    banner.textContent = "Login as admin from the login page to manage your store.";
    return;
  }

  try {
    const data = await api("/api/admin/summary");
    banner.textContent = `Logged in as ${data.admin.name}.`;
    dashboard.classList.remove("hidden");

    document.getElementById("adminStats").innerHTML = [
      adminStat("Revenue", currency(data.stats.revenue)),
      adminStat("Orders", data.stats.orders),
      adminStat("Products", data.stats.products),
      adminStat("Low Stock", data.stats.lowStock),
    ].join("");

    document.getElementById("ordersList").innerHTML = data.orders.length
      ? data.orders
          .slice(0, 6)
          .map(
            (order) => `
              <article class="admin-item">
                <div class="admin-item-header">
                  <strong>${order.id}</strong>
                  <span>${currency(order.total)}</span>
                </div>
                <p>${order.customer.name} | ${order.payment.method} | ${order.status}</p>
              </article>
            `
          )
          .join("")
      : "<p>No orders yet.</p>";

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
          await api(`/api/admin/products/${button.dataset.deleteProduct}`, {
            method: "DELETE",
          });
          renderAdmin();
          if (document.body.dataset.page === "products") {
            renderProducts();
          }
        } catch (error) {
          banner.textContent = error.message;
        }
      });
    });
  } catch (error) {
    banner.textContent = error.message;
  }
}

function setupAdminForm() {
  const form = document.getElementById("productForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.featured = form.querySelector('[name="featured"]').checked;

    try {
      await api("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      renderAdmin();
    } catch (error) {
      document.getElementById("adminMessage").textContent = error.message;
    }
  });
}

function setupFilters() {
  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      await renderProducts(button.dataset.category);
    });
  });
}

async function bootstrap() {
  updateCartCount();
  await loadProducts("All");

  const page = document.body.dataset.page;
  if (page === "home") {
    await renderHome();
  }
  if (page === "products") {
    await renderProducts("All");
    setupFilters();
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
  if (page === "admin") {
    setupAdminForm();
    await renderAdmin();
  }
}

bootstrap();
