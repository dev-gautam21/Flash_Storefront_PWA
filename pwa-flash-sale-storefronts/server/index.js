require("dotenv").config();
const express = require("express");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { connectDB, getDB } = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIG & CONSTANTS                                                       */
/* -------------------------------------------------------------------------- */

const FRONTEND_ORIGIN = process.env.PWA_ORIGIN || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "flash-dev-secret";
const JWT_EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN || 60 * 60 * 4); // seconds
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "flashsale";
const DEFAULT_TTL_SECONDS = Number(process.env.DEFAULT_NOTIFICATION_TTL || 60 * 60);

let currentSale = { isActive: false, discount: 0 };
const scheduledCampaigns = new Map();

/* -------------------------------------------------------------------------- */
/* 🔐 VAPID SETUP                                                              */
/* -------------------------------------------------------------------------- */

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
  console.error("⚠️ Missing VAPID keys. Add them to your .env file.");
  process.exit(1);
}

webpush.setVapidDetails("mailto:alerts@flashstore.app", publicVapidKey, privateVapidKey);

/* -------------------------------------------------------------------------- */
/* 🔧 EXPRESS MIDDLEWARE                                                       */
/* -------------------------------------------------------------------------- */

app.set("trust proxy", 1); // Trust only the first proxy (load balancer)
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "1mb" }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);

/* -------------------------------------------------------------------------- */
/* 🔐 AUTH HELPERS                                                             */
/* -------------------------------------------------------------------------- */

const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: JWT_EXPIRES_IN,
  });

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/* -------------------------------------------------------------------------- */
/* 🗂️ DB HELPERS                                                              */
/* -------------------------------------------------------------------------- */

const getCollections = () => {
  const db = getDB();
  return {
    subscriptions: db.collection("subscriptions"),
    campaigns: db.collection("campaigns"),
    campaignEvents: db.collection("campaignEvents"),
    analytics: db.collection("analytics"),
    orders: db.collection("orders"),
  };
};

const minutesFromHHMM = (value) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const isWithinQuietHours = (preferences = {}) => {
  const quiet = preferences.quietHours;
  if (!quiet || !quiet.enabled) return false;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: quiet.timezone || "UTC",
  });

  const [hh, mm] = formatter.format(new Date()).split(":").map(Number);
  const currentMinutes = hh * 60 + mm;
  const start = minutesFromHHMM(quiet.start);
  const end = minutesFromHHMM(quiet.end);

  if (start === null || end === null) return false;
  if (start <= end) return currentMinutes >= start && currentMinutes < end;
  return currentMinutes >= start || currentMinutes < end;
};

const isTemporarilyMuted = (preferences = {}) => {
  if (!preferences.mutedUntil) return false;
  return new Date(preferences.mutedUntil).getTime() > Date.now();
};

const filterEligibleSubscriptions = (subscriptions, category) => {
  return subscriptions.filter((sub) => {
    if (!sub.preferences?.[category]) return false;
    if (isTemporarilyMuted(sub.preferences)) return false;
    if (isWithinQuietHours(sub.preferences)) return false;
    if (sub.expirationTime && new Date(sub.expirationTime).getTime() < Date.now()) return false;
    return true;
  });
};

const sendWebPush = async (subscription, payload, options = {}) => {
  try {
    await webpush.sendNotification(subscription, payload, options);
    return { success: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      const { subscriptions } = getCollections();
      await subscriptions.deleteOne({ endpoint: subscription.endpoint });
    }
    console.error("Error sending notification", err.body || err);
    return { success: false, error: err };
  }
};

