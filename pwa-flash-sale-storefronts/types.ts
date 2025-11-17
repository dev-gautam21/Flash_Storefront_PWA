export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  category: string;
  isFlashSale: boolean;
  tags?: string[];
  shortDescription?: string;
  inventoryStatus?: 'inStock' | 'lowStock' | 'outOfStock';
  lastSyncedAt?: string; // ISO timestamp for offline reconciliation
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface QuietHoursPreference {
  enabled: boolean;
  start: string; // HH:mm in local time
  end: string;   // HH:mm in local time
  timezone: string;
}

export interface NotificationPreferences {
  flashSales: boolean;
  newArrivals: boolean;
  priceDrops: boolean;
  backInStock: boolean;
  quietHours: QuietHoursPreference;
  mutedUntil?: string | null; // ISO timestamp for temporary snooze
}

export type NotificationCategory = 'flashSales' | 'newArrivals' | 'priceDrops' | 'backInStock';
