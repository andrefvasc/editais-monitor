import { NextResponse } from 'next/server';
import { getEditais } from '@/lib/googleSheets';

export async function GET() {
  try {
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
    if (!SPREADSHEET_ID) {
      return NextResponse.json({ error: 'SPREADSHEET_ID não configurado' }, { status: 500 });
    }

    const editais = await getEditais(SPREADSHEET_ID);
    return NextResponse.json({ editais });
  } catch (error) {
    console.error('Erro ao buscar editais:', error);
    return NextResponse.json({ error: 'Falha ao buscar editais' }, { status: 500 });
  }
}
