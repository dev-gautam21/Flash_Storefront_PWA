import React from 'react';

interface SaleBannerProps {
    discount: number;
}

const SaleBanner: React.FC<SaleBannerProps> = ({ discount }) => {
    if (discount <= 0) return null;

    return (
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 text-white text-center py-2 px-4 shadow-md">
            <p className="font-bold text-sm sm:text-base animate-pulse">
                🎉 FLASH SALE! Get {discount}% OFF all products for a limited time! 🎉
            </p>
        </div>
    );
};

export default SaleBanner;