const recordCampaignEvent = async ({
  campaignId,
  notificationId,
  event,
  category,
  metadata,
}) => {
  if (!campaignId && !notificationId) return;
  try {
    const { campaignEvents } = getCollections();
    await campaignEvents.insertOne({
      campaignId: campaignId || null,
      notificationId: notificationId || null,
      event,
      category,
      metadata,
      occurredAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to record campaign event", error);
  }
};

/* -------------------------------------------------------------------------- */
/* 📬 CAMPAIGN DISPATCH                                                        */
/* -------------------------------------------------------------------------- */

async function dispatchCampaign(campaign) {
  const { subscriptions, campaigns } = getCollections();

  const audience = await subscriptions
    .find({ [`preferences.${campaign.category}`]: true })
    .toArray();

  const eligible = filterEligibleSubscriptions(audience, campaign.category);

  const payload = JSON.stringify({
    title: campaign.title,
    body: campaign.body,
    icon: campaign.icon,
    image: campaign.image,
    badge: campaign.badge,
    actions: campaign.actions || [],
    data: {
      url: campaign.url || "/",
      campaignId: campaign.campaignId,
      notificationId: campaign.notificationId,
      category: campaign.category,
    },
  });

  const ttl = campaign.ttl || DEFAULT_TTL_SECONDS;
  const results = await Promise.all(
    eligible.map((subscription) => sendWebPush(subscription, payload, { TTL: ttl }))
  );

  const successCount = results.filter((result) => result.success).length;

  await recordCampaignEvent({
    campaignId: campaign.campaignId,
    notificationId: campaign.notificationId,
    event: "deliver",
    category: campaign.category,
    metadata: { audience: eligible.length, delivered: successCount },
  });

  if (campaign._id) {
    await campaigns.updateOne(
      { _id: campaign._id },
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          successCount,
          audienceCount: eligible.length,
        },
      }
    );
  }
}

const scheduleCampaignDispatch = (campaign) => {
  const delay = new Date(campaign.sendAt).getTime() - Date.now();

  if (delay <= 0) {
    dispatchCampaign(campaign).catch((error) =>
      console.error("Failed to dispatch immediate campaign", error)
    );
    return;
  }

  const timeout = setTimeout(() => {
    dispatchCampaign(campaign).catch((error) =>
      console.error("Failed to dispatch scheduled campaign", error)
    );
    scheduledCampaigns.delete(String(campaign._id));
  }, delay);

  scheduledCampaigns.set(String(campaign._id), timeout);
};

/* -------------------------------------------------------------------------- */
/* 🛒 SALE MANAGEMENT                                                          */
/* -------------------------------------------------------------------------- */

app.get("/api/sale-status", (_req, res) => {
  res.status(200).json(currentSale);
});

app.post("/api/start-sale", authenticate, async (req, res) => {
  const { discount } = req.body;
  if (typeof discount !== "number" || discount <= 0 || discount > 100) {
    return res.status(400).json({ error: "Invalid discount percentage." });
  }

  currentSale = { isActive: true, discount };
  console.log(`🔥 Sale started with ${discount}% discount.`);

  const { subscriptions } = getCollections();
  const audience = await subscriptions.find({ "preferences.flashSales": true }).toArray();
  const eligible = filterEligibleSubscriptions(audience, "flashSales");

  const notificationId = crypto.randomUUID();
  const payload = JSON.stringify({
    title: `⚡ FLASH SALE: ${discount}% OFF!`,
    body: `Everything is ${discount}% off for a limited time. Shop now!`,
    icon: "https://www.gstatic.com/images/branding/product/1x/gmd_24dp.png",
    data: {
      url: `/sale?campaign=flash-sale&discount=${discount}`,
      campaignId: "flash-sale",
      notificationId,
      category: "flashSales",
    },
  });

  await Promise.all(eligible.map((sub) => sendWebPush(sub, payload, { TTL: DEFAULT_TTL_SECONDS })));

  await recordCampaignEvent({
    campaignId: "flash-sale",
    notificationId,
    event: "deliver",
    category: "flashSales",
    metadata: { audience: eligible.length },
  });

  res.status(200).json({ message: "Sale started successfully.", sale: currentSale });
});

app.post("/api/end-sale", authenticate, (_req, res) => {
  currentSale = { isActive: false, discount: 0 };
  console.log("🛑 Sale ended.");
  res.status(200).json({ message: "Sale ended successfully.", sale: currentSale });
});

/* -------------------------------------------------------------------------- */
/* 🔔 SUBSCRIPTIONS                                                           */
/* -------------------------------------------------------------------------- */

