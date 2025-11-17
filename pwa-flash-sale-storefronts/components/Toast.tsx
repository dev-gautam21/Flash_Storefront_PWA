import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    onClose: () => void;
    type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, onClose, type = 'success' }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 3500);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [message, onClose]);
    
    const isSuccess = type === 'success';

    return (
        <>
            <style>
                {`
                    @keyframes slide-in-top {
                        0% {
                            transform: translate(-50%, -100px);
                            opacity: 0;
                        }
                        100% {
                            transform: translate(-50%, 0);
                            opacity: 1;
                        }
                    }
                    .animate-slide-in-top {
                        animation: slide-in-top 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
                    }
                `}
            </style>
            <div
                className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] transition-opacity duration-300 ${
                    message ? 'opacity-100 animate-slide-in-top' : 'opacity-0 pointer-events-none'
                }`}
            >
                {message && (
                     <div className={`${isSuccess ? 'bg-gray-800' : 'bg-red-600'} text-white rounded-full shadow-lg flex items-center p-2 pl-4`}>
                        {isSuccess ? (
                            <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ) : (
                            <svg className="w-6 h-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        )}
                        <span className="font-medium text-sm pr-2">{message}</span>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-black hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default Toast;