import { NextResponse } from 'next/server';
import { appendEditalToSheet, getSubscribers } from '@/lib/googleSheets';
import { sendEditalAlert } from '@/lib/mailer';
import { scrapeFuncap, scrapeCearaGov } from '@/lib/scrapers';

// Palavras-chave exigidas pelo usuário
const KEYWORDS = ['inovação', 'inovacao', 'cultura', 'futuro do trabalho', 'consultoria', 'consultorias'];

// Função para checar se o texto contém alguma palavra-chave
function containsKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(kw => lowerText.includes(kw));
}

export async function GET(request: Request) {
  try {
    // 1. "Raspar" dados dos portais reais (assíncrono e em paralelo para ser mais rápido)
    const [funcapEditais, cearaGovEditais] = await Promise.all([
      scrapeFuncap(),
      scrapeCearaGov()
    ]);

    // Unir os resultados
    const allEditais = [...funcapEditais, ...cearaGovEditais];

    // 2. Filtrar pelos temas de interesse
    const relevantEditais = allEditais.filter(ed => 
      containsKeywords(ed.title) || containsKeywords(ed.organization)
    );

    if (relevantEditais.length === 0) {
      return NextResponse.json({ 
        message: 'Nenhum edital relevante encontrado nesta execução.',
        totalRaspados: allEditais.length
      });
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
    let emailLogs: {email: string, status: string, url?: string, error?: string}[] = [];
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

