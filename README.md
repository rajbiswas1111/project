# The Moharani

A complete e-commerce saree website with:

- Home page
- Product listing and detail page flow
- Shopping cart
- Checkout page
- Login page
- Private admin dashboard
- Backend APIs with JSON persistence

## Run

```powershell
node server.js
```

Then open:

`http://localhost:3000`

## Demo Logins

- Admin: `admin@themoharani.com` / `Moharani@2026`
- Customer: `customer@themoharani.com` / `user123`

## MongoDB (Recommended)

Set environment variables:

```powershell
$env:MONGO_URI="mongodb://127.0.0.1:27017"
$env:MONGO_DB_NAME="themoharani"
$env:MONGO_USERS_COLLECTION="users"
$env:MONGO_PRODUCTS_COLLECTION="products"
$env:MONGO_ORDERS_COLLECTION="orders"
$env:MONGO_SETTINGS_COLLECTION="settings"
```

Optional one-time migration from `data/store.json`:

```powershell
npm run migrate:mongo
```

Then start server:

```powershell
npm start
```

If MongoDB is not configured or unavailable, server auto-falls back to `data/store.json`.

## Razorpay Setup

Set environment variables before `npm start`:

```powershell
$env:RAZORPAY_KEY_ID="rzp_test_xxxxx"
$env:RAZORPAY_KEY_SECRET="xxxxxxxx"
```

Checkout page uses Razorpay popup for `Razorpay (UPI / Card / Wallet)` method.

## Project Structure

- `server.js` - Node backend and static file server
- `data/store.json` - Products, users, orders, store settings
- `public/` - Frontend pages, styles, and scripts
- `public/moharani-studio.html` - private admin access page
