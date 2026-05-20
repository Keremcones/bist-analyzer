const ALLOWED_ORIGINS = [
    'https://query1.finance.yahoo.com',
    'https://query2.finance.yahoo.com',
    'https://api.twelvedata.com',
];

export default async function handler(req, res) {
    const { target, path, ...queryParams } = req.query;

    const bases = {
        yahoo:  'https://query1.finance.yahoo.com',
        yahoo2: 'https://query2.finance.yahoo.com',
        twelve: 'https://api.twelvedata.com',
    };

    const base = bases[target];
    if (!base) {
        return res.status(400).json({ error: 'Geçersiz target' });
    }

    const qs = new URLSearchParams(queryParams).toString();
    const url = `${base}/${path || ''}${qs ? '?' + qs : ''}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://finance.yahoo.com/',
                'Origin': 'https://finance.yahoo.com',
            },
        });

        const data = await response.json();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        res.status(response.status).json(data);
    } catch (err) {
        res.status(500).json({ error: 'Proxy hatası', detail: err.message });
    }
}
