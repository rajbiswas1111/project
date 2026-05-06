const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "themoharani";
const MONGO_USERS_COLLECTION = process.env.MONGO_USERS_COLLECTION || "users";
const MONGO_PRODUCTS_COLLECTION = process.env.MONGO_PRODUCTS_COLLECTION || "products";
const MONGO_ORDERS_COLLECTION = process.env.MONGO_ORDERS_COLLECTION || "orders";
const MONGO_SETTINGS_COLLECTION = process.env.MONGO_SETTINGS_COLLECTION || "settings";
const MONGO_META_COLLECTION = process.env.MONGO_META_COLLECTION || "app_meta";
const MONGO_SETTINGS_ID = "store_settings";
const MONGO_MIGRATION_ID = "v2_collections";
const STORE_PATH = path.join(__dirname, "..", "data", "store.json");

async function run() {
  if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI environment variable");
  }
  if (!fs.existsSync(STORE_PATH)) {
    throw new Error(`store.json not found at ${STORE_PATH}`);
  }

  const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(MONGO_DB_NAME);
  const users = db.collection(MONGO_USERS_COLLECTION);
  const products = db.collection(MONGO_PRODUCTS_COLLECTION);
  const orders = db.collection(MONGO_ORDERS_COLLECTION);
  const settings = db.collection(MONGO_SETTINGS_COLLECTION);
  const meta = db.collection(MONGO_META_COLLECTION);

  await Promise.all([users.deleteMany({}), products.deleteMany({}), orders.deleteMany({})]);
  if (Array.isArray(store.users) && store.users.length) {
    await users.insertMany(store.users);
  }
  if (Array.isArray(store.products) && store.products.length) {
    await products.insertMany(store.products);
  }
  if (Array.isArray(store.orders) && store.orders.length) {
    await orders.insertMany(store.orders);
  }
  await settings.replaceOne(
    { _id: MONGO_SETTINGS_ID },
    { _id: MONGO_SETTINGS_ID, ...(store.settings || {}) },
    { upsert: true }
  );
  await meta.replaceOne(
    { _id: MONGO_MIGRATION_ID },
    { _id: MONGO_MIGRATION_ID, completedAt: new Date().toISOString() },
    { upsert: true }
  );
  await client.close();
  console.log("Migration completed: store.json -> MongoDB collections");
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