app.post("/api/save-subscription", async (req, res) => {
  const { subscription, preferences } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Invalid subscription object." });
  }

  const { subscriptions } = getCollections();

  const defaultPreferences = {
    flashSales: true,
    newArrivals: true,
    priceDrops: true,
    backInStock: true,
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    mutedUntil: null,
  };

  const cleanSub = JSON.parse(JSON.stringify(subscription));
  const finalSub = {
    endpoint: cleanSub.endpoint,
    expirationTime: cleanSub.expirationTime || null,
    keys: cleanSub.keys,
    preferences: preferences || defaultPreferences,
    updatedAt: new Date(),
  };

  try {
    await subscriptions.updateOne(
      { endpoint: finalSub.endpoint },
      { $set: finalSub },
      { upsert: true }
    );
    res.status(201).json({
      message: "Subscription saved successfully.",
      preferences: finalSub.preferences,
    });
  } catch (error) {
    console.error("❌ Error saving subscription", error);
    res.status(500).json({ error: "Failed to save subscription." });
  }
});

app.post("/api/delete-subscription", async (req, res) => {
  const { endpoint } = req.body;
  const { subscriptions } = getCollections();

  try {
    const result = await subscriptions.deleteOne({ endpoint });
    if (result.deletedCount > 0) {
      return res.status(200).json({ message: "Deleted successfully." });
    }
    res.status(404).json({ message: "Not found." });
  } catch (error) {
    console.error("Error deleting subscription", error);
    res.status(500).json({ error: "Failed to delete subscription." });
  }
});

/* -------------------------------------------------------------------------- */
/* ⚙️ USER PREFERENCES                                                        */
/* -------------------------------------------------------------------------- */

app.get("/api/get-preferences", async (req, res) => {
  const endpoint = req.query.endpoint;
  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint query parameter." });
  }

  try {
    const { subscriptions } = getCollections();
    const subscription = await subscriptions.findOne({ endpoint });
    if (!subscription) {
      return res.status(404).json({ message: "Preferences not found." });
    }
    res.status(200).json(subscription.preferences);
  } catch (error) {
    console.error("❌ Error fetching preferences", error);
    res.status(500).json({ error: "Failed to fetch preferences." });
  }
});

app.post("/api/update-preferences", async (req, res) => {
  const { endpoint, preferences } = req.body;
  if (!endpoint || !preferences) {
    return res.status(400).json({ error: "Missing endpoint or preferences." });
  }

  try {
    const { subscriptions } = getCollections();
    const result = await subscriptions.updateOne({ endpoint }, { $set: { preferences } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Subscription not found." });
    }
    res.status(200).json({ message: "Preferences updated successfully." });
  } catch (error) {
    console.error("❌ Error updating preferences", error);
    res.status(500).json({ error: "Failed to update preferences." });
  }
});

/* -------------------------------------------------------------------------- */
/* 📣 CAMPAIGNS & NOTIFICATIONS                                               */
/* -------------------------------------------------------------------------- */

app.post("/api/send-notification", authenticate, async (req, res) => {
  const {
    title,
    body,
    category,
    url,
    icon,
    image,
    badge,
    actions,
    ttl,
    sendAt,
    campaignId = crypto.randomUUID(),
    notificationId = crypto.randomUUID(),
  } = req.body || {};

  if (!category) {
    return res.status(400).json({ error: "Missing category in request." });
  }

  const { campaigns } = getCollections();

  const descriptor = {
    title: title || "⚡ New Alert!",
    body: body || "Check out the latest update!",
    category,
    url: url || "/",
    icon: icon || "https://www.gstatic.com/images/branding/product/1x/gmd_24dp.png",
    image,
    badge,
    actions: actions || [],
    ttl: ttl || DEFAULT_TTL_SECONDS,
    campaignId,
    notificationId,
  };

  if (sendAt) {
    const doc = {
      ...descriptor,
      sendAt: new Date(sendAt),
      createdAt: new Date(),
      status: "scheduled",
      createdBy: req.user?.email || "system",
    };
    const result = await campaigns.insertOne(doc);
    scheduleCampaignDispatch({ ...doc, _id: result.insertedId });
    return res.status(202).json({ message: "Campaign scheduled", campaignId });
  }

  await dispatchCampaign({ ...descriptor, _id: crypto.randomUUID() });
  res.status(200).json({ message: "Notifications sent successfully.", campaignId });
});

app.post("/api/send-welcome-notification", async (req, res) => {
  const { subscription } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Subscription required." });
  }

  const payload = JSON.stringify({
    title: "🎉 Welcome to FlashStore!",
    body: "You're now subscribed to the latest deals.",
    icon: "https://www.gstatic.com/images/branding/product/1x/gmd_24dp.png",
    data: { url: "/" },
  });

  try {
    await sendWebPush(subscription, payload, { TTL: DEFAULT_TTL_SECONDS });
    res.status(200).json({ message: "Welcome notification sent." });
  } catch (error) {
    res.status(500).json({ error: "Failed to send welcome notification." });
  }
});

