export const formatCurrency = (value) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

export const formatPercent = (value) => {
    if (value === undefined || value === null) return '-';
    const formatted = new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

    return value > 0 ? `+${formatted}%` : `${formatted}%`;
};

export const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
};
export const formatLargeNumber = (value) => {
    if (value === undefined || value === null) return '-';
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
    return value.toLocaleString('tr-TR');
};
