import { NextResponse } from 'next/server';
import { appendEditalToSheet, getSubscribers } from '@/lib/googleSheets';
import { sendEditalAlert } from '@/lib/mailer';
import { scrapeFuncap, scrapeCearaGov, scrapeFinep, scrapeProsas } from '@/lib/scrapers';

// Palavras-chave exigidas pelo usuário
const KEYWORDS = ['inovação', 'inovacao', 'cultura', 'futuro do trabalho', 'consultoria', 'consultorias', 'impacto social', 'terceiro setor', 'empreendedorismo', 'chamada pública'];

// Função para checar se o texto contém alguma palavra-chave
function containsKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(kw => lowerText.includes(kw));
}

export async function GET(request: Request) {
  try {
    // 1. "Raspar" dados dos portais reais (assíncrono e em paralelo para ser mais rápido)
    const [funcapEditais, cearaGovEditais, finepEditais, prosasEditais] = await Promise.all([
      scrapeFuncap(),
      scrapeCearaGov(),
      scrapeFinep(),
      scrapeProsas()
    ]);

    // Unir os resultados
    const allEditais = [...funcapEditais, ...cearaGovEditais, ...finepEditais, ...prosasEditais];

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

    // 3. Buscar editais já existentes para evitar duplicidade
    const { getEditais } = await import('@/lib/googleSheets');
    const existingEditais = await getEditais(SPREADSHEET_ID);
    const existingIds = new Set(existingEditais.map((e: any) => e.id));

    // Filtrar apenas os novos editais (que não estão na planilha)
    const newEditais = relevantEditais.filter(ed => !existingIds.has(ed.id));

    if (newEditais.length === 0) {
      return NextResponse.json({ 
        message: 'Monitoramento executado. Nenhum edital novo (inédito) encontrado.',
        totalRaspados: allEditais.length,
        totalRelevantes: relevantEditais.length,
        novos: 0
      });
    }

    // 4. Obter a lista de e-mails inscritos
    const subscribers = await getSubscribers(SPREADSHEET_ID);

    // 5. Salvar na Planilha e Marcar como notificado
    for (const edital of newEditais) {
      edital.notified = true;
      await appendEditalToSheet(SPREADSHEET_ID, edital);
    }

    // 6. Enviar Alertas por Email (Apenas para os NOVOS)
    let emailLogs: {email: string, status: string, url?: string, error?: string}[] = [];
    if (subscribers.length > 0) {
      emailLogs = await sendEditalAlert(subscribers, newEditais) || [];
    }

    return NextResponse.json({ 
      message: 'Monitoramento executado com sucesso!',
      totalRaspados: allEditais.length,
      editaisRelevantes: relevantEditais.length,
      editaisNovosAdicionados: newEditais.length,
      emailsEnviados: subscribers.length,
      emailLogs
    });

  } catch (error) {
    console.error('Erro no cron job:', error);
    return NextResponse.json({ error: 'Falha ao executar o monitoramento' }, { status: 500 });
  }
}

