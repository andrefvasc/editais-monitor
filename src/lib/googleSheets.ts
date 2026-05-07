import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export async function getAuthClient() {
  try {
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
      });
      const client = await auth.getClient();
      return google.sheets({ version: 'v4', auth: client as any });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: SCOPES,
    });
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client as any });
  } catch (error: any) {
    console.warn('⚠️ Google Sheets Auth Error:', error.message || error);
    return null;
  }
}

export async function appendEditalToSheet(spreadsheetId: string, edital: any) {
  const sheets = await getAuthClient();
  if (!sheets) return;

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
      range: 'Editais!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (error) {
    console.error('Erro ao adicionar na planilha:', error);
  }
}

export async function getSubscribers(spreadsheetId: string) {
  const sheets = await getAuthClient();
  if (!sheets) return [];

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Subscribers!A:B',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.slice(1).map(row => ({
      name: row[0] || 'Desconhecido',
      email: row[1],
    })).filter(sub => sub.email);
  } catch (error) {
    console.error('Erro ao buscar inscritos:', error);
    return [];
  }
}

export async function getEditais(spreadsheetId: string) {
  const sheets = await getAuthClient();
  if (!sheets) return [];

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Editais!A:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.slice(1).map(row => {
      let link = row[4] || '';
      
      // Detecção de links completamente inválidos (mocks antigos)
      const isInvalid = link === '#' || !link.startsWith('http');

      if (isInvalid) {
        // Apenas para links # geramos a busca no Google com termos de PDF
        const query = encodeURIComponent(`${(row[1] || 'Edital')} ${(row[2] || '')} arquivo edital pdf download`);
        link = `https://www.google.com/search?q=${query}`;
      }

      // IMPORTANTE: Para links da FUNCAP e SECULT que apontam para a home/lista (dados legados),
      // nós mantemos o link mas o robô novo já está configurado para capturar PDFs.
      // Instruímos o usuário a limpar a planilha para atualizar esses links.

      return {
        id: row[0],
        title: row[1],
        organization: row[2],
        publishDate: row[3],
        link,
        status: row[5],
        notified: row[6] === 'TRUE'
      };
    });
  } catch (error) {
    console.error('Erro ao buscar editais:', error);
    return [];
  }
}

export async function getEditalById(spreadsheetId: string, id: string) {
  const editais = await getEditais(spreadsheetId);
  const edital = editais.find((e: any) => e.id === id);
  
  if (!edital) return null;

  return {
    ...edital,
    summary: `Este edital (${edital.title}) foca em promover iniciativas inovadoras e de alto impacto no Ceará.`,
    budget: 'A definir',
    deadline: new Date(new Date(edital.publishDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    theme: 'Diversos',
    requirements: [
      'Ter sede no Ceará',
      'Regularidade fiscal'
    ]
  };
}
