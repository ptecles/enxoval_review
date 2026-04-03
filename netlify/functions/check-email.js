const axios = require('axios');

// Variável para armazenar o token atual
let currentToken = {
  access_token: null,
  expires_at: null
};

// Função para gerar novo access token da Hotmart - IGUAL AO EXPRESS
async function generateHotmartToken() {
  try {
    const { HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET, HOTMART_BASE_URL } = process.env;
    
    if (!HOTMART_CLIENT_ID || !HOTMART_CLIENT_SECRET) {
      throw new Error('Client ID e Client Secret são obrigatórios');
    }

    const credentials = Buffer.from(`${HOTMART_CLIENT_ID}:${HOTMART_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(
      `${HOTMART_BASE_URL}/security/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const tokenData = response.data;
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    currentToken = {
      access_token: tokenData.access_token,
      expires_at: expiresAt,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in
    };

    console.log('Novo token gerado com sucesso:', { 
      expires_at: currentToken.expires_at, 
      expires_in: tokenData.expires_in 
    });
    
    return currentToken;
  } catch (error) {
    console.error('Erro ao gerar token:', error.response?.data || error.message);
    throw error;
  }
}

// Função para verificar se o token ainda é válido - IGUAL AO EXPRESS
function isTokenValid() {
  if (!currentToken.access_token || !currentToken.expires_at) {
    return false;
  }
  
  const now = new Date();
  const expiresAt = new Date(currentToken.expires_at);
  const marginMinutes = 5; // Margem de 5 minutos
  const expiresWithMargin = new Date(expiresAt.getTime() - (marginMinutes * 60 * 1000));
  
  return now < expiresWithMargin;
}

// Função para obter token válido - IGUAL AO EXPRESS
async function getValidToken() {
  if (!isTokenValid()) {
    console.log('Token expirado ou inválido, gerando novo token...');
    await generateHotmartToken();
  } else {
    console.log('Token atual ainda é válido');
  }
  
  return currentToken;
}

// Handler da Netlify Function
exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Lidar com preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Apenas aceitar POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Método não permitido'
      })
    };
  }

  try {
    const { email } = JSON.parse(event.body);
    
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Email é obrigatório'
        })
      };
    }

    console.log(`Verificando email na base da Hotmart: ${email}`);
    
    const token = await getValidToken();
    
    // Buscar histórico de vendas para status COMPLETE e APPROVED
    const trimmedEmail = email.toLowerCase().trim();
    
    const [completeResponse, approvedResponse] = await Promise.all([
      axios.get('https://developers.hotmart.com/payments/api/v1/sales/history', {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json'
        },
        params: {
          transaction_status: 'COMPLETE',
          buyer_email: trimmedEmail
        }
      }),
      axios.get('https://developers.hotmart.com/payments/api/v1/sales/history', {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json'
        },
        params: {
          transaction_status: 'APPROVED',
          buyer_email: trimmedEmail
        }
      })
    ]);

    // Combinar resultados de ambas as consultas
    const completeSales = completeResponse.data?.items || [];
    const approvedSales = approvedResponse.data?.items || [];
    const sales = [...completeSales, ...approvedSales];
    console.log(`Encontradas ${sales.length} vendas para o email: ${email}`);
    
    // Se encontrou vendas, o email existe
    const emailExists = sales.length > 0;

    if (emailExists) {
      // Já temos as vendas filtradas do usuário
      const userSales = sales;
      
      const userData = {
        email: email,
        name: userSales[0]?.buyer?.name || 'Usuário',
        totalPurchases: userSales.length,
        lastPurchase: userSales[0]?.purchase_date
      };

      console.log(`Email encontrado: ${email}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Email encontrado na base da Hotmart',
          user: userData,
          authorized: true
        })
      };
    } else {
      console.log(`Email não encontrado: ${email}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Email não encontrado na base de clientes',
          authorized: false
        })
      };
    }
    
  } catch (error) {
    console.error('Erro ao verificar email:', error.response?.data || error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.response?.data || error.message,
        authorized: false
      })
    };
  }
};
