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

const HOTMART_BASE_URL = process.env.HOTMART_BASE_URL || "https://developers.hotmart.com";
const SALES_HISTORY_URL = `${HOTMART_BASE_URL}/payments/api/v1/sales/history`;

const HOTMART_DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0"
};

function getEnv() {
  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing HOTMART_CLIENT_ID / HOTMART_CLIENT_SECRET");
  }

  return { clientId, clientSecret };
}

function getTokenCache() {
  const g = globalThis as unknown as { __hotmartToken?: HotmartToken };
  return g;
}

async function readJsonResponse<T>(res: Response, context: string): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    const snippet = text.slice(0, 300);
    throw new Error(`${context}: expected JSON but got ${contentType || "unknown"} ${snippet ? `(${snippet})` : ""}`);
  }
  return (await res.json()) as T;
}

async function generateHotmartToken(): Promise<HotmartToken> {
  const { clientId, clientSecret } = getEnv();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${HOTMART_BASE_URL}/security/oauth/token`, {
    method: "POST",
    headers: {
      ...HOTMART_DEFAULT_HEADERS,
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hotmart token request failed: ${res.status} ${text}`);
  }

  const data = await readJsonResponse<{
    access_token: string;
    token_type?: string;
    expires_in: number;
  }>(res, "Hotmart token response");

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

async function fetchSalesByStatus(accessToken: string, email: string, status: string): Promise<SaleItem[]> {
  const url = new URL(SALES_HISTORY_URL);
  url.searchParams.set("transaction_status", status);
  url.searchParams.set("buyer_email", email);

  const res = await fetch(url.toString(), {
    headers: {
      ...HOTMART_DEFAULT_HEADERS,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hotmart sales history failed: ${res.status} ${text} (url=${url.toString()})`);
  }

  const data = await readJsonResponse<{ items?: SaleItem[] }>(
    res,
    `Hotmart sales history response (url=${url.toString()})`
  );
  return data.items || [];
}

export async function checkEmailAuthorized(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email) {
    return { authorized: false, message: "Email é obrigatório" } as const;
  }

  const token = await getValidToken();

  const [completeSales, approvedSales] = await Promise.all([
    fetchSalesByStatus(token.access_token, email, "COMPLETE"),
    fetchSalesByStatus(token.access_token, email, "APPROVED")
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
