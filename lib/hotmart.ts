type HotmartToken = {
  access_token: string;
  token_type?: string;
  expires_in: number;
  expires_at: number;
};

type SaleItem = {
  buyer?: {
    name?: string;
    email?: string;
  };
  purchase_date?: string;
};

const DEFAULT_BASE_URL = "https://developers.hotmart.com";
const SALES_HISTORY_PATH = "/payments/api/v1/sales/history";
const TOKEN_ENDPOINT = "https://api-sec-vlc.hotmart.com/security/oauth/token";

function getEnv() {
  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;
  const basicAuth = process.env.HOTMART_BASIC_AUTH;
  const baseUrl = process.env.HOTMART_BASE_URL || DEFAULT_BASE_URL;

  if (!clientId || !clientSecret) {
    throw new Error("Missing HOTMART_CLIENT_ID / HOTMART_CLIENT_SECRET");
  }

  return { clientId, clientSecret, basicAuth, baseUrl };
}

function getTokenCache() {
  const g = globalThis as unknown as { __hotmartToken?: HotmartToken };
  return g;
}

async function generateHotmartToken(): Promise<HotmartToken> {
  const { clientId, clientSecret, basicAuth } = getEnv();
  const authHeader = basicAuth
    ? basicAuth.startsWith("Basic ")
      ? basicAuth
      : `Basic ${basicAuth}`
    : `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

  const tokenUrl = `${TOKEN_ENDPOINT}?grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hotmart token request failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type?: string;
    expires_in: number;
  };

  const expiresAt = Date.now() + data.expires_in * 1000;
  const token: HotmartToken = {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expires_at: expiresAt
  };

  getTokenCache().__hotmartToken = token;
  return token;
}

async function getValidToken() {
  const cache = getTokenCache();
  const token = cache.__hotmartToken;
  const marginMs = 5 * 60 * 1000;
  if (!token || token.expires_at - marginMs <= Date.now()) {
    return generateHotmartToken();
  }
  return token;
}

async function fetchSalesByStatus(baseUrl: string, accessToken: string, email: string, status: string): Promise<SaleItem[]> {
  const url = new URL(SALES_HISTORY_PATH, baseUrl);
  url.searchParams.set("transaction_status", status);
  url.searchParams.set("buyer_email", email);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hotmart sales history failed: ${res.status} ${text} (url=${url.toString()})`);
  }

  const data = (await res.json()) as { items?: SaleItem[]; data?: { items?: SaleItem[] } };
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

export async function checkEmailAuthorized(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email) {
    return { authorized: false, message: "Email é obrigatório" } as const;
  }

  const { baseUrl } = getEnv();
  const token = await getValidToken();

  const [completeSales, approvedSales] = await Promise.all([
    fetchSalesByStatus(baseUrl, token.access_token, email, "COMPLETE"),
    fetchSalesByStatus(baseUrl, token.access_token, email, "APPROVED")
  ]);

  const sales = [...completeSales, ...approvedSales];
  if (sales.length === 0) {
    return { authorized: false, message: "Email não encontrado na base de clientes" } as const;
  }

  const name = sales[0]?.buyer?.name || "Usuário";
  const lastPurchase = sales[0]?.purchase_date || null;

  return {
    authorized: true,
    user: {
      email,
      name,
      totalPurchases: sales.length,
      lastPurchase
    }
  } as const;
}
