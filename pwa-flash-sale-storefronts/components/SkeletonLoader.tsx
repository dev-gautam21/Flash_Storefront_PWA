import React from 'react';

interface SkeletonLoaderProps {
  type: 'product' | 'card' | 'text' | 'image' | 'button';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, count = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'product':
        return (
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
            <div className="relative">
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 shimmer"></div>
              <div className="absolute top-4 left-4">
                <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full shimmer"></div>
              </div>
            </div>
            <div className="p-6">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2 shimmer"></div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2 w-3/4 shimmer"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 shimmer"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 shimmer"></div>
              </div>
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded-lg shimmer"></div>
            </div>
          </div>
        );
      
      case 'card':
        return (
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full shimmer"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2 w-1/3 shimmer"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 shimmer"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full shimmer"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6 shimmer"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-4/6 shimmer"></div>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className={`space-y-2 ${className}`}>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 shimmer"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full shimmer"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6 shimmer"></div>
          </div>
        );
      
      case 'image':
        return (
          <div className={`bg-gray-300 dark:bg-gray-600 rounded-lg shimmer ${className}`}></div>
        );
      
      case 'button':
        return (
          <div className={`h-10 bg-gray-300 dark:bg-gray-600 rounded-lg shimmer ${className}`}></div>
        );
      
      default:
        return (
          <div className={`bg-gray-300 dark:bg-gray-600 rounded shimmer ${className}`}></div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;