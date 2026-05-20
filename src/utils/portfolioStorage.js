const KEY = 'bist_portfolio_v1';
let _id = Date.now();
export const genId = () => String(_id++);
export const loadPortfolio = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
export const savePortfolio = (p) => localStorage.setItem(KEY, JSON.stringify(p));
