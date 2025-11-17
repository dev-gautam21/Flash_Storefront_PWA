import React, { useState, useEffect } from 'react';
import DarkModeToggle from './DarkModeToggle';

interface HeaderProps {
    onSettingsClick: () => void;
    onCartClick: () => void;
    cartItemCount: number;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onCartClick, cartItemCount, searchQuery, onSearchChange }) => {
    // Local state for the input to provide immediate UI feedback while typing.
    const [inputValue, setInputValue] = useState(searchQuery);

    // This effect implements the debouncing. It triggers the search
    // only after the user has stopped typing for a brief period.
    useEffect(() => {
        const timerId = setTimeout(() => {
            onSearchChange(inputValue);
        }, 300); // 300ms debounce delay

        // Cleanup function to clear the timeout if the inputValue changes
        // before the delay has passed, or if the component unmounts.
        return () => {
            clearTimeout(timerId);
        };
    }, [inputValue, onSearchChange]);

    // This effect ensures the local input value updates if the searchQuery prop
    // changes from the parent (e.g., if a "clear search" button were added elsewhere).
    useEffect(() => {
        setInputValue(searchQuery);
    }, [searchQuery]);

    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 py-3 flex items-center gap-4">
                <div className="flex items-center space-x-2 flex-shrink-0">
                     <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <h1 className="text-2xl font-bold text-gray-800 hidden sm:block">FlashStore</h1>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="block w-full bg-gray-100 border border-transparent rounded-lg py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="Search products..."
                            aria-label="Search products"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <DarkModeToggle />
                    <button onClick={onCartClick} className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-out hover:scale-110" aria-label={`View shopping cart with ${cartItemCount} items`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        {cartItemCount > 0 && (
                             <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center transform translate-x-1/4 -translate-y-1/4 ring-2 ring-white animate-pulse">
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                    <button onClick={onSettingsClick} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-out hover:scale-110" aria-label="Open settings">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;