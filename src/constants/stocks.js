export const BIST_STOCKS = [
    // Bankacılık
    { symbol: 'AKBNK', name: 'Akbank',           sector: 'Bankacılık', logoDomain: 'akbank.com' },
    { symbol: 'GARAN', name: 'Garanti BBVA',      sector: 'Bankacılık', logoDomain: 'garantibbva.com' },
    { symbol: 'YKBNK', name: 'Yapı Kredi',        sector: 'Bankacılık', logoDomain: 'yapikredi.com' },
    { symbol: 'ISCTR', name: 'İş Bankası C',      sector: 'Bankacılık', logoDomain: 'isbank.com.tr' },
    { symbol: 'HALKB', name: 'Halkbank',          sector: 'Bankacılık', logoDomain: 'halkbank.com.tr' },
    { symbol: 'VAKBN', name: 'VakıfBank',         sector: 'Bankacılık', logoDomain: 'vakifbank.com.tr' },
    { symbol: 'QNBFB', name: 'QNB Finansbank',    sector: 'Bankacılık', logoDomain: 'qnbfinansbank.com' },
    { symbol: 'TSKB',  name: 'TSKB',              sector: 'Bankacılık', logoDomain: 'tskb.com.tr' },
    { symbol: 'ALBRK', name: 'Albaraka Türk',     sector: 'Bankacılık', logoDomain: 'albaraka.com.tr' },

    // Holding
    { symbol: 'KCHOL', name: 'Koç Holding',       sector: 'Holding', logoDomain: 'koc.com.tr' },
    { symbol: 'SAHOL', name: 'Sabancı Holding',   sector: 'Holding', logoDomain: 'sabanci.com' },
    { symbol: 'DOHOL', name: 'Doğan Holding',     sector: 'Holding', logoDomain: 'doganholding.com.tr' },
    { symbol: 'MPARK', name: 'MLP Sağlık',        sector: 'Holding', logoDomain: 'mlpsaglik.com' },
    { symbol: 'TKFEN', name: 'Tekfen Holding',    sector: 'Holding', logoDomain: 'tekfen.com.tr' },
    { symbol: 'SNGYO', name: 'Sinpaş GYO',        sector: 'Holding', logoDomain: 'sinpas.com.tr' },
    { symbol: 'ALARK', name: 'Alarko Holding',    sector: 'Holding', logoDomain: 'alarko.com.tr' },

    // Ulaştırma & Havacılık
    { symbol: 'THYAO', name: 'Türk Hava Yolları', sector: 'Ulaştırma', logoDomain: 'turkishairlines.com' },
    { symbol: 'PGSUS', name: 'Pegasus',           sector: 'Ulaştırma', logoDomain: 'flypgs.com' },
    { symbol: 'TAVHL', name: 'TAV Havalimanları', sector: 'Ulaştırma', logoDomain: 'tavairports.com' },
    { symbol: 'CLEBI', name: 'Çelebi Hava',       sector: 'Ulaştırma', logoDomain: 'celebiaviation.com' },

    // Otomotiv
    { symbol: 'FROTO', name: 'Ford Otosan',       sector: 'Otomotiv', logoDomain: 'fordotosan.com.tr' },
    { symbol: 'TOASO', name: 'Tofaş',             sector: 'Otomotiv', logoDomain: 'tofas.com.tr' },
    { symbol: 'OTKAR', name: 'Otokar',            sector: 'Otomotiv', logoDomain: 'otokar.com.tr' },
    { symbol: 'DOAS',  name: 'Doğuş Otomotiv',   sector: 'Otomotiv', logoDomain: 'dogusotomotiv.com.tr' },
    { symbol: 'TTRAK', name: 'Türk Traktör',      sector: 'Otomotiv', logoDomain: 'turktractor.com.tr' },
    { symbol: 'ASUZU', name: 'Anadolu Isuzu',     sector: 'Otomotiv', logoDomain: 'anadoluisuzu.com.tr' },
    { symbol: 'BRISA', name: 'Brisa',             sector: 'Otomotiv', logoDomain: 'brisa.com.tr' },

    // Enerji
    { symbol: 'TUPRS', name: 'Tüpraş',            sector: 'Enerji', logoDomain: 'tupras.com.tr' },
    { symbol: 'AKENR', name: 'Akenerji',          sector: 'Enerji', logoDomain: 'akenerji.com.tr' },
    { symbol: 'ZOREN', name: 'Zorlu Enerji',      sector: 'Enerji', logoDomain: 'zorluenerji.com' },
    { symbol: 'AKSEN', name: 'Aksa Enerji',       sector: 'Enerji', logoDomain: 'aksaenerji.com' },
    { symbol: 'ENERU', name: 'Enerjisa Enerji',   sector: 'Enerji', logoDomain: 'enerjisa.com.tr' },
    { symbol: 'ODAS',  name: 'Odaş Elektrik',     sector: 'Enerji', logoDomain: 'odas.com.tr' },

    // Savunma & Teknoloji
    { symbol: 'ASELS', name: 'Aselsan',           sector: 'Savunma',    logoDomain: 'aselsan.com.tr' },
    { symbol: 'ROKET', name: 'Roketsan',          sector: 'Savunma',    logoDomain: 'roketsan.com.tr' },
    { symbol: 'LOGO',  name: 'Logo Yazılım',      sector: 'Teknoloji',  logoDomain: 'logo.com.tr' },
    { symbol: 'NETAS', name: 'Netaş',             sector: 'Teknoloji',  logoDomain: 'netas.com.tr' },
    { symbol: 'INDES', name: 'İndeks Bilgisayar', sector: 'Teknoloji',  logoDomain: 'indeks.com.tr' },
    { symbol: 'MAVI',  name: 'Mavi Giyim',        sector: 'Teknoloji',  logoDomain: 'mavi.com' },

    // İletişim
    { symbol: 'TTKOM', name: 'Türk Telekom',      sector: 'İletişim', logoDomain: 'turktelekom.com.tr' },
    { symbol: 'TCELL', name: 'Turkcell',          sector: 'İletişim', logoDomain: 'turkcell.com' },

    // Demir Çelik & Madencilik
    { symbol: 'EREGL', name: 'Erdemir',           sector: 'Demir Çelik', logoDomain: 'erdemir.com.tr' },
    { symbol: 'KRDMD', name: 'Kardemir D',        sector: 'Demir Çelik', logoDomain: 'kardemir.com' },
    { symbol: 'KOZAL', name: 'Koza Altın',        sector: 'Madencilik',  logoDomain: 'kozaaltin.com.tr' },
    { symbol: 'KOZAA', name: 'Koza Madencilik',   sector: 'Madencilik',  logoDomain: 'kozamadencilik.com.tr' },

    // Kimya & Petrokimya
    { symbol: 'PETKM', name: 'Petkim',            sector: 'Kimya', logoDomain: 'petkim.com.tr' },
    { symbol: 'SASA',  name: 'Sasa Polyester',    sector: 'Kimya', logoDomain: 'sasapolyester.com' },
    { symbol: 'GUBRF', name: 'Gübre Fabrikaları', sector: 'Kimya', logoDomain: 'gubre.com.tr' },
    { symbol: 'KORDS', name: 'Kordsa',            sector: 'Kimya', logoDomain: 'kordsa.com' },

    // Cam & İnşaat Malzemesi
    { symbol: 'SISE',  name: 'Şişecam',           sector: 'Cam',          logoDomain: 'sisecam.com' },
    { symbol: 'TRKCM', name: 'Trakya Cam',        sector: 'Cam',          logoDomain: 'trakyacam.com.tr' },
    { symbol: 'CIMSA', name: 'Çimsa',             sector: 'İnşaat Malz.', logoDomain: 'cimsa.com.tr' },
    { symbol: 'AKCNS', name: 'Akçansa',           sector: 'İnşaat Malz.', logoDomain: 'akcansa.com.tr' },
    { symbol: 'ADANA', name: 'Adana Çimento A',   sector: 'İnşaat Malz.', logoDomain: 'adanacimento.com.tr' },
    { symbol: 'BOLUC', name: 'Bolu Çimento',      sector: 'İnşaat Malz.', logoDomain: 'bolucimento.com.tr' },
    { symbol: 'GOLTS', name: 'Göltaş Çimento',   sector: 'İnşaat Malz.', logoDomain: 'goltas.com.tr' },

    // İnşaat & GYO
    { symbol: 'ENKAI', name: 'Enka İnşaat',       sector: 'İnşaat', logoDomain: 'enka.com' },
    { symbol: 'EKGYO', name: 'Emlak Konut GYO',   sector: 'İnşaat', logoDomain: 'emlakkonut.com.tr' },
    { symbol: 'ISGYO', name: 'İş GYO',            sector: 'İnşaat', logoDomain: 'isgyo.com.tr' },
    { symbol: 'TRGYO', name: 'Torunlar GYO',      sector: 'İnşaat', logoDomain: 'torunlargyo.com.tr' },

    // Perakende & Gıda
    { symbol: 'BIMAS', name: 'BİM Mağazalar',     sector: 'Perakende', logoDomain: 'bim.com.tr' },
    { symbol: 'MGROS', name: 'Migros',            sector: 'Perakende', logoDomain: 'migros.com.tr' },
    { symbol: 'SOKM',  name: 'Şok Marketler',     sector: 'Perakende', logoDomain: 'sokmarket.com.tr' },
    { symbol: 'ULKER', name: 'Ülker Bisküvi',     sector: 'Gıda', logoDomain: 'ulker.com' },
    { symbol: 'CCOLA', name: 'Coca-Cola İçecek',  sector: 'Gıda', logoDomain: 'coca-cola.com' },
    { symbol: 'AEFES', name: 'Anadolu Efes',      sector: 'Gıda', logoDomain: 'anadoluefes.com' },
    { symbol: 'PRKAB', name: 'Türk Prysmian',     sector: 'Gıda', logoDomain: 'prysmian.com' },

    // Dayanıklı Tüketim
    { symbol: 'ARCLK', name: 'Arçelik',           sector: 'Dayanıklı Tüketim', logoDomain: 'arcelikglobal.com' },
    { symbol: 'VESTL', name: 'Vestel',            sector: 'Dayanıklı Tüketim', logoDomain: 'vestel.com.tr' },
    { symbol: 'VESBE', name: 'Vestel Beyaz Eşya', sector: 'Dayanıklı Tüketim', logoDomain: 'vestel.com.tr' },

    // Sağlık & Tarım
    { symbol: 'HEKTS', name: 'Hektaş',           sector: 'Tarım',  logoDomain: 'hektas.com.tr' },
    { symbol: 'SELEC', name: 'Selçuk Ecza',      sector: 'Sağlık', logoDomain: 'selcukecza.com.tr' },
    { symbol: 'ECILC', name: 'Eczacıbaşı İlaç',  sector: 'Sağlık', logoDomain: 'eczacibasi.com' },

    // Sigortacılık
    { symbol: 'TURSG', name: 'Türkiye Sigorta',   sector: 'Sigortacılık', logoDomain: 'turkiyesigorta.com.tr' },
    { symbol: 'AKGRT', name: 'Aksigorta',         sector: 'Sigortacılık', logoDomain: 'aksigorta.com.tr' },
    { symbol: 'ANSGR', name: 'Anadolu Sigorta',   sector: 'Sigortacılık', logoDomain: 'anadolusigorta.com.tr' },
];

