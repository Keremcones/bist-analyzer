export default function handler(req, res) {
    res.json({ ok: true, query: req.query });
}