/* -------------------------------------------------------------------------- */
/* 💳 ORDER ENDPOINT                                                          */
/* -------------------------------------------------------------------------- */

app.post("/api/orders", async (req, res) => {
  const payload = req.body || {};
  if (!payload.id) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  const { orders } = getCollections();
  const record = {
    ...payload,
    createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
    processedAt: new Date(),
    status: "processed",
    correlationId: crypto.randomUUID(),
  };

  await orders.updateOne({ id: payload.id }, { $set: record }, { upsert: true });
  res.status(200).json({ id: payload.id, status: record.status, processedAt: record.processedAt });
});

/* -------------------------------------------------------------------------- */
/* 📈 ANALYTICS                                                               */
/* -------------------------------------------------------------------------- */

app.post("/api/campaign-events", async (req, res) => {
  const { campaignId, notificationId } = req.body || {};
  if (!campaignId && !notificationId) {
    return res.status(400).json({ error: "campaignId or notificationId required" });
  }

  const { campaignEvents } = getCollections();
  await campaignEvents.insertOne({
    campaignId: campaignId || null,
    notificationId: notificationId || null,
    event: req.body.event,
    category: req.body.category,
    metadata: req.body.metadata,
    occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
  });

  res.status(201).json({ message: "Recorded" });
});

app.post("/api/analytics/install", async (req, res) => {
  const { analytics } = getCollections();
  await analytics.insertOne({
    type: "install",
    event: req.body.event,
    platform: req.body.platform,
    reason: req.body.reason,
    occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
  });
  res.status(201).json({ message: "Install analytics recorded" });
});

app.post("/api/analytics/permissions", async (req, res) => {
  const { analytics } = getCollections();
  await analytics.insertOne({
    type: "permission",
    status: req.body.status,
    action: req.body.action,
    source: req.body.source,
    occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
  });
  res.status(201).json({ message: "Permission analytics recorded" });
});

app.get("/api/analytics/summary", authenticate, async (_req, res) => {
  const { campaignEvents, analytics, orders } = getCollections();
  const [campaignCount, installCount, permissionCount, orderCount] = await Promise.all([
    campaignEvents.countDocuments(),
    analytics.countDocuments({ type: "install" }),
    analytics.countDocuments({ type: "permission" }),
    orders.countDocuments(),
  ]);

  res.status(200).json({
    campaigns: campaignCount,
    installs: installCount,
    permissions: permissionCount,
    orders: orderCount,
  });
});

/* -------------------------------------------------------------------------- */
/* 🔐 AUTH ROUTES                                                             */
/* -------------------------------------------------------------------------- */

app.post("/api/auth/login", authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ email });
  res.status(200).json({ token, expiresIn: JWT_EXPIRES_IN });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ email: req.user.email });
});

/* -------------------------------------------------------------------------- */
/* 🧠 HEALTH CHECK                                                            */
/* -------------------------------------------------------------------------- */

app.get("/api/health", (_req, res) => {
  const vapidOK = !!(publicVapidKey && privateVapidKey);
  try {
    const db = getDB();
    res.json({
      mongo: db ? "connected" : "not connected",
      vapid: vapidOK ? "configured" : "missing",
      sale: currentSale,
    });
  } catch {
    res.json({ mongo: "not connected", vapid: vapidOK ? "configured" : "missing" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🚀 BOOTSTRAP                                                               */
/* -------------------------------------------------------------------------- */

const bootstrapCampaignScheduler = async () => {
  const { campaigns } = getCollections();
  const upcoming = await campaigns
    .find({ status: "scheduled", sendAt: { $gte: new Date() } })
    .toArray();

  upcoming.forEach((campaign) => scheduleCampaignDispatch(campaign));
};

connectDB()
  .then(async () => {
    await bootstrapCampaignScheduler();
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
