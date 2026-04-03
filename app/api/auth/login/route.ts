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

  console.log("[TOKEN] Env vars:", {
    hasClientId: !!HOTMART_CLIENT_ID,
    hasClientSecret: !!HOTMART_CLIENT_SECRET,
    baseUrl: HOTMART_BASE_URL
  });

  if (!HOTMART_CLIENT_ID || !HOTMART_CLIENT_SECRET) {
    throw new Error("HOTMART_CLIENT_ID ou HOTMART_CLIENT_SECRET não configurados no Netlify");
  }

  const credentials = Buffer.from(`${HOTMART_CLIENT_ID}:${HOTMART_CLIENT_SECRET}`).toString("base64");
  const tokenUrl = `${HOTMART_BASE_URL}/security/oauth/token`;

  console.log("[TOKEN] Requesting token from:", tokenUrl);

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    console.log("[TOKEN] Response status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error("[TOKEN] Error response:", text.slice(0, 500));
      throw new Error(`Hotmart token failed: ${response.status} ${text.slice(0, 200)}`);
    }

    const tokenData = await response.json();
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    currentToken = {
      access_token: tokenData.access_token,
      expires_at: expiresAt
    };

    console.log("[TOKEN] Token gerado com sucesso, expira em:", new Date(expiresAt).toISOString());

    return currentToken;
  } catch (error) {
    console.error("[TOKEN] Fetch error:", error);
    throw error;
  }
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
    console.log("Token expirado ou inválido, gerando novo token...");
    await generateHotmartToken();
  } else {
    console.log("Token atual ainda é válido");
  }

  return currentToken;
}

async function checkEmailAuthorized(email: string) {
  const trimmedEmail = email.toLowerCase().trim();

  if (!trimmedEmail) {
    return { authorized: false, message: "Email é obrigatório" } as const;
  }

  console.log(`[CHECK] Verificando email: ${trimmedEmail}`);

  try {
    const token = await getValidToken();

    if (!token.access_token) {
      throw new Error("Token inválido após getValidToken");
    }

    console.log("[CHECK] Token obtido, buscando sales history...");

    const completeUrl = new URL("https://developers.hotmart.com/payments/api/v1/sales/history");
    completeUrl.searchParams.set("transaction_status", "COMPLETE");
    completeUrl.searchParams.set("buyer_email", trimmedEmail);

    const approvedUrl = new URL("https://developers.hotmart.com/payments/api/v1/sales/history");
    approvedUrl.searchParams.set("transaction_status", "APPROVED");
    approvedUrl.searchParams.set("buyer_email", trimmedEmail);

    console.log("[CHECK] Fetching COMPLETE from:", completeUrl.toString());
    console.log("[CHECK] Fetching APPROVED from:", approvedUrl.toString());

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

    console.log("[CHECK] Sales responses:", {
      complete: completeResponse.status,
      approved: approvedResponse.status
    });

    if (!completeResponse.ok || !approvedResponse.ok) {
      const completeText = !completeResponse.ok ? await completeResponse.text() : "";
      const approvedText = !approvedResponse.ok ? await approvedResponse.text() : "";
      console.error("[CHECK] Sales error:", { completeText: completeText.slice(0, 200), approvedText: approvedText.slice(0, 200) });
      throw new Error(
        `Sales history failed: complete=${completeResponse.status}, approved=${approvedResponse.status}`
      );
    }

    const completeData = await completeResponse.json();
    const approvedData = await approvedResponse.json();

    const completeSales = completeData?.items || [];
    const approvedSales = approvedData?.items || [];
    const sales = [...completeSales, ...approvedSales];

    console.log(`[CHECK] Encontradas ${sales.length} vendas para o email: ${trimmedEmail}`);

    if (sales.length === 0) {
      return { authorized: false, message: "Email não encontrado na base de clientes" } as const;
    }

    const user = {
      email: trimmedEmail,
      name: sales[0]?.buyer?.name || "Usuário",
      totalPurchases: sales.length,
      lastPurchase: sales[0]?.purchase_date || null
    };

    return { authorized: true, user } as const;
  } catch (error) {
    console.error("[CHECK] Error in checkEmailAuthorized:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    console.log("[LOGIN] Iniciando verificação para:", body.email);

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

    console.log("[LOGIN] Login bem-sucedido para:", result.user.email);

    return NextResponse.json({ success: true, authorized: true, user: result.user }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[LOGIN] Erro no login:", message, err);
    
    // Retornar mensagem mais específica
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
