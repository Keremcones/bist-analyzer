export default async function handler(req, res) {
    const { slug, ...queryParams } = req.query;
    const path = Array.isArray(slug) ? slug.join('/') : (slug || '');
    const qs = new URLSearchParams(queryParams).toString();
    const url = `https://api.twelvedata.com/${path}${qs ? '?' + qs : ''}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
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
