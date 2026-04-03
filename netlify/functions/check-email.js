let currentToken = {
  access_token: null,
  expires_at: null
};

function getEnv() {
  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;
  const securityBaseUrl = process.env.HOTMART_BASE_URL || "https://api-sec-vlc.hotmart.com";

  if (!clientId || !clientSecret) {
    throw new Error("Missing HOTMART_CLIENT_ID / HOTMART_CLIENT_SECRET");
  }

  return { clientId, clientSecret, securityBaseUrl };
}

function isTokenValid() {
  if (!currentToken.access_token || !currentToken.expires_at) return false;

  const marginMs = 5 * 60 * 1000;
  return Date.now() < currentToken.expires_at - marginMs;
}

async function readJson(res, context) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    const snippet = text.slice(0, 300);
    throw new Error(`${context}: expected JSON but got ${contentType || "unknown"} ${snippet ? `(${snippet})` : ""}`);
  }
  return res.json();
}

async function generateHotmartToken() {
  const { clientId, clientSecret, securityBaseUrl } = getEnv();

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${securityBaseUrl}/security/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0",
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hotmart token request failed: ${res.status} ${text}`);
  }

  const data = await readJson(res, "Hotmart token response");

  currentToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000
  };

  return currentToken;
}

async function getValidToken() {
  if (!isTokenValid()) {
    return generateHotmartToken();
  }
  return currentToken;
}

async function fetchSalesByStatus(accessToken, email, status) {
  const url = new URL(`https://developers.hotmart.com/payments/api/v1/sales/history`);
  url.searchParams.set("transaction_status", status);
  url.searchParams.set("buyer_email", email);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hotmart sales history failed: ${res.status} ${text} (url=${url.toString()})`);
  }

  const data = await readJson(res, `Hotmart sales history response (url=${url.toString()})`);
  return data.items || [];
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, authorized: false, message: "Método não permitido" })
    };
  }

  try {
    const parsed = event.body ? JSON.parse(event.body) : {};
    const emailRaw = typeof parsed.email === "string" ? parsed.email : "";
    const email = emailRaw.trim().toLowerCase();

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, authorized: false, message: "Email é obrigatório" })
      };
    }

    const token = await getValidToken();

    const [completeSales, approvedSales] = await Promise.all([
      fetchSalesByStatus(token.access_token, email, "COMPLETE"),
      fetchSalesByStatus(token.access_token, email, "APPROVED")
    ]);

    const sales = [...completeSales, ...approvedSales];
    if (sales.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, authorized: false, message: "Email não encontrado na base de clientes" })
      };
    }

    const user = {
      email,
      name: sales[0]?.buyer?.name || "Usuário",
      totalPurchases: sales.length,
      lastPurchase: sales[0]?.purchase_date || null
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, authorized: true, user })
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, authorized: false, message })
    };
  }
};
