import { NextResponse } from 'next/server';
import { appendEditalToSheet, getSubscribers, getEditais } from '@/lib/googleSheets';
import { sendEditalAlert } from '@/lib/mailer';
import { scrapeFuncap, scrapeCearaGov, scrapeFinep, scrapeProsas, scrapeSeplag, scrapeSecult } from '@/lib/scrapers';

const KEYWORDS = ['inovação', 'inovacao', 'cultura', 'futuro do trabalho', 'consultoria', 'consultorias', 'impacto social', 'terceiro setor', 'empreendedorismo', 'chamada pública', 'credenciamento', 'mecenas'];

function containsKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(kw => lowerText.includes(kw));
}

export async function GET(request: Request) {
  try {
    // 1. "Raspar" dados dos portais reais
    const [funcapEditais, cearaGovEditais, finepEditais, prosasEditais, seplagEditais, secultEditais] = await Promise.all([
      scrapeFuncap(),
      scrapeCearaGov(),
      scrapeFinep(),
      scrapeProsas(),
      scrapeSeplag(),
      scrapeSecult()
    ]);

    const allEditais = [...funcapEditais, ...cearaGovEditais, ...finepEditais, ...prosasEditais, ...seplagEditais, ...secultEditais];

    // 2. Filtrar pelos temas de interesse
    const relevantEditais = allEditais.filter(ed => 
      containsKeywords(ed.title) || containsKeywords(ed.organization)
    );

    const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'MOCK_SPREADSHEET';
    const existingEditais = await getEditais(SPREADSHEET_ID);
    const existingIds = new Set(existingEditais.map((e: any) => e.id));

    // 3. Filtrar apenas os novos editais (que não estão na planilha)
    const newEditais = relevantEditais.filter(ed => !existingIds.has(ed.id));

    // 4. Salvar os NOVOS na Planilha
    for (const edital of newEditais) {
      edital.notified = true;
      await appendEditalToSheet(SPREADSHEET_ID, edital);
    }

    // 5. Enviar Alertas por Email
    const subscribers = await getSubscribers(SPREADSHEET_ID);
    let emailLogs: {email: string, status: string, url?: string, error?: string}[] = [];
    if (newEditais.length > 0 && subscribers.length > 0) {
      emailLogs = await sendEditalAlert(subscribers, newEditais) || [];
    }

    return NextResponse.json({ 
      message: newEditais.length > 0 ? 'Monitoramento executado com sucesso!' : 'Nenhum edital inédito encontrado.',
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
