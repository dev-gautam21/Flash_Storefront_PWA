import React, { useMemo, useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import SkeletonLoader from './SkeletonLoader';
import type { Product } from '../types';

const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Premium Wireless Headphones',
    price: 149.99,
    originalPrice: 199.99,
    imageUrl: 'https://picsum.photos/seed/headphones/400/300',
    category: 'Electronics',
    isFlashSale: true,
    tags: ['price-drop', 'popular'],
    inventoryStatus: 'inStock',
    shortDescription: 'Active noise cancellation, 24hr battery life.',
  },
  {
    id: 2,
    name: 'Smart Fitness Tracker Watch',
    price: 79.99,
    imageUrl: 'https://picsum.photos/seed/watch/400/300',
    category: 'Wearables',
    isFlashSale: false,
    tags: ['new', 'health'],
    inventoryStatus: 'lowStock',
    shortDescription: 'Sleep tracking, SpO₂ monitoring, 7-day battery.',
  },
  {
    id: 3,
    name: 'Ergonomic Mechanical Keyboard',
    price: 119.5,
    imageUrl: 'https://picsum.photos/seed/keyboard/400/300',
    category: 'Computer Accessories',
    isFlashSale: false,
    tags: ['back-in-stock'],
    inventoryStatus: 'inStock',
    shortDescription: 'Hot-swappable keys, RGB lighting, tactile switches.',
  },
  {
    id: 4,
    name: 'Ultra-HD 4K Webcam',
    price: 89.99,
    originalPrice: 129.99,
    imageUrl: 'https://picsum.photos/seed/webcam/400/300',
    category: 'Electronics',
    isFlashSale: true,
    tags: ['price-drop', 'remote-work'],
    inventoryStatus: 'inStock',
  },
  {
    id: 5,
    name: 'Portable Bluetooth Speaker',
    price: 59,
    imageUrl: 'https://picsum.photos/seed/speaker/400/300',
    category: 'Audio',
    isFlashSale: false,
    tags: ['new', 'summer'],
    inventoryStatus: 'inStock',
  },
  {
    id: 6,
    name: 'Comfort Gaming Mouse',
    price: 45.99,
    originalPrice: 65,
    imageUrl: 'https://picsum.photos/seed/mouse/400/300',
    category: 'Computer Accessories',
    isFlashSale: true,
    tags: ['price-drop'],
    inventoryStatus: 'lowStock',
  },
  {
    id: 7,
    name: 'Stylish Laptop Backpack',
    price: 69.99,
    imageUrl: 'https://picsum.photos/seed/backpack/400/300',
    category: 'Accessories',
    isFlashSale: false,
    tags: ['back-in-stock', 'popular'],
    inventoryStatus: 'inStock',
  },
  {
    id: 8,
    name: 'Noise-Cancelling Earbuds',
    price: 129.99,
    imageUrl: 'https://picsum.photos/seed/earbuds/400/300',
    category: 'Audio',
    isFlashSale: false,
    tags: ['new'],
    inventoryStatus: 'inStock',
  },
];

interface ProductListProps {
    onAddToCart: (product: Product) => void;
    searchQuery: string;
    saleInfo: { isActive: boolean; discount: number };
    activeFilter: 'all' | 'sale' | 'new' | 'price-drops' | 'back-in-stock';
}

const ProductList: React.FC<ProductListProps> = ({ onAddToCart, searchQuery, saleInfo, activeFilter }) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading delay
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    const productsWithSalePrice = useMemo(() => {
        const baseProducts = mockProducts.map(p => ({ ...p }));

        const productsToDisplay = baseProducts.map(p => {
            // Reset isFlashSale to its original state unless a sale is active
            const originalProduct = mockProducts.find(op => op.id === p.id);
            p.isFlashSale = originalProduct ? originalProduct.isFlashSale : false;
            return p;
        });

        if (saleInfo.isActive && saleInfo.discount > 0) {
            return productsToDisplay.map(p => {
                const original = p.originalPrice ?? p.price;
                const salePrice = original * (1 - saleInfo.discount / 100);
                
                return {
                    ...p,
                    price: salePrice,
                    originalPrice: original,
                    isFlashSale: true, // Mark all items as on sale
                };
            });
        }
        return productsToDisplay;
    }, [saleInfo]);

    const filteredProducts = productsWithSalePrice.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        switch (activeFilter) {
            case 'sale':
                return saleInfo.isActive ? true : product.isFlashSale;
            case 'new':
                return product.tags?.includes('new');
            case 'price-drops':
                return product.tags?.includes('price-drop') || Boolean(product.originalPrice && product.originalPrice > product.price);
            case 'back-in-stock':
                return product.tags?.includes('back-in-stock');
            default:
                return true;
        }
    });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading ? (
                // Show skeleton loaders while loading
                Array.from({ length: 8 }).map((_, index) => (
                    <SkeletonLoader key={index} type="product" />
                ))
            ) : filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
                ))
            ) : (
                <div className="col-span-full text-center py-16">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="mt-2 text-xl font-medium text-gray-900">No results for "{searchQuery}"</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Try searching for something else.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProductList;