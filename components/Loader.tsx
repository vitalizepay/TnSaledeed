
import React, { useState, useEffect } from 'react';

const defaultLoadingMessages = [
  "Analyzing documents...",
  "Extracting key information...",
  "Drafting the new sale deed...",
  "Applying formatting rules...",
  "Almost there...",
];

interface LoaderProps {
  message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // If a specific message is provided, don't start the interval.
    if (message) {
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % defaultLoadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50 transition-opacity duration-300">
      <div className="w-16 h-16 border-4 border-t-blue-500 border-slate-200 rounded-full animate-spin"></div>
      <p className="mt-4 text-white text-lg font-medium tracking-wide">
        {message || defaultLoadingMessages[messageIndex]}
      </p>
    </div>
  );
};
