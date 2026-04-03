import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
  const HOTMART_BASE_URL = process.env.HOTMART_BASE_URL;

  if (!HOTMART_CLIENT_ID || !HOTMART_CLIENT_SECRET) {
    throw new Error("Client ID e Client Secret são obrigatórios");
  }

  const credentials = Buffer.from(`${HOTMART_CLIENT_ID}:${HOTMART_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(`${HOTMART_BASE_URL}/security/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hotmart token failed: ${response.status} ${text}`);
  }

  const tokenData = await response.json();
  const expiresAt = Date.now() + tokenData.expires_in * 1000;

  currentToken = {
    access_token: tokenData.access_token,
    expires_at: expiresAt
  };

  console.log("Novo token gerado com sucesso:", {
    expires_at: new Date(expiresAt).toISOString(),
    expires_in: tokenData.expires_in
  });

  return currentToken;
}

// Função para verificar se o token ainda é válido
function isTokenValid() {
  if (!currentToken.access_token || !currentToken.expires_at) {
    return false;
  }

  const marginMs = 5 * 60 * 1000; // 5 minutos
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email é obrigatório"
        },
        { status: 400 }
      );
    }

    console.log(`Verificando email na base da Hotmart: ${email}`);

    const token = await getValidToken();

    // Buscar histórico de vendas para status COMPLETE e APPROVED
    const trimmedEmail = email.toLowerCase().trim();

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

    // Combinar resultados de ambas as consultas
    const completeSales = completeData?.items || [];
    const approvedSales = approvedData?.items || [];
    const sales = [...completeSales, ...approvedSales];
    console.log(`Encontradas ${sales.length} vendas para o email: ${email}`);

    // Se encontrou vendas, o email existe
    const emailExists = sales.length > 0;

    if (emailExists) {
      const userData = {
        email: email,
        name: sales[0]?.buyer?.name || "Usuário",
        totalPurchases: sales.length,
        lastPurchase: sales[0]?.purchase_date
      };

      console.log(`Email encontrado: ${email}`);

      return NextResponse.json({
        success: true,
        message: "Email encontrado na base da Hotmart",
        user: userData,
        authorized: true
      });
    } else {
      console.log(`Email não encontrado: ${email}`);

      return NextResponse.json({
        success: false,
        message: "Email não encontrado na base de clientes",
        authorized: false
      });
    }
  } catch (error) {
    console.error("Erro ao verificar email:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
        authorized: false
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
