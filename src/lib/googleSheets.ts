import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Esta função tenta inicializar a API do Google Sheets.
// Se o arquivo credentials.json não existir, ela retorna null para que a aplicação não quebre,
// permitindo rodar em modo "Mock" (Simulação).
export async function getAuthClient() {
  try {
    // Para a Vercel (Produção), vamos usar as variáveis de ambiente em vez do arquivo físico
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          // O Vercel às vezes escapa as quebras de linha nas variáveis de ambiente
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
      });
      const client = await auth.getClient();
      return google.sheets({ version: 'v4', auth: client as any });
    }

    // Para uso Local (quando existe o arquivo credentials.json)
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: SCOPES,
    });
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client as any });
  } catch (error) {
    console.warn('⚠️ Google Sheets Auth Error: credentials.json não encontrado ou inválido. Rodando em modo Mock.');
    return null;
  }
}

export async function appendEditalToSheet(spreadsheetId: string, edital: any) {
  const sheets = await getAuthClient();
  if (!sheets) {
    console.error('Google Sheets não configurado. Não foi possível salvar:', edital.id);
    return;
  }

  const values = [
    [
      edital.id,
      edital.title,
      edital.organization,
      edital.publishDate,
      edital.link,
      edital.status,
      edital.notified ? 'TRUE' : 'FALSE'
    ]
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Editais!A:G', // Assume que existe uma aba "Editais"
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (error) {
    console.error('Erro ao adicionar na planilha:', error);
  }
}

export async function getSubscribers(spreadsheetId: string) {
  const sheets = await getAuthClient();
  if (!sheets) {
    console.error('Google Sheets não configurado. Impossível buscar inscritos.');
    return [];
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscribers!A:B', // Assume Nome, Email
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    // Ignora o cabeçalho (linha 0)
    return rows.slice(1).map(row => ({
      name: row[0] || 'Desconhecido',
      email: row[1],
    })).filter(sub => sub.email); // Remove linhas sem email
  } catch (error) {
    console.error('Erro ao buscar inscritos:', error);
    return [];
  }
}

export async function getEditais(spreadsheetId: string) {
  const sheets = await getAuthClient();
  if (!sheets) {
    console.error('Google Sheets não configurado. Retornando lista vazia de editais.');
    return [];
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Editais!A:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.slice(1).map(row => ({
      id: row[0],
      title: row[1],
      organization: row[2],
      publishDate: row[3],
      link: row[4],
      status: row[5],
      notified: row[6] === 'TRUE'
    }));
  } catch (error) {
    console.error('Erro ao buscar editais:', error);
    return [];
  }
}

export async function getEditalById(spreadsheetId: string, id: string) {
  // First get all editais
  const editais = await getEditais(spreadsheetId);
  const edital = editais.find((e: any) => e.id === id);
  
  if (!edital) return null;

  // Mock a summary since we don't have a real DB with full details yet
  return {
    ...edital,
    summary: `Este edital (${edital.title}) foca em promover iniciativas inovadoras e de alto impacto no Ceará. Podem participar pessoas físicas e jurídicas que se enquadrem nas categorias estipuladas no anexo I.`,
    budget: edital.organization === 'SECITECE' ? 'R$ 5.000.000,00' : 'A definir',
    deadline: new Date(new Date(edital.publishDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // + 30 days
    theme: 'Diversos',
    requirements: [
      'Ter sede no Ceará',
      'Comprovar experiência técnica na área',
      'Regularidade fiscal'
    ]
  };
}
