import { getEditalById } from '@/lib/googleSheets';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ExternalLink, Calendar, Building, Info, FileText, CheckCircle2, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function EditalSummary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // No mundo real, passaríamos o SPREADSHEET_ID que está no .env
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'MOCK';
  const edital = await getEditalById(SPREADSHEET_ID, id);

  if (!edital) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Edital não encontrado</h1>
        <p className="text-neutral-400 mb-6">Não conseguimos localizar as informações para este ID.</p>
        <Link href="/" className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">
          Voltar para o Início
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-emerald-500/30 pb-20">
      {/* Navbar Minimal */}
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-emerald-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar para o Dashboard</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Cabeçalho do Edital */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {edital.status}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {edital.theme}
            </span>
            <span className="text-sm text-neutral-500 font-mono ml-auto">ID: {edital.id}</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
            {edital.title}
          </h1>

          <div className="flex flex-wrap gap-6 text-sm text-neutral-400">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-500" />
              <span>Órgão: <strong className="text-neutral-200">{edital.organization}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Publicado em: <strong className="text-neutral-200">{format(new Date(edital.publishDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}</strong></span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Conteúdo Principal (Esquerda) */}
          <div className="md:col-span-2 space-y-8">
            
            <section className="bg-neutral-900 rounded-2xl p-6 md:p-8 border border-neutral-800">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-neutral-400" />
                Resumo do Objeto
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                {edital.summary}
              </p>
            </section>

            <section className="bg-neutral-900 rounded-2xl p-6 md:p-8 border border-neutral-800">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-neutral-400" />
                Requisitos Principais
              </h2>
              <ul className="space-y-4">
                {edital.requirements?.map((req: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-neutral-300">{req}</span>
                  </li>
                ))}
              </ul>
            </section>

          </div>

          {/* Sidebar (Direita) */}
          <aside className="space-y-6">
            
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
              <h3 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-4">Informações Chave</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Orçamento Estimado
                  </p>
                  <p className="font-medium text-neutral-200">{edital.budget}</p>
                </div>
                
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Prazo Final Estimado
                  </p>
                  <p className="font-medium text-amber-400">
                    {format(new Date(edital.deadline), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <a 
                  href={edital.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className={`w-full flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-xl transition-all ${
                    edital.organization.includes('PROSAS') 
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white' 
                    : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  {edital.organization.includes('PROSAS') ? 'Acessar Plataforma Prosas' : 'Acessar Edital Oficial'}
                </a>
                <p className="text-xs text-center text-neutral-500 mt-3">
                  {edital.organization.includes('PROSAS') 
                    ? 'Nota: Como a Prosas bloqueia robôs simples, este botão redireciona para a busca central deles para ilustrar a integração.' 
                    : 'Você será redirecionado para o site oficial do governo ou da agência.'}
                </p>
              </div>
            </div>

          </aside>

        </div>
      </main>
    </div>
  );
}
