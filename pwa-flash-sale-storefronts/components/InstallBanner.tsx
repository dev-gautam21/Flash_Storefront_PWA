import React, { useState, useEffect } from 'react';

interface InstallBannerProps {
    onInstall: () => void;
}

const InstallBanner: React.FC<InstallBannerProps> = ({ onInstall }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Delay appearance for a smoother entrance animation
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleInstallClick = () => {
        // Trigger install and then hide banner
        onInstall();
        setIsVisible(false);
    };

    const handleCloseClick = () => {
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <>
            <style>
                {`
                    @keyframes slide-in-bottom {
                        0% {
                            transform: translate(-50%, 100px);
                            opacity: 0;
                        }
                        100% {
                            transform: translate(-50%, 0);
                            opacity: 1;
                        }
                    }
                    .animate-slide-in-bottom {
                        animation: slide-in-bottom 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
                    }
                `}
            </style>
            <div
                className="fixed bottom-4 left-1/2 w-11/12 max-w-md mx-auto z-50 animate-slide-in-bottom"
                role="dialog"
                aria-live="polite"
                aria-labelledby="install-banner-title"
                aria-describedby="install-banner-description"
            >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-2xl p-4 text-white relative">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0 p-2 bg-white bg-opacity-20 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5V6.75m0 6.75l-3.75-3.75M12 13.5l3.75-3.75" />
                            </svg>
                        </div>
                        <div className="flex-grow">
                            <h3 id="install-banner-title" className="font-bold text-base sm:text-lg">Install the FlashStore App</h3>
                            <p id="install-banner-description" className="text-xs sm:text-sm opacity-90">For a faster, richer experience.</p>
                        </div>
                        <div className="flex-shrink-0">
                            <button
                                onClick={handleInstallClick}
                                className="bg-white text-blue-600 font-bold py-2 px-4 sm:px-5 rounded-lg shadow-md hover:bg-gray-100 transition-colors transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-white"
                            >
                                Install
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleCloseClick}
                        className="absolute top-1 right-1 p-1.5 rounded-full text-white text-opacity-70 hover:bg-white hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Dismiss install banner"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>
        </>
    );
};

export default InstallBanner;