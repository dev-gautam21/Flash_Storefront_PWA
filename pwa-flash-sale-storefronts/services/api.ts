// ✅ This service makes real API calls to your backend server.
// Make sure your backend is running on http://localhost:4000 before testing.

import type { NotificationPreferences, NotificationCategory } from '../types';
import type {
  CheckoutPayload,
  CampaignEventPayload,
  CheckoutResponse,
  InstallEventPayload,
  PermissionEventPayload,
  AdminLoginResponse,
} from './api.types';

// ✅ Base URL for backend API
const API_BASE_URL = 'http://localhost:4001/api';
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

const authorizationHeaders = (): Record<string, string> => {
  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('adminToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/* -------------------------------------------------------------------------- */
/*                           🔔 Subscription APIs                             */
/* -------------------------------------------------------------------------- */

export const adminLogin = async (email: string, password: string): Promise<AdminLoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Login failed. Status: ${response.status}. ${text}`);
  }

  return (await response.json()) as AdminLoginResponse;
};

export const fetchAdminProfile = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      ...JSON_HEADERS,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch admin profile. Status: ${response.status}. ${text}`);
  }

  return response.json();
};

// Save a user's push subscription + preferences
export const saveSubscription = async (
  subscription: PushSubscription,
  preferences: NotificationPreferences
): Promise<{ preferences: NotificationPreferences } | null> => {
  console.log("📤 Sending subscription to backend:", JSON.stringify({ subscription, preferences }));
  try {
    const response = await fetch(`${API_BASE_URL}/save-subscription`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ subscription, preferences }),
    });

    if (!response.ok) throw new Error(`❌ Failed to save subscription. Status: ${response.status}`);
    console.log("✅ Subscription saved successfully!");
    return await response.json();
  } catch (error) {
    console.error("❌ Error saving subscription:", error);
    return null;
  }
};

// Get saved preferences for a specific endpoint
export const getSubscriptionPreferences = async (
  endpoint: string
): Promise<NotificationPreferences | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get-preferences?endpoint=${encodeURIComponent(endpoint)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to get preferences.");
    }
    return await response.json();
  } catch (error) {
    console.error("❌ Error getting preferences:", error);
    return null;
  }
};