const makeMonogramLogo = (symbol, name) => {
    const safeSymbol = (symbol || 'BIST').split('.')[0].toUpperCase();
    const initials = name
        ? name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : safeSymbol.slice(0, 2);

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' rx='12' fill='#0f172a'/><text x='50%' y='53%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='24' fill='#f8fafc'>${initials}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const getStockBySymbol = (symbol) => {
    const cleanSym = symbol.split('.')[0].toUpperCase();
    return BIST_STOCKS.find((stock) => stock.symbol === cleanSym);
};

export const getLogoUrl = (symbol) => {
    const cleanSym = symbol.split('.')[0].toUpperCase();
    return `https://s3-symbol-logo.tradingview.com/istanbul-${cleanSym.toLowerCase()}--big.svg`;
};

export const getStockLogoCandidates = (symbol, providedName = '') => {
    const cleanSym = symbol.split('.')[0].toUpperCase();
    const stock = getStockBySymbol(cleanSym);
    const fallbackName = providedName || stock?.name || cleanSym;
    const sym = cleanSym.toLowerCase();

    const logoUrls = [
        // 1. TradingView — IST exchange prefix (en güvenilir BIST kaynağı)
        `https://s3-symbol-logo.tradingview.com/istanbul-${sym}--big.svg`,
        // 2. TradingView — prefix'siz (bazı hisseler bu şekilde)
        `https://s3-symbol-logo.tradingview.com/${sym}--big.svg`,
    ];

    // 3. Clearbit — uluslararası .com domainleri için daha iyi çalışır
    if (stock?.logoDomain) {
        logoUrls.push(`https://logo.clearbit.com/${stock.logoDomain}`);
    }

    // 4. Google Favicons — son fallback (düşük kalite ama her zaman çalışır)
    if (stock?.logoDomain) {
        logoUrls.push(`https://www.google.com/s2/favicons?domain=${stock.logoDomain}&sz=128`);
    }

    // 5. Monogram — hiçbir şey yüklenmezse
    logoUrls.push(makeMonogramLogo(cleanSym, fallbackName));

    return logoUrls;
};

export const getStockMeta = (symbol) => {
    const cleanSym = symbol.split('.')[0].toUpperCase();
    return getStockBySymbol(cleanSym);
};
