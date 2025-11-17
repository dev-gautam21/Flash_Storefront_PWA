import React, { useState, useEffect } from 'react';
import type { Product } from '../types';

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;
}

const generateFallbackImage = (name: string): string => {
  // Simple SVG fallback that doesn't require canvas
  const displayName = name || 'Product';
  const svgContent = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6B7280;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#374151;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#grad1)"/>
    <text x="200" y="150" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">${displayName}</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
    const [isAdded, setIsAdded] = useState(false);
    const [imageUrl, setImageUrl] = useState(product.imageUrl);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (product.imageUrl) {
            // Use existing image URL if available
            setImageUrl(product.imageUrl);
            setImageLoading(false);
            return;
        }

        // Only generate fallback image if no imageUrl exists
        try {
            const fallbackName = product.name || 'Product';
            const svgUrl = generateFallbackImage(fallbackName);
            setImageUrl(svgUrl);
            setImageLoading(false);
        } catch (error) {
            console.error('Error generating fallback image:', error);
            // Final fallback: use a simple SVG
             const fallbackSvg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
               <rect width="400" height="300" fill="#6B7280"/>
               <text x="200" y="150" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">Product</text>
             </svg>`;
             setImageUrl(`data:image/svg+xml;base64,${btoa(fallbackSvg)}`);
            setImageLoading(false);
        }
    }, [product.name, product.imageUrl]);

    const handleAddToCartClick = () => {
        if (isAdded) return;
        onAddToCart(product);
        setIsAdded(true);
        setTimeout(() => {
            setIsAdded(false);
        }, 2000);
    };

    const discountPercent = product.originalPrice && product.price < product.originalPrice 
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : null;

    return (
        <div className="relative group">
            {/* Glassmorphism background with blur effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl group-hover:shadow-3xl transition-all duration-500 ease-out transform group-hover:scale-105"></div>
            
            {/* Main card content */}
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/30 shadow-xl transition-all duration-500 ease-out group-hover:shadow-2xl group-hover:bg-white/90">
                <div className="relative">
                    {/* Image container with loading state */}
                    <div className="relative w-full h-56 overflow-hidden">
                        {imageLoading && (
                            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                                <div className="text-gray-400 text-sm">Loading image...</div>
                            </div>
                        )}
                        <img 
                            className={`w-full h-56 object-cover transition-transform duration-700 ease-out group-hover:scale-110 ${
                                imageLoading ? 'opacity-0' : 'opacity-100'
                            }`} 
                            src={imageUrl} 
                            alt={product.name}
                            onLoad={() => setImageLoading(false)}
                            onError={() => {
                                setImageError(true);
                                setImageLoading(false);
                                setImageUrl(`https://via.placeholder.com/400x300?text=${encodeURIComponent(product.name)}`);
                            }}
                        />
                    </div>
                    
                    {/* Enhanced badge animations with warmer colors */}
                    {discountPercent && (
                        <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 text-xs font-bold px-3 py-1 m-2 rounded-full uppercase z-10 transform transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-lg">
                            {discountPercent}% OFF
                        </div>
                    )}
                    
                    {product.isFlashSale && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-bold px-3 py-1 m-2 rounded-full uppercase flex items-center animate-pulse transform transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-lg">
                             <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
                            Flash Sale
                        </div>
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
                </div>
                
                <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300 ease-out truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 group-hover:text-gray-600 transition-colors duration-300 ease-out">{product.category}</p>
                    
                    {product.shortDescription && (
                        <p className="mt-2 text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300 ease-out">{product.shortDescription}</p>
                    )}
                    
                    {product.inventoryStatus && (
                        <p
                            className={`mt-2 inline-flex items-center text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ease-out ${
                                product.inventoryStatus === 'inStock'
                                    ? 'text-green-600'
                                    : product.inventoryStatus === 'lowStock'
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 10-1.5 0v3.5a.75.75 0 001.5 0v-3.5zm0 6.5a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" clipRule="evenodd" />
                            </svg>
                            {product.inventoryStatus === 'inStock' && 'In stock'}
                            {product.inventoryStatus === 'lowStock' && 'Low stock'}
                            {product.inventoryStatus === 'outOfStock' && 'Out of stock'}
                        </p>
                    )}
                    
                    <div className="flex items-baseline mt-4">
                        <p className="text-2xl font-bold text-blue-600 group-hover:text-indigo-700 transition-colors duration-300 ease-out">₹{product.price.toFixed(2)}</p>
                        {product.originalPrice && (
                            <p className="text-md text-gray-400 line-through ml-2 group-hover:text-gray-500 transition-colors duration-300 ease-out">₹{product.originalPrice.toFixed(2)}</p>
                        )}
                    </div>
                    
                    <button
                        onClick={handleAddToCartClick}
                        disabled={isAdded}
                        className={`mt-4 w-full text-white py-3 rounded-lg font-semibold transition-all duration-300 ease-out transform focus:outline-none focus:ring-2 focus:ring-opacity-50 hover:shadow-lg group-hover:scale-105 ${
                            isAdded
                                ? 'bg-green-500 focus:ring-green-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 active:scale-95'
                        }`}
                    >
                        {isAdded ? (
                            <span className="flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                Added!
                            </span>
                        ) : (
                            'Add to Cart'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;