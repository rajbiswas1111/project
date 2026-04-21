const state = {
  products: [],
  cart: loadJson("moharani-cart", []),
  wishlist: loadJson("moharani-wishlist", []),
  auth: loadJson("moharani-auth", null),
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

function saveCart() {
  localStorage.setItem("moharani-cart", JSON.stringify(state.cart));
  updateCounts();
}

function saveWishlist() {
  localStorage.setItem("moharani-wishlist", JSON.stringify(state.wishlist));
  updateCounts();
}

function saveAuth(auth) {
  state.auth = auth;
  localStorage.setItem("moharani-auth", JSON.stringify(auth));
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

function addToCart(productId) {
  const existing = state.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }
  saveCart();
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

function productCard(product) {
  const heart = isWishlisted(product.id) ? "&#9829;" : "&#9825;";
  const activeClass = isWishlisted(product.id) ? "active" : "";
  return `
    <article class="product-card">
      <a class="product-image-link" href="./product.html?id=${product.id}">
        <img class="product-image" src="${product.image}" alt="${product.name}" />
      </a>
      <div class="product-content">
        <button class="wishlist-btn ${activeClass}" data-wishlist="${product.id}" aria-label="Toggle wishlist">${heart}</button>
        <span class="badge">${product.badge}</span>
        <a class="product-title-link" href="./product.html?id=${product.id}">
          <h3>${product.name}</h3>
        </a>
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
          <a class="small-btn" href="./checkout.html">Buy Now</a>
        </div>
      </div>
    </article>
  `;
}

function bindProductButtons(scope = document) {
  scope.querySelectorAll("[data-add-cart]").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.addCart));
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
  const data = await api("/api/products");
  state.products = data.products;
  return data.products;
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
  const mount = document.getElementById("featuredProducts");
  if (!mount) {
    return;
  }
  const featured = state.products.filter((product) => product.featured);
  mount.innerHTML = featured.map(productCard).join("");
  bindProductButtons(mount);
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

  const { product } = await api(`/api/products/${id}`);
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
          <span>★★★★★</span>
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
        .join("")
    : "<div class='cart-card'><h3>Your cart is empty</h3><p>Explore the collection and add your favorite sarees.</p></div>";

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

function setupCheckout() {
  const form = document.getElementById("checkoutForm");
  if (!form) {
    return;
  }

  renderCheckoutSummary();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("checkoutMessage");
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      await api("/api/checkout", {
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
      form.reset();
      message.textContent = "Order confirmed.";
      showOrderSuccessAndRedirect();
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
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      saveAuth(data);
      if (data.user.role === "admin") {
        message.textContent = "Admin login successful. Open moharani-studio.html.";
      } else {
        message.textContent = `Welcome ${data.user.name}.`;
      }
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

function fillProductForm(product) {
  const form = document.getElementById("productForm");
  if (!form) {
    return;
  }
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
  form.elements.shortDescription.value = product.shortDescription;
  form.elements.description.value = product.description;
  form.elements.featured.checked = product.featured;
  state.editingProductId = product.id;
  form.dataset.mode = "edit";
  document.getElementById("productFormTitle").textContent = "Edit Product";
  document.getElementById("cancelEditButton").classList.remove("hidden");
}

function resetProductForm() {
  const form = document.getElementById("productForm");
  if (!form) {
    return;
  }
  form.reset();
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

  try {
    const data = await api("/api/admin/summary");
    banner.textContent = `Welcome ${data.admin.name}.`;
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
          await api(`/api/admin/products/${button.dataset.deleteProduct}`, {
            method: "DELETE",
          });
          await loadProducts();
          renderCurrentProductGrid();
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

function setupAdminForm() {
  const form = document.getElementById("productForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.featured = form.querySelector('[name="featured"]').checked;
    const originalId = form.elements.editId.value || state.editingProductId;

    try {
      if (originalId) {
        await api(`/api/admin/products/${originalId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
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

async function bootstrap() {
  updateCounts();
  await loadProducts();

  const page = document.body.dataset.page;
  if (page === "home") {
    await renderHome();
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
  if (page === "admin") {
    setupAdminForm();
    await renderAdmin();
  }
}

bootstrap();
