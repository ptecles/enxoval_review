# Configuração do Instagram Secreto - Google Sheets

## 📋 Passo 1: Configurar Google Apps Script

1. Abra sua planilha: https://docs.google.com/spreadsheets/d/1FS20ceyEWSA30jBm3zOuOPOXLZksFnq2B9hMINl1JJo/edit

2. Clique em **Extensões** → **Apps Script**

3. Apague todo o código existente e cole este código:

```javascript
function doPost(e) {
  try {
    // Parse os dados recebidos
    const data = JSON.parse(e.postData.contents);
    
    // Abra a planilha (use o ID da sua planilha)
    const sheet = SpreadsheetApp.openById('1FS20ceyEWSA30jBm3zOuOPOXLZksFnq2B9hMINl1JJo').getActiveSheet();
    
    // Adicione uma nova linha com os dados
    sheet.appendRow([
      data.timestamp,
      data.nome,
      data.email,
      data.instagram
    ]);
    
    // Retorne sucesso
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Retorne erro
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Clique em **Salvar** (ícone de disquete)

5. Clique em **Implantar** → **Nova implantação**

6. Clique no ícone de engrenagem ⚙️ ao lado de "Selecione o tipo"

7. Escolha **Aplicativo da Web**

8. Configure:
   - **Descrição**: Instagram Secreto Form
   - **Executar como**: Eu (seu email)
   - **Quem tem acesso**: Qualquer pessoa

9. Clique em **Implantar**

10. **COPIE A URL** que aparece (algo como: https://script.google.com/macros/s/ABC123.../exec)

## 📋 Passo 2: Configurar Variável de Ambiente no Netlify

1. Acesse: https://app.netlify.com/sites/enxovalreview/settings/deploys#environment

2. Clique em **Add a variable**

3. Configure:
   - **Key**: `INSTAGRAM_SECRETO_SCRIPT_URL`
   - **Value**: Cole a URL que você copiou no passo 1.10

4. Clique em **Save**

5. Vá em **Deploys** e clique em **Trigger deploy** → **Clear cache and deploy site**

## 📋 Passo 3: Preparar a Planilha

1. Na primeira linha da planilha, adicione os cabeçalhos:
   - Coluna A: **Data/Hora**
   - Coluna B: **Nome**
   - Coluna C: **Email**
   - Coluna D: **Instagram**

2. Pronto! Os dados começarão a aparecer automaticamente quando alguém preencher o formulário.

## ✅ Testar

Após configurar tudo:
1. Acesse o site
2. Clique em "Instagram secreto"
3. Preencha o formulário
4. Verifique se os dados aparecem na planilha

## 🔒 Segurança

- O Google Apps Script só aceita requisições POST
- A URL do script é privada (não compartilhe publicamente)
- Os dados são salvos diretamente na sua planilha Google
