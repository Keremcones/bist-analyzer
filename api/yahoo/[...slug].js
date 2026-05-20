export default async function handler(req, res) {
    const { slug, ...queryParams } = req.query;
    const path = Array.isArray(slug) ? slug.join('/') : (slug || '');
    const qs = new URLSearchParams(queryParams).toString();
    const url = `https://query1.finance.yahoo.com/${path}${qs ? '?' + qs : ''}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
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
