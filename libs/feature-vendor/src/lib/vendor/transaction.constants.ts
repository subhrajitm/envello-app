import { TransactionType } from '@envello/domain';

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    active:    { label: 'Active',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
    paused:    { label: 'Paused',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    cancelled: { label: 'Cancelled', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    completed: { label: 'Completed', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
};

export const TYPE_META: Record<TransactionType, { label: string; icon: string; color: string }> = {
    'recurring': { label: 'Recurring',  icon: 'autorenew',         color: '#60a5fa' },
    'one-time':  { label: 'One-time',   icon: 'toll',              color: '#a78bfa' },
    'bill':      { label: 'Bills',      icon: 'receipt',           color: '#fb923c' },
    'purchase':  { label: 'Purchases',  icon: 'shopping_bag',      color: '#4ade80' },
    'refund':    { label: 'Refunds',    icon: 'currency_exchange',  color: '#34d399' },
};

export interface CurrencyMeta { code: string; name: string; symbol: string; }

export const ALL_CURRENCIES: CurrencyMeta[] = [
    { code: 'USD', name: 'US Dollar',               symbol: '$'    },
    { code: 'EUR', name: 'Euro',                    symbol: '€'    },
    { code: 'GBP', name: 'British Pound',           symbol: '£'    },
    { code: 'JPY', name: 'Japanese Yen',            symbol: '¥'    },
    { code: 'CAD', name: 'Canadian Dollar',         symbol: 'CA$'  },
    { code: 'AUD', name: 'Australian Dollar',       symbol: 'A$'   },
    { code: 'CHF', name: 'Swiss Franc',             symbol: 'CHF'  },
    { code: 'CNY', name: 'Chinese Yuan',            symbol: '¥'    },
    { code: 'INR', name: 'Indian Rupee',            symbol: '₹'    },
    { code: 'BRL', name: 'Brazilian Real',          symbol: 'R$'   },
    { code: 'MXN', name: 'Mexican Peso',            symbol: 'MX$'  },
    { code: 'SGD', name: 'Singapore Dollar',        symbol: 'S$'   },
    { code: 'HKD', name: 'Hong Kong Dollar',        symbol: 'HK$'  },
    { code: 'NOK', name: 'Norwegian Krone',         symbol: 'kr'   },
    { code: 'SEK', name: 'Swedish Krona',           symbol: 'kr'   },
    { code: 'DKK', name: 'Danish Krone',            symbol: 'kr'   },
    { code: 'NZD', name: 'New Zealand Dollar',      symbol: 'NZ$'  },
    { code: 'KRW', name: 'South Korean Won',        symbol: '₩'    },
    { code: 'TRY', name: 'Turkish Lira',            symbol: '₺'    },
    { code: 'ZAR', name: 'South African Rand',      symbol: 'R'    },
    { code: 'RUB', name: 'Russian Ruble',           symbol: '₽'    },
    { code: 'PLN', name: 'Polish Złoty',            symbol: 'zł'   },
    { code: 'THB', name: 'Thai Baht',               symbol: '฿'    },
    { code: 'IDR', name: 'Indonesian Rupiah',       symbol: 'Rp'   },
    { code: 'MYR', name: 'Malaysian Ringgit',       symbol: 'RM'   },
    { code: 'PHP', name: 'Philippine Peso',         symbol: '₱'    },
    { code: 'VND', name: 'Vietnamese Đồng',         symbol: '₫'    },
    { code: 'PKR', name: 'Pakistani Rupee',         symbol: '₨'    },
    { code: 'BDT', name: 'Bangladeshi Taka',        symbol: '৳'    },
    { code: 'EGP', name: 'Egyptian Pound',          symbol: 'E£'   },
    { code: 'ARS', name: 'Argentine Peso',          symbol: '$'    },
    { code: 'CLP', name: 'Chilean Peso',            symbol: 'CL$'  },
    { code: 'COP', name: 'Colombian Peso',          symbol: 'CO$'  },
    { code: 'PEN', name: 'Peruvian Sol',            symbol: 'S/'   },
    { code: 'UAH', name: 'Ukrainian Hryvnia',       symbol: '₴'    },
    { code: 'CZK', name: 'Czech Koruna',            symbol: 'Kč'   },
    { code: 'HUF', name: 'Hungarian Forint',        symbol: 'Ft'   },
    { code: 'RON', name: 'Romanian Leu',            symbol: 'lei'  },
    { code: 'ILS', name: 'Israeli Shekel',          symbol: '₪'    },
    { code: 'AED', name: 'UAE Dirham',              symbol: 'د.إ'  },
    { code: 'SAR', name: 'Saudi Riyal',             symbol: '﷼'    },
    { code: 'QAR', name: 'Qatari Riyal',            symbol: '﷼'    },
    { code: 'KWD', name: 'Kuwaiti Dinar',           symbol: 'د.ك'  },
    { code: 'BHD', name: 'Bahraini Dinar',          symbol: '.د.ب' },
    { code: 'OMR', name: 'Omani Rial',              symbol: '﷼'    },
    { code: 'NGN', name: 'Nigerian Naira',          symbol: '₦'    },
    { code: 'KES', name: 'Kenyan Shilling',         symbol: 'KSh'  },
    { code: 'GHS', name: 'Ghanaian Cedi',           symbol: '₵'    },
    { code: 'MAD', name: 'Moroccan Dirham',         symbol: 'MAD'  },
    { code: 'TZS', name: 'Tanzanian Shilling',      symbol: 'TSh'  },
    { code: 'TWD', name: 'Taiwan Dollar',           symbol: 'NT$'  },
    { code: 'HRK', name: 'Croatian Kuna',           symbol: 'kn'   },
    { code: 'BGN', name: 'Bulgarian Lev',           symbol: 'лв'   },
    { code: 'ISK', name: 'Icelandic Króna',         symbol: 'kr'   },
    { code: 'LKR', name: 'Sri Lankan Rupee',        symbol: '₨'    },
    { code: 'NPR', name: 'Nepalese Rupee',          symbol: '₨'    },
    { code: 'MMK', name: 'Myanmar Kyat',            symbol: 'K'    },
    { code: 'KHR', name: 'Cambodian Riel',          symbol: '៛'    },
    { code: 'UZS', name: 'Uzbekistani Som',         symbol: 'soʻm' },
    { code: 'KZT', name: 'Kazakhstani Tenge',       symbol: '₸'    },
    { code: 'GEL', name: 'Georgian Lari',           symbol: '₾'    },
    { code: 'AMD', name: 'Armenian Dram',           symbol: '֏'    },
    { code: 'AZN', name: 'Azerbaijani Manat',       symbol: '₼'    },
    { code: 'JOD', name: 'Jordanian Dinar',         symbol: 'JD'   },
    { code: 'LBP', name: 'Lebanese Pound',          symbol: 'L£'   },
    { code: 'IQD', name: 'Iraqi Dinar',             symbol: 'ع.د'  },
    { code: 'IRR', name: 'Iranian Rial',            symbol: '﷼'    },
];

/** Flat list of currency codes — kept for backward compatibility. */
export const CURRENCIES = ALL_CURRENCIES.map(c => c.code);

const _symbolMap = Object.fromEntries(ALL_CURRENCIES.map(c => [c.code, c.symbol]));

export const CATEGORY_OPTIONS = [
    'software', 'infrastructure', 'design', 'marketing', 'security',
    'analytics', 'communication', 'finance', 'utilities', 'shopping',
    'travel', 'food', 'other',
];

export const POPULAR_VENDOR_KEYS = ['github', 'aws', 'figma', 'slack', 'notion', 'stripe', 'openai', 'vercel', 'datadog', 'adobe'];

export const VENDOR_PRESETS: Record<string, { category: string; billingCycle: 'monthly' | 'yearly'; currency: string }> = {
    'github':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'github copilot':       { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'gitlab':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'aws':                  { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'amazon web services':  { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'gcp':                  { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'google cloud':         { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'azure':                { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'vercel':               { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'netlify':              { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'heroku':               { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'digitalocean':         { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'cloudflare':           { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'linode':               { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'cloudinary':           { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'render':               { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'railway':              { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'supabase':             { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'planetscale':          { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'neon':                 { category: 'infrastructure',  billingCycle: 'monthly', currency: 'USD' },
    'figma':                { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'sketch':               { category: 'design',          billingCycle: 'yearly',  currency: 'USD' },
    'adobe':                { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'adobe creative cloud': { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'canva':                { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'framer':               { category: 'design',          billingCycle: 'monthly', currency: 'USD' },
    'slack':                { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'discord':              { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'zoom':                 { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'microsoft teams':      { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'google workspace':     { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'twilio':               { category: 'communication',   billingCycle: 'monthly', currency: 'USD' },
    'notion':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'linear':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'jira':                 { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'asana':                { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'trello':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'clickup':              { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'monday':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'openai':               { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'anthropic':            { category: 'software',        billingCycle: 'monthly', currency: 'USD' },
    'datadog':              { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'sentry':               { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'new relic':            { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'pagerduty':            { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'mixpanel':             { category: 'analytics',       billingCycle: 'monthly', currency: 'USD' },
    'mailchimp':            { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'sendgrid':             { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'hubspot':              { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'postmark':             { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'resend':               { category: 'marketing',       billingCycle: 'monthly', currency: 'USD' },
    'stripe':               { category: 'finance',         billingCycle: 'monthly', currency: 'USD' },
    'quickbooks':           { category: 'finance',         billingCycle: 'monthly', currency: 'USD' },
    'auth0':                { category: 'security',        billingCycle: 'monthly', currency: 'USD' },
    '1password':            { category: 'security',        billingCycle: 'yearly',  currency: 'USD' },
    'lastpass':             { category: 'security',        billingCycle: 'yearly',  currency: 'USD' },
    'bitwarden':            { category: 'security',        billingCycle: 'yearly',  currency: 'USD' },
    'tailscale':            { category: 'security',        billingCycle: 'monthly', currency: 'USD' },
};

export function toDisplayName(key: string): string {
    const overrides: Record<string, string> = {
        'aws': 'AWS', 'gcp': 'GCP', '1password': '1Password',
        'github': 'GitHub', 'github copilot': 'GitHub Copilot',
        'gitlab': 'GitLab', 'google cloud': 'Google Cloud',
        'google workspace': 'Google Workspace', 'microsoft teams': 'Microsoft Teams',
        'adobe creative cloud': 'Adobe Creative Cloud', 'new relic': 'New Relic',
    };
    return overrides[key] ?? key.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function toLocalDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function autoDate(cycle: 'monthly' | 'yearly' | 'weekly'): string {
    const d = new Date();
    if (cycle === 'monthly')     d.setMonth(d.getMonth() + 1);
    else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else                         d.setDate(d.getDate() + 7);
    return toLocalDateString(d);
}

export function avatarBg(name: string): string {
    const colors = ['#60a5fa', '#4ade80', '#fbbf24', '#a855f7', '#fb923c', '#f472b6', '#34d399', '#e879f9'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

export function currencySymbol(currency: string | undefined): string {
    return _symbolMap[currency ?? 'USD'] ?? currency ?? '$';
}

export function categoryIcon(cat: string): string {
    const icons: Record<string, string> = {
        software: 'code', infrastructure: 'cloud', design: 'palette',
        marketing: 'campaign', security: 'shield', analytics: 'bar_chart',
        communication: 'chat', finance: 'payments', utilities: 'electrical_services',
        shopping: 'shopping_bag', travel: 'flight', food: 'restaurant', other: 'category',
    };
    return icons[cat] ?? 'category';
}
