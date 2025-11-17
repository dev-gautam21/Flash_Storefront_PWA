import React, { useState, useEffect } from 'react';
import type { CartItem } from '../types';

interface CartProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onRemoveItem: (productId: number) => void;
    onClearCart: () => void;
    onCheckout: (paymentMethod: string) => void;
    cartTotal: number;
}

const Cart: React.FC<CartProps> = ({
    isOpen,
    onClose,
    cartItems,
    onRemoveItem,
    onClearCart,
    onCheckout,
    cartTotal,
}) => {
    const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment'>('cart');
    const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when cart is closed, delaying to match animation
            const timer = setTimeout(() => {
                setCheckoutStep('cart');
                setSelectedPayment(null);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);


    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleConfirmOrder = () => {
        if (selectedPayment) {
            onCheckout(selectedPayment);
        }
    };

    const paymentOptions = [
        { id: 'cc', name: 'Credit Card', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg> },
        { id: 'paypal', name: 'PayPal', icon: <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.353 3.033C10.743 4.418 10.32 6.25 10.32 8.532c0 2.22 1.25 3.01 3.053 3.01h.46c2.42 0 3.63-1.33 3.82-3.468.12-1.34-.5-2.29-1.58-2.29-.92 0-1.46.54-1.74 1.27-.12.3-.18.48-.36.48H13.5c-.3 0-.42-.18-.48-.48s0-.6.06-.78C13.243 4.96 14.143 3 16.523 3c2.02 0 3.62 1.34 3.44 3.96-.18 2.65-1.58 4.29-4.22 4.29h-.4c-1.16 0-1.9.47-2.12 1.43-.06.29-.06.47 0 .64.06.18.18.3.36.3h.48c.3 0 .42-.12.48-.42s0-.66-.06-.84c-.06-.18-.12-.3-.18-.36.72-1.12 1.8-1.57 3.3-1.57 2.62 0 4.1 1.54 3.88 4.35-.22 2.82-1.9 4.49-4.9 4.49-2.9 0-4.48-1.46-4.94-4.84-.06-.47-.12-.95-.12-1.43 0-.95.12-1.9.3-2.82.23-1.21.65-2.23 1.21-3.08.3-.47.65-.89 1.07-1.27.06-.06.12-.12.12-.18-.06-.12-.18-.18-.3-.18h-1.02c-1.07 0-1.52.23-1.76.77zM4.463 6.273c-.54 2.81.42 4.01 2.42 4.01h.48c1.52 0 2.24-.55 2.42-1.87.12-.83-.18-1.48-.92-1.48-.6 0-1.04.41-1.22.95-.06.23-.12.35-.24.35H6.9c-.23 0-.3-.12-.36-.35 0-.12 0-.29.06-.41.23-1.34 1.14-2.93 3.08-2.93 1.58 0 2.6.89 2.42 2.6-.12 1.76-1.12 2.87-2.9 2.87h-.48c-.9 0-1.4-.41-1.58-1.27-.06-.23-.06-.35 0-.52.06-.12.12-.23.24-.23h.36c.23 0 .3-.12.3-.35s0-.41-.06-.58c-.54-2.33-2.48-2.6-3.56-2.6-1.88 0-2.84 1.12-2.36 3.49z"></path></svg>},
        { id: 'cod', name: 'Cash on Delivery', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> },
    ];

    return (
        <div
            className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ease-in-out ${
                isOpen ? 'bg-black bg-opacity-50' : 'pointer-events-none'
            }`}
            onClick={handleBackdropClick}
            aria-modal="true"
            role="dialog"
        >
            <div
                className={`w-full max-w-md bg-white h-full shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-2xl font-bold">{checkoutStep === 'cart' ? 'Your Cart' : 'Select Payment'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {cartItems.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                        <svg className="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        <h3 className="text-xl font-semibold text-gray-700">Your cart is empty</h3>
                        <p className="text-gray-500 mt-2">Looks like you haven't added anything yet.</p>
                        <button onClick={onClose} className="mt-6 bg-indigo-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-600 transition-colors">
                            Start Shopping
                        </button>
                    </div>
                ) : checkoutStep === 'cart' ? (
                    <>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {cartItems.map(item => (
                                <div key={item.product.id} className="flex items-center space-x-4">
                                    <img src={item.product.imageUrl} alt={item.product.name} className="w-20 h-20 rounded-lg object-cover" />
                                    <div className="flex-grow">
                                        <h4 className="font-semibold">{item.product.name}</h4>
                                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                        <p className="font-bold text-indigo-600">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => onRemoveItem(item.product.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50" aria-label={`Remove ${item.product.name}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t space-y-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total</span>
                                <span>₹{cartTotal.toFixed(2)}</span>
                            </div>
                            <button onClick={() => setCheckoutStep('payment')} className="w-full bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-600 transition-colors">
                                Proceed to Checkout
                            </button>
                             <button onClick={onClearCart} className="w-full text-center text-sm text-gray-500 hover:text-red-600 transition-colors">
                                Clear Cart
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            <button onClick={() => setCheckoutStep('cart')} className="flex items-center text-sm text-gray-600 hover:text-indigo-600 font-semibold">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                Back to Cart
                            </button>
                            <div className="space-y-3 pt-4">
                                {paymentOptions.map(option => (
                                     <button key={option.id} onClick={() => setSelectedPayment(option.name)} className={`w-full flex items-center p-4 border rounded-lg text-left transition-all duration-200 ${selectedPayment === option.name ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
                                        <div className="text-gray-600">{option.icon}</div>
                                        <span className="ml-4 font-semibold text-lg flex-grow">{option.name}</span>
                                        {selectedPayment === option.name && (
                                            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t space-y-4">
                             <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total</span>
                                <span>₹{cartTotal.toFixed(2)}</span>
                            </div>
                            <button 
                                onClick={handleConfirmOrder} 
                                disabled={!selectedPayment}
                                className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {selectedPayment ? `Confirm Order with ${selectedPayment}`: 'Select a Payment Method'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Cart;