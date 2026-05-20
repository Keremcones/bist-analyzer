import React from 'react';

const AppLogo = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="appLogoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0f766e" />
                <stop offset="1" stopColor="#0891b2" />
            </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#appLogoGrad)" />
        {/* Left candle — bullish */}
        <line x1="11" y1="16" x2="11" y2="20" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="8.5" y="20" width="5" height="10" rx="1.5" fill="#10b981" />
        <line x1="11" y1="30" x2="11" y2="35" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" />
        {/* Middle candle — bearish */}
        <line x1="24" y1="11" x2="24" y2="15" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="21.5" y="15" width="5" height="9" rx="1.5" fill="#ef4444" />
        <line x1="24" y1="24" x2="24" y2="28" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
        {/* Right candle — bullish */}
        <line x1="37" y1="7" x2="37" y2="11" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="34.5" y="11" width="5" height="13" rx="1.5" fill="#10b981" />
        <line x1="37" y1="24" x2="37" y2="28" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" />
        {/* Trend line */}
        <polyline points="11,25 24,20 37,16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default AppLogo;
