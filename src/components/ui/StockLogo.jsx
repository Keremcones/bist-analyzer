import React, { useMemo, useState } from 'react';
import { getStockLogoCandidates } from '../../constants/stocks';

const StockLogo = ({ symbol, name = '', className = '', alt }) => {
    const logoCandidates = useMemo(() => getStockLogoCandidates(symbol, name), [symbol, name]);
    const logoKey = `${symbol}-${name}`;
    const [logoState, setLogoState] = useState({ key: logoKey, index: 0 });

    const currentIndex = logoState.key === logoKey ? logoState.index : 0;
    const safeIndex = Math.min(currentIndex, logoCandidates.length - 1);
    const currentSrc = logoCandidates[safeIndex];

    const handleError = () => {
        if (safeIndex >= logoCandidates.length - 1) return;

        setLogoState({
            key: logoKey,
            index: safeIndex + 1,
        });
    };

    return (
        <img
            src={currentSrc}
            alt={alt || symbol}
            className={className}
            loading="lazy"
            decoding="async"
            onError={handleError}
        />
    );
};

export default StockLogo;
