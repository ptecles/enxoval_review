# Setup de Auto-Login para os Outros Sites

Este documento explica como configurar o auto-login nos sites **tog** e **busca_produtos_kids** para que funcionem com o portal central.

## Como Funciona

1. Portal central autentica o usuário via Hotmart
2. Ao clicar em um site, redireciona com `?auth_email=usuario@email.com`
3. Site recebe o email, valida na Hotmart e cria sessão automaticamente

---

## Código para Adicionar nos Outros Sites

### 1. Criar componente de Auto-Login

Crie o arquivo `components/AutoLogin.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AutoLogin() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "done">("checking");

  useEffect(() => {
    const authEmail = searchParams.get("auth_email");
    
    if (!authEmail) {
      setStatus("done");
      return;
    }

    async function autoLogin() {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: authEmail })
        });

        const data = await res.json();

        if (data.success && data.authorized) {
          // Remove o parâmetro auth_email da URL
          const url = new URL(window.location.href);
          url.searchParams.delete("auth_email");
          router.replace(url.pathname + url.search);
        }
      } catch (err) {
        console.error("Auto-login failed:", err);
      } finally {
        setStatus("done");
      }
    }

    autoLogin();
  }, [searchParams, router]);

  if (status === "checking") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 mx-auto" />
          <p className="text-sm text-slate-600">Autenticando...</p>
        </div>
      </div>
    );
  }

  return null;
}
```

### 2. Adicionar no Layout

No arquivo `app/layout.tsx`, adicione o componente:

```typescript
import { Suspense } from "react";
import AutoLogin from "@/components/AutoLogin";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Suspense fallback={null}>
          <AutoLogin />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
```

### 3. Verificar API de Login

Certifique-se de que o arquivo `app/api/auth/login/route.ts` existe e é idêntico ao do projeto `carrinhos_review`.

---

## Testando

1. Acesse o portal central
2. Faça login com seu email
3. Clique em "Calculadora" ou "Busca de Produtos"
4. Você deve ser autenticado automaticamente

---

## Variáveis de Ambiente Necessárias

Todos os 3 sites precisam ter as mesmas variáveis no Netlify:

```
HOTMART_CLIENT_ID=seu_client_id
HOTMART_CLIENT_SECRET=seu_client_secret
HOTMART_BASE_URL=https://api-sec-vlc.hotmart.com
AUTH_SECRET=mesma_chave_em_todos_os_sites
```

⚠️ **IMPORTANTE**: O `AUTH_SECRET` deve ser o mesmo em todos os 3 sites para que os cookies sejam compatíveis.

---

## Configuração do Netlify

Para o portal central ter um novo domínio:

1. Acesse o dashboard do Netlify
2. Vá em **Site settings** → **Domain management**
3. Clique em **Add custom domain** ou **Change site name**
4. Escolha um nome como: `enxovalinteligente.netlify.app`

Depois, atualize as URLs no arquivo `components/PortalDashboard.tsx` se necessário.
