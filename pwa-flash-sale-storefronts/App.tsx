import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import Header from './components/Header';
import ProductList from './components/ProductList';
import InstallBanner from './components/InstallBanner';
import Settings from './components/Settings';
import Cart from './components/Cart';
import Toast from './components/Toast';
import AdminPanel from './components/AdminPanel';
import SaleBanner from './components/SaleBanner';
import AdminLogin from './components/AdminLogin'; // ✅ use real JWT login component

import { usePwaInstall } from './hooks/usePwaInstall';
import { usePushManager } from './hooks/usePushManager';
import { useConnectivity } from './hooks/useConnectivity';
import {
  sendOrderConfirmationNotification,
  getSaleStatus,
  submitOrder,
  queueOfflineCheckout,
  recordCampaignEvent,
} from './services/api';
import type { Product, CartItem, NotificationCategory } from './types';
import type { CheckoutPayload } from './services/api.types';

/* -------------------------------------------------------------------------- */
/* 🏪 Storefront (User Side)                                                  */
/* -------------------------------------------------------------------------- */
interface StorefrontProps {
  filter: 'all' | 'sale' | 'new' | 'price-drops' | 'back-in-stock';
  saleRefreshKey: number;
}

const Storefront: React.FC<StorefrontProps> = ({ filter, saleRefreshKey }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isOnline, lastChanged } = useConnectivity();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' }>({ message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [saleInfo, setSaleInfo] = useState<{ isActive: boolean; discount: number }>({ isActive: false, discount: 0 });
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const pendingSyncRef = useRef(0);
  const [campaignSeen, setCampaignSeen] = useState<string | null>(null);

  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());
  const cartItemsArray = useMemo(() => Array.from(cart.values()), [cart]);
  const cartItemCount = useMemo(() => cartItemsArray.reduce((t, i) => t + i.quantity, 0), [cartItemsArray]);
  const cartTotal = useMemo(() => cartItemsArray.reduce((t, i) => t + i.product.price * i.quantity, 0), [cartItemsArray]);

  const { canInstall, isAppInstalled, triggerInstall } = usePwaInstall();
  const { isSubscribed, isSupported, permissionStatus, subscribe, unsubscribe, isProcessing } = usePushManager();

  useEffect(() => {
    let isMounted = true;
    const fetchSaleState = async () => {
      try {
        const currentSale = await getSaleStatus();
        if (currentSale && isMounted) setSaleInfo(currentSale);
      } catch (error) {
        console.warn('Failed to fetch sale status', error);
      }
    };
    fetchSaleState();
    const interval = setInterval(fetchSaleState, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [saleRefreshKey]);

  useEffect(() => {
    const campaignId = searchParams.get('campaign');
    const notificationId = searchParams.get('notificationId');
    const categoryParam = searchParams.get('category') as NotificationCategory | null;

    if (campaignId && campaignId !== campaignSeen) {
      setCampaignSeen(campaignId);
      setToast({ message: 'Loaded campaign offer.', type: 'success' });
      recordCampaignEvent({
        campaignId,
        event: 'open',
        notificationId: notificationId ?? undefined,
        category: categoryParam ?? undefined,
        path: window.location.pathname + window.location.search,
        occurredAt: new Date().toISOString(),
      }).catch((error) => console.warn('Failed to record campaign event', error));
    }
  }, [campaignSeen, searchParams]);

  useEffect(() => {
    if (!isOnline || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready
      .then((registration) => {
        if ('sync' in registration && registration.sync) {
          return registration.sync.register('checkout-sync');
        }
        registration.active?.postMessage({ type: 'TRIGGER_CHECKOUT_SYNC' });
        return undefined;
      })
      .catch(() => undefined);
  }, [isOnline]);

  const sendConfirmation = useCallback(
    async (payload: CheckoutPayload) => {
      if (!isSubscribed) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await sendOrderConfirmationNotification(subscription, {
            total: payload.total,
            paymentMethod: payload.paymentMethod,
          });
        }
      } catch (error) {
        console.error('Error sending order confirmation notification:', error);
      }
    },
    [isSubscribed]
  );

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'CHECKOUT_SYNC_PENDING') {
        pendingSyncRef.current = data.count ?? 0;
        setPendingSyncCount(pendingSyncRef.current);
      }

      if (data.type === 'CHECKOUT_SYNC_COMPLETE') {
        pendingSyncRef.current = Math.max(0, pendingSyncRef.current - 1);
        setPendingSyncCount(pendingSyncRef.current);
        if (data.success && data.order) {
          setToast({ message: 'Queued order sent successfully!', type: 'success' });
          void sendConfirmation(data.order as CheckoutPayload);
        } else if (!data.success) {
          setToast({ message: 'We could not send your queued order. Please try again when online.', type: 'error' });
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage({ type: 'CHECKOUT_SYNC_STATUS_REQUEST' }))
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [sendConfirmation]);

  const handleAddToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      if (existing) next.set(product.id, { ...existing, quantity: existing.quantity + 1 });
      else next.set(product.id, { product, quantity: 1 });
      return next;
    });
    setIsCartOpen(true);
  }, []);

  const handleRemoveFromCart = useCallback((productId: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const handleClearCart = useCallback(() => setCart(new Map()), []);

  const handleCheckout = useCallback(
    async (paymentMethod: string) => {
      if (!cartItemsArray.length) return;

      const payload: CheckoutPayload = {
        id: `order-${Date.now()}`,
        total: cartTotal,
        paymentMethod,
        createdAt: new Date().toISOString(),
        items: cartItemsArray.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          quantity,
          unitPrice: product.price,
        })),
        source: 'pwa',
      };

      const finalize = () => {
        handleClearCart();
        setIsCartOpen(false);
      };

      if (!navigator.onLine) {
        try {
          await queueOfflineCheckout(payload);
          pendingSyncRef.current += 1;
          setPendingSyncCount(pendingSyncRef.current);
          setToast({
            message: 'You are offline. We queued your order and will retry automatically.',
            type: 'success',
          });
        } catch (error) {
          console.error('Failed to queue checkout while offline:', error);
          setToast({
            message: 'We could not queue your order offline. Please try again when you are back online.',
            type: 'error',
          });
        }
        finalize();
        return;
      }

      try {
        await submitOrder(payload);
        setToast({ message: `Order placed with ${paymentMethod}!`, type: 'success' });
        await sendConfirmation(payload);
      } catch (error) {
        console.error('Order submission failed, queueing for retry:', error);
        try {
          await queueOfflineCheckout(payload);
          pendingSyncRef.current += 1;
          setPendingSyncCount(pendingSyncRef.current);
          setToast({
            message: 'Network issue. Your order is queued and will be retried automatically.',
            type: 'error',
          });
        } catch (queueError) {
          console.error('Failed to queue checkout after submission failure:', queueError);
          setToast({
            message: 'We could not queue your order. Please retry shortly.',
            type: 'error',
          });
        }
      } finally {
        finalize();
      }
    },
    [cartItemsArray, cartTotal, handleClearCart, sendConfirmation]
  );

  const openAdmin = useCallback(() => {
    const token = localStorage.getItem('adminToken');
    if (token) navigate('/admin');
    else navigate('/login');
  }, [navigate]);

  const filterTabs = useMemo(
    () => [
      { key: 'all' as const, label: 'Featured', path: '/' },
      { key: 'sale' as const, label: 'Flash Sale', path: '/sale' },
      { key: 'new' as const, label: 'New Arrivals', path: '/new' },
      { key: 'price-drops' as const, label: 'Price Drops', path: '/price-drops' },
      { key: 'back-in-stock' as const, label: 'Back in Stock', path: '/back-in-stock' },
    ],
    []
  );

  const sectionCopy = useMemo(() => {
    switch (filter) {
      case 'sale':
        return {
          title: 'Flash Sale Deals',
          subtitle: saleInfo.isActive
            ? `Hurry! ${saleInfo.discount}% off across the store while stocks last.`
            : 'Plan upcoming promotions and preview sale-ready picks.',
        };
      case 'new':
        return {
          title: 'Fresh Drops',
          subtitle: 'Brand-new arrivals curated for early access shoppers.',
        };
      case 'price-drops':
        return {
          title: 'Recent Price Drops',
          subtitle: 'Catch the latest markdowns before they sell out.',
        };
      case 'back-in-stock':
        return {
          title: 'Back in Stock',
          subtitle: 'Popular items that just became available again.',
        };
      default:
        return {
          title: 'Featured Products',
          subtitle: 'Browse top picks, trending gear, and seasonal essentials.',
        };
    }
  }, [filter, saleInfo.discount, saleInfo.isActive]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header
        onSettingsClick={() => setIsSettingsOpen(true)}
        onCartClick={() => setIsCartOpen(true)}
        cartItemCount={cartItemCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {!isOnline && (
        <div className="bg-amber-100 text-amber-900 text-sm text-center py-2 px-4 border-b border-amber-200">
          You are offline. Showing cached data. {lastChanged ? `Last online ${lastChanged.toLocaleTimeString()}.` : ''}
        </div>
      )}

      {pendingSyncCount > 0 && (
        <div className="bg-indigo-50 text-indigo-800 text-sm text-center py-2 px-4 border-b border-indigo-200">
          {pendingSyncCount} order{pendingSyncCount > 1 ? 's' : ''} queued. We will retry once you reconnect.
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 sticky top-16 z-20">
        <div className="container mx-auto px-4 flex gap-4 overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`relative py-3 text-sm font-semibold transition-colors ${
                  isActive ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-500'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {saleInfo.isActive && <SaleBanner discount={saleInfo.discount} />}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <main className="container mx-auto p-4 md:p-6">
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{sectionCopy.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{sectionCopy.subtitle}</p>
        </header>
        <ProductList
          onAddToCart={handleAddToCart}
          searchQuery={searchQuery}
          saleInfo={saleInfo}
          activeFilter={filter === 'all' ? 'all' : filter}
        />
      </main>

      {canInstall && !isAppInstalled && <InstallBanner onInstall={triggerInstall} />}
      {!canInstall && !isAppInstalled && (
        <div className="mx-auto my-6 w-11/12 max-w-xl rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
          Install prompts are not supported on this device, but you can still add the site to your home screen from the browser menu.
        </div>
      )}

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isSupported={isSupported}
        isSubscribed={isSubscribed}
        permissionStatus={permissionStatus}
        onSubscribe={subscribe}
        onUnsubscribe={unsubscribe}
        isProcessing={isProcessing}
      />

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItemsArray}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        cartTotal={cartTotal}
      />

      <button
        onClick={openAdmin}
        className="fixed bottom-4 right-4 rounded-full bg-black px-4 py-2 text-white shadow-lg"
      >
        Admin
      </button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 🔒 Protected Route Wrapper (JWT)                                           */
/* -------------------------------------------------------------------------- */
const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const token = localStorage.getItem('adminToken');
  return token ? element : <Navigate to="/login" replace />;
};

/* -------------------------------------------------------------------------- */
/* 🌐 Main App                                                                */
/* -------------------------------------------------------------------------- */
const App: React.FC = () => {
  const [saleUpdateTrigger, setSaleUpdateTrigger] = useState(0);

  return (
    <Router>
      <Routes>
        {/* Storefront Page */}
        <Route
          path="/"
          element={<Storefront key={`all-${saleUpdateTrigger}`} filter="all" saleRefreshKey={saleUpdateTrigger} />}
        />
        <Route
          path="/sale"
          element={<Storefront key={`sale-${saleUpdateTrigger}`} filter="sale" saleRefreshKey={saleUpdateTrigger} />}
        />
        <Route
          path="/new"
          element={<Storefront key={`new-${saleUpdateTrigger}`} filter="new" saleRefreshKey={saleUpdateTrigger} />}
        />
        <Route
          path="/price-drops"
          element={<Storefront key={`price-${saleUpdateTrigger}`} filter="price-drops" saleRefreshKey={saleUpdateTrigger} />}
        />
        <Route
          path="/back-in-stock"
          element={<Storefront key={`back-${saleUpdateTrigger}`} filter="back-in-stock" saleRefreshKey={saleUpdateTrigger} />}
        />

        {/* JWT Admin Login (component should set adminToken) */}
        <Route
          path="/login"
          element={
            <AdminLogin
              // onSuccess should set token (inside component), then redirect to /admin or /
              // If your component does not accept onSuccess, you can remove this prop.
              onSuccess={() => {
                // optional safety: if your AdminLogin already navigates, you can omit this
                if (localStorage.getItem('adminToken')) {
                  window.location.replace('/admin');
                } else {
                  window.location.replace('/');
                }
              }}
            />
          }
        />

        {/* Protected Admin Panel PAGE (renders AdminPanel as a page, not a modal) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              element={
                <div className="min-h-screen bg-gray-50">
                  {/* Optional: show a small header/back button */}
                  <div className="p-4">
                    <button
                      onClick={() => (window.location.href = '/')}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      ← Back to Store
                    </button>
                  </div>

                  <AdminPanel
                    isOpen={true}
                    onClose={() => (window.location.href = '/')}
                    showToast={() => {}}
                    onSaleUpdate={() => setSaleUpdateTrigger(prev => prev + 1)}
                    initialSaleState={{ isActive: false, discount: 0 }}
                  />
                </div>
              }
            />
          }
        />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
