import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthCookieName, verifyAuthCookieValue } from "@/lib/auth";

const GOOGLE_SCRIPT_URL = process.env.INSTAGRAM_SECRETO_SCRIPT_URL || "";

export async function POST(request: NextRequest) {
  try {
    const cookieName = getAuthCookieName();
    const raw = cookies().get(cookieName)?.value;
    const session = verifyAuthCookieValue(raw);
    
    if (!session) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { instagram } = body;

    if (!instagram) {
      return NextResponse.json(
        { error: "@ do Instagram é obrigatório" },
        { status: 400 }
      );
    }

    const nome = session.name;
    const email = session.email;

    if (!GOOGLE_SCRIPT_URL) {
      console.error("INSTAGRAM_SECRETO_SCRIPT_URL não configurada");
      return NextResponse.json(
        { error: "Configuração do servidor incompleta" },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString();
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome,
        email,
        instagram,
        timestamp
      })
    });

    if (!response.ok) {
      throw new Error(`Google Script error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);
    return NextResponse.json(
      { error: "Erro ao salvar dados. Tente novamente." },
      { status: 500 }
    );
  }
}
