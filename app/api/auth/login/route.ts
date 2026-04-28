import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAuthCookieValue, getAuthCookieName } from "@/lib/auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().min(1)
});

// Variável para armazenar o token atual
let currentToken: {
  access_token: string | null;
  expires_at: number | null;
} = {
  access_token: null,
  expires_at: null
};

// Função para gerar novo access token da Hotmart
async function generateHotmartToken() {
  const HOTMART_CLIENT_ID = process.env.HOTMART_CLIENT_ID;
  const HOTMART_CLIENT_SECRET = process.env.HOTMART_CLIENT_SECRET;
  const HOTMART_BASE_URL = process.env.HOTMART_BASE_URL || "https://api-sec-vlc.hotmart.com";

  if (!HOTMART_CLIENT_ID || !HOTMART_CLIENT_SECRET) {
    throw new Error("HOTMART_CLIENT_ID ou HOTMART_CLIENT_SECRET não configurados no Netlify");
  }

  const credentials = Buffer.from(`${HOTMART_CLIENT_ID}:${HOTMART_CLIENT_SECRET}`).toString("base64");
  const tokenUrl = `${HOTMART_BASE_URL}/security/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hotmart token failed: ${response.status} ${text.slice(0, 200)}`);
  }

  const tokenData = await response.json();
  const expiresAt = Date.now() + tokenData.expires_in * 1000;

  currentToken = {
    access_token: tokenData.access_token,
    expires_at: expiresAt
  };

  return currentToken;
}

// Função para verificar se o token ainda é válido
function isTokenValid() {
  if (!currentToken.access_token || !currentToken.expires_at) {
    return false;
  }

  const marginMs = 5 * 60 * 1000;
  return Date.now() < currentToken.expires_at - marginMs;
}

// Função para obter token válido
async function getValidToken() {
  if (!isTokenValid()) {
    await generateHotmartToken();
  }

  return currentToken;
}

async function checkEmailAuthorized(email: string) {
  const trimmedEmail = email.toLowerCase().trim();

  if (!trimmedEmail) {
    return { authorized: false, message: "Email é obrigatório" } as const;
  }

  const token = await getValidToken();

  if (!token.access_token) {
    throw new Error("Token inválido após getValidToken");
  }

  const completeUrl = new URL("https://developers.hotmart.com/payments/api/v1/sales/history");
  completeUrl.searchParams.set("transaction_status", "COMPLETE");
  completeUrl.searchParams.set("buyer_email", trimmedEmail);

  const approvedUrl = new URL("https://developers.hotmart.com/payments/api/v1/sales/history");
  approvedUrl.searchParams.set("transaction_status", "APPROVED");
  approvedUrl.searchParams.set("buyer_email", trimmedEmail);

  const [completeResponse, approvedResponse] = await Promise.all([
    fetch(completeUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json"
      }
    }),
    fetch(approvedUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json"
      }
    })
  ]);

  if (!completeResponse.ok || !approvedResponse.ok) {
    throw new Error(
      `Sales history failed: complete=${completeResponse.status}, approved=${approvedResponse.status}`
    );
  }

  const completeData = await completeResponse.json();
  const approvedData = await approvedResponse.json();

  const completeSales = completeData?.items || [];
  const approvedSales = approvedData?.items || [];
  const sales = [...completeSales, ...approvedSales];

  if (sales.length === 0) {
    return { authorized: false, message: "Email não encontrado na base de clientes" } as const;
  }

  // Filtrar vendas dos últimos 12 meses
  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  console.log(`[AUTH DEBUG] Email: ${trimmedEmail}`);
  console.log(`[AUTH DEBUG] Data atual: ${now.toISOString()}`);
  console.log(`[AUTH DEBUG] 12 meses atrás: ${twelveMonthsAgo.toISOString()}`);
  console.log(`[AUTH DEBUG] Total de vendas encontradas: ${sales.length}`);

  const activeSales = sales.filter(sale => {
    const orderDate = sale.purchase?.order_date;
    if (!orderDate) {
      console.log(`[AUTH DEBUG] Venda sem order_date:`, sale);
      return false;
    }
    const purchaseDate = new Date(orderDate);
    const isActive = purchaseDate > twelveMonthsAgo;
    console.log(`[AUTH DEBUG] Venda: ${purchaseDate.toISOString()} | Status: ${sale.purchase?.status} | Ativa: ${isActive}`);
    return isActive;
  });

  console.log(`[AUTH DEBUG] Vendas ativas (últimos 12 meses): ${activeSales.length}`);

  if (activeSales.length === 0) {
    return { authorized: false, message: "Seu acesso expirou. A última compra foi há mais de 12 meses." } as const;
  }

  // Pegar a compra mais recente
  const mostRecentSale = activeSales.reduce((latest, current) => {
    const latestDate = new Date(latest.purchase?.order_date || 0);
    const currentDate = new Date(current.purchase?.order_date || 0);
    return currentDate > latestDate ? current : latest;
  }, activeSales[0]);

  const user = {
    email: trimmedEmail,
    name: mostRecentSale?.buyer?.name || "Usuário",
    totalPurchases: activeSales.length,
    lastPurchase: mostRecentSale?.purchase?.order_date ? new Date(mostRecentSale.purchase.order_date).toISOString() : null
  };

  return { authorized: true, user } as const;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const result = await checkEmailAuthorized(body.email);

    if (!result.authorized) {
      return NextResponse.json(
        { success: false, authorized: false, message: result.message || "Email não autorizado" },
        { status: 200 }
      );
    }

    const cookieValue = createAuthCookieValue({ email: result.user.email, name: result.user.name }, 60 * 60 * 24 * 30);
    const cookieName = getAuthCookieName();

    cookies().set(cookieName, cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return NextResponse.json({ success: true, authorized: true, user: result.user }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    
    let userMessage = message;
    if (message.includes("HOTMART_CLIENT_ID") || message.includes("HOTMART_CLIENT_SECRET")) {
      userMessage = "Erro de configuração: variáveis de ambiente não configuradas no Netlify";
    } else if (message.includes("token failed")) {
      userMessage = "Erro ao obter token da Hotmart. Verifique as credenciais.";
    } else if (message.includes("Sales history failed")) {
      userMessage = "Erro ao buscar histórico de vendas na Hotmart";
    }
    
    return NextResponse.json({ success: false, authorized: false, message: userMessage }, { status: 200 });
  }
}