// Update a user's notification preferences
export const updateSubscriptionPreferences = async (
  endpoint: string,
  preferences: NotificationPreferences
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/update-preferences`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ endpoint, preferences }),
    });
    return response.ok;
  } catch (error) {
    console.error("❌ Error updating preferences:", error);
    return false;
  }
};

// Delete a subscription
export const deleteSubscription = async (endpoint: string): Promise<void> => {
  console.log("🗑️ Deleting subscription:", endpoint);
  try {
    const response = await fetch(`${API_BASE_URL}/delete-subscription`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) throw new Error(`Failed to delete subscription. Status: ${response.status}`);
    console.log("✅ Subscription deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting subscription:", error);
  }
};

/* -------------------------------------------------------------------------- */
/*                         📢 Notification Management                         */
/* -------------------------------------------------------------------------- */

// Send a custom notification (used by Admin Panel)
export const sendNotification = async (payload: {
  title: string;
  body: string;
  category: NotificationCategory;
  ttl?: number;
  sendAt?: string;
  url?: string;
  icon?: string;
  image?: string;
  badge?: string;
  actions?: Array<{ action: string; title: string }>;
}): Promise<boolean> => {
  console.log("📨 Sending notification with payload:", payload);
  try {
    const response = await fetch(`${API_BASE_URL}/send-notification`, {
      method: 'POST',
      headers: {
        ...JSON_HEADERS,
        ...authorizationHeaders(),
      },
      // ✅ Always include a URL for Service Worker to open when notification clicked
      body: JSON.stringify({
        ...payload,
        url: payload.url ?? '/',
      }),
    });

    if (!response.ok) throw new Error(`❌ Failed to send notification. Status: ${response.status}`);
    console.log("✅ Custom notification sent successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error sending custom notification:", error);
    return false;
  }
};

// Send order confirmation notification
export const sendOrderConfirmationNotification = async (
  subscription: PushSubscription,
  orderDetails: { total: number; paymentMethod: string }
): Promise<boolean> => {
  console.log("🧾 Sending order confirmation notification...");
  try {
    const response = await fetch(`${API_BASE_URL}/send-order-confirmation`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ subscription, orderDetails }),
    });

    if (!response.ok) throw new Error(`Failed to send order confirmation. Status: ${response.status}`);
    console.log("✅ Order confirmation notification sent!");
    return true;
  } catch (error) {
    console.error("❌ Error sending order confirmation:", error);
    return false;
  }
};

// Send welcome notification when user first subscribes
export const sendWelcomeNotification = async (
  subscription: PushSubscription
): Promise<boolean> => {
  console.log("👋 Sending welcome notification...");
  try {
    const response = await fetch(`${API_BASE_URL}/send-welcome-notification`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ subscription }),
    });

    if (!response.ok) throw new Error(`Failed to send welcome notification. Status: ${response.status}`);
    console.log("✅ Welcome notification sent successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error sending welcome notification:", error);
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/*                              💰 Sale Management                            */
/* -------------------------------------------------------------------------- */

// Get current sale status
export const getSaleStatus = async (): Promise<{ isActive: boolean; discount: number } | null> => {
  console.log("📦 Fetching sale status...");
  try {
    const response = await fetch(`${API_BASE_URL}/sale-status`);
    if (!response.ok) throw new Error(`Failed to get sale status. Status: ${response.status}`);
    const data = await response.json();
    console.log("✅ Sale status:", data);
    return data;
  } catch (error) {
    console.error("❌ Error getting sale status:", error);
    return null;
  }
};

// Start a new sale and notify users
export const startSale = async (discount: number): Promise<boolean> => {
  console.log(`🔥 Starting sale with ${discount}% discount...`);
  try {
    const response = await fetch(`${API_BASE_URL}/start-sale`, {
      method: 'POST',
      headers: {
        ...JSON_HEADERS,
        ...authorizationHeaders(),
      },
      body: JSON.stringify({ discount }),
    });

    if (!response.ok) throw new Error(`Failed to start sale. Status: ${response.status}`);
    console.log("✅ Sale started successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error starting sale:", error);
    return false;
  }
};

// End an ongoing sale
export const endSale = async (): Promise<boolean> => {
  console.log("🛑 Ending current sale...");
  try {
    const response = await fetch(`${API_BASE_URL}/end-sale`, {
      method: 'POST',
      headers: {
        ...authorizationHeaders(),
      },
    });
    if (!response.ok) throw new Error(`Failed to end sale. Status: ${response.status}`);
    console.log("✅ Sale ended successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error ending sale:", error);
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/* 💳 Orders & Background Sync                                                 */
/* -------------------------------------------------------------------------- */

const resolveRegistration = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }
  return navigator.serviceWorker.ready;
};

export const submitOrder = async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to submit order. Status: ${response.status}. ${text}`);
  }

  return (await response.json()) as CheckoutResponse;
};

export const queueOfflineCheckout = async (payload: CheckoutPayload): Promise<void> => {
  const registration = await resolveRegistration();
  const sw = registration.active ?? registration.waiting;
  if (!sw) throw new Error('Service worker is not active. Cannot queue checkout.');

  sw.postMessage({ type: 'QUEUE_CHECKOUT', payload });

  if ('sync' in registration && registration.sync) {
    try {
      await registration.sync.register('checkout-sync');
    } catch (error) {
      console.warn('Background sync registration failed:', error);
    }
  }
};

/* -------------------------------------------------------------------------- */
/* 📈 Analytics                                                                */
/* -------------------------------------------------------------------------- */

export const recordCampaignEvent = async (payload: CampaignEventPayload): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/campaign-events`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to record campaign event. Status: ${response.status}. ${text}`);
  }
};

export const recordInstallEvent = async (payload: InstallEventPayload): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/analytics/install`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to record install event. Status: ${response.status}. ${text}`);
  }
};

export const recordPermissionEvent = async (payload: PermissionEventPayload): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/analytics/permissions`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to record permission event. Status: ${response.status}. ${text}`);
  }
};
