import React, { useState, useEffect } from 'react';

interface DarkModeToggleProps {
  className?: string;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ className = '' }) => {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    
    // Apply theme to document
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setIsMounted(true);
  }, []);

  const toggleDarkMode = () => {
    const newDarkState = !isDark;
    setIsDark(newDarkState);
    
    // Save preference
    localStorage.setItem('theme', newDarkState ? 'dark' : 'light');
    
    // Apply to document
    if (newDarkState) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark: newDarkState } }));
  };

  if (!isMounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <button
      onClick={toggleDarkMode}
      className={`relative p-3 rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        isDark 
          ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
          : 'bg-white text-gray-600 hover:bg-gray-100 shadow-lg'
      } ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun Icon */}
      <div className={`transition-all duration-300 ease-out transform ${
        isDark ? 'rotate-180 scale-0' : 'rotate-0 scale-100'
      }`}>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      </div>
      
      {/* Moon Icon */}
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out transform ${
        isDark ? 'rotate-0 scale-100' : '-rotate-180 scale-0'
      }`}>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </div>
      
      {/* Ripple effect */}
      <div className={`absolute inset-0 rounded-full transition-all duration-500 ease-out ${
        isDark 
          ? 'bg-yellow-400/20 scale-0' 
          : 'bg-blue-500/20 scale-0'
      } group-hover:scale-150`}></div>
    </button>
  );
};

export default DarkModeToggle;