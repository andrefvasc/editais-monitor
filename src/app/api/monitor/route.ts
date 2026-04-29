import { NextResponse } from 'next/server';
import { appendEditalToSheet, getSubscribers } from '@/lib/googleSheets';
import { sendEditalAlert } from '@/lib/mailer';

// Palavras-chave exigidas pelo usuário
const KEYWORDS = ['inovação', 'inovacao', 'cultura', 'futuro do trabalho', 'consultoria', 'consultorias'];

// Função para checar se o texto contém alguma palavra-chave
function containsKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(kw => lowerText.includes(kw));
}

// Simulador de raspagem (Mock Scraper)
async function fetchMockEditais() {
  const rand = Math.floor(Math.random() * 1000);
  
  // Criamos uma lista mista de editais, alguns relevantes, outros não.
  const scrapedData = [
    {
      id: `CE-${rand}-A`,
      title: 'Edital de Construção Civil - Rodovia CE-040', // Não deve passar no filtro
      organization: 'SOP',
      publishDate: new Date().toISOString(),
      link: 'https://www.ce.gov.br/obras',
      status: 'Aberto',
      notified: false
    },
    {
      id: `CE-${rand}-B`,
      title: 'Seleção para Consultoria em Gestão Pública', // Passa (consultoria)
      organization: 'SEPLAG',
      publishDate: new Date().toISOString(),
      link: 'https://www.ce.gov.br/consultoria-seplag',
      status: 'Aberto',
      notified: false
    },
    {
      id: `CE-${rand}-C`,
      title: 'Fomento a Projetos de Cultura Popular', // Passa (cultura)
      organization: 'SECULT',
      publishDate: new Date().toISOString(),
      link: 'https://www.ce.gov.br/fomento-cultura',
      status: 'Aberto',
      notified: false
    }
  ];

  return scrapedData;
}

export async function GET(request: Request) {
  try {
    // 1. "Raspar" dados dos portais
    const allEditais = await fetchMockEditais();

    // 2. Filtrar pelos temas de interesse
    const relevantEditais = allEditais.filter(ed => 
      containsKeywords(ed.title) || containsKeywords(ed.organization)
    );

    if (relevantEditais.length === 0) {
      return NextResponse.json({ message: 'Nenhum edital relevante encontrado nesta execução.' });
    }

    const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'MOCK_SPREADSHEET';

    // 3. Obter a lista de e-mails inscritos
    const subscribers = await getSubscribers(SPREADSHEET_ID);

    // 4. Salvar na Planilha e Marcar como notificado
    for (const edital of relevantEditais) {
      // Neste mock, vamos considerar que se chegou aqui, vamos notificar.
      // Numa implementação real, checaríamos na planilha se o 'id' já existe antes de enviar.
      edital.notified = true;
      await appendEditalToSheet(SPREADSHEET_ID, edital);
    }

    // 5. Enviar Alertas por Email
    let emailLogs = [];
    if (subscribers.length > 0) {
      emailLogs = await sendEditalAlert(subscribers, relevantEditais) || [];
    }

    return NextResponse.json({ 
      message: 'Monitoramento executado com sucesso!',
      editaisEncontrados: relevantEditais.length,
      emailsEnviados: subscribers.length,
      emailLogs
    });

  } catch (error) {
    console.error('Erro no cron job:', error);
    return NextResponse.json({ error: 'Falha ao executar o monitoramento' }, { status: 500 });
  }
}

