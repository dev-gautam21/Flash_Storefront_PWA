import React, { useState, useEffect } from "react";
import { sendNotification, startSale, endSale, getSaleStatus } from "../services/api";
import type { NotificationCategory } from "../types";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  onSaleUpdate: () => void;
  initialSaleState: { isActive: boolean; discount: number };
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  showToast,
  onSaleUpdate,
  initialSaleState,
}) => {
  const [title, setTitle] = useState("⚡ Weekend Special!");
  const [body, setBody] = useState("All backpacks are 20% off. Don't miss out!");
  const [category, setCategory] = useState<NotificationCategory>("flashSales");
  const [isSending, setIsSending] = useState(false);
  const [ttlSeconds, setTtlSeconds] = useState<number>(3600);
  const [sendOnDate, setSendOnDate] = useState<string>('');
  const [sendOnTime, setSendOnTime] = useState<string>('');

  const [discount, setDiscount] = useState<number>(initialSaleState.discount || 20);
  const [isSaleActive, setIsSaleActive] = useState(initialSaleState.isActive);
  const [isUpdatingSale, setIsUpdatingSale] = useState(false);

  // ✅ Keep sale status in sync with backend but without flicker
  useEffect(() => {
    if (!isOpen) return;
    const fetchStatus = async () => {
      const currentSale = await getSaleStatus();
      if (currentSale) {
        setDiscount(currentSale.discount || 20);
        setIsSaleActive(currentSale.isActive);
      }
    };
    fetchStatus();
  }, [isOpen]);

  // ✅ Custom Notification Sender
  const handleSendNotification = async () => {
    if (!title || !body) return;
    setIsSending(true);
    const sendAt = sendOnDate && sendOnTime ? new Date(`${sendOnDate}T${sendOnTime}`).toISOString() : undefined;
    const success = await sendNotification({
      title,
      body,
      category,
      ttl: ttlSeconds,
      sendAt,
    });

    if (success) showToast("✅ Notification sent successfully!", "success");
    else showToast("❌ Failed to send notification.", "error");

    setIsSending(false);
  };

  // ✅ Start Sale
  const handleStartSale = async () => {
    if (discount <= 0 || discount > 100) {
      showToast("Enter a discount between 1 and 100.", "error");
      return;
    }

    setIsUpdatingSale(true);
    const success = await startSale(discount);
    if (success) {
      showToast(`🔥 Sale started at ${discount}% off!`, "success");
      setIsSaleActive(true);
      onSaleUpdate();
    } else {
      showToast("❌ Failed to start sale.", "error");
    }
    setIsUpdatingSale(false);
  };

  // ✅ End Sale
  const handleEndSale = async () => {
    setIsUpdatingSale(true);
    const success = await endSale();
    if (success) {
      showToast("🛑 Sale ended.", "success");
      setIsSaleActive(false);
      setDiscount(20);
      onSaleUpdate();
    } else {
      showToast("❌ Failed to end sale.", "error");
    }
    setIsUpdatingSale(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-700">Admin Panel</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('adminToken');
                  localStorage.removeItem('adminTokenExpiresAt');
                } catch {}
                window.location.replace('/');
              }}
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Logout
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        {/* Sale Section */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-800 mb-2">Store-wide Sale</h3>
          <label className="block text-sm mb-1 text-gray-600">Discount (%)</label>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            disabled={isSaleActive}
            min={1}
            max={100}
            className="w-full border rounded px-3 py-2 mb-3 focus:ring focus:ring-indigo-300"
          />
          {isSaleActive ? (
            <button
              onClick={handleEndSale}
              disabled={isUpdatingSale}
              className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              {isUpdatingSale ? "Processing..." : "End Current Sale"}
            </button>
          ) : (
            <button
              onClick={handleStartSale}
              disabled={isUpdatingSale}
              className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {isUpdatingSale ? "Processing..." : "Start Sale & Notify Users"}
            </button>
          )}
        </div>

        {/* Custom Notification Section */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Custom Notification</h3>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as NotificationCategory)}
            className="w-full border rounded px-3 py-2 mb-2"
          >
            <option value="flashSales">Flash Sale</option>
            <option value="newArrivals">New Arrival</option>
            <option value="priceDrops">Price Drop</option>
            <option value="backInStock">Back In Stock</option>
          </select>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            className="w-full border rounded px-3 py-2 mb-3"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">TTL (seconds)</label>
              <input
                type="number"
                min={60}
                step={60}
                value={ttlSeconds}
                onChange={(event) => setTtlSeconds(Number(event.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Schedule (optional)</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={sendOnDate}
                  onChange={(event) => setSendOnDate(event.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="time"
                  value={sendOnTime}
                  onChange={(event) => setSendOnTime(event.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>
          {sendOnDate && sendOnTime && (
            <p className="text-xs text-gray-500 mb-3">
              Scheduled for {new Date(`${sendOnDate}T${sendOnTime}`).toLocaleString()}.
            </p>
          )}
          <button
            onClick={handleSendNotification}
            disabled={isSending}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isSending ? "Sending..." : "Send Notification"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
