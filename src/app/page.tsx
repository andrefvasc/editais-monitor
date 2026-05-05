'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Briefcase, Calendar, CheckCircle, Search, TrendingUp, AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

const chartData = [
  { name: 'Jan', editais: 4 },
  { name: 'Fev', editais: 3 },
  { name: 'Mar', editais: 7 },
  { name: 'Abr', editais: 5 },
  { name: 'Mai', editais: 9 },
  { name: 'Jun', editais: 12 },
];

export default function Dashboard() {
  const [editais, setEditais] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);
  const [monitorResult, setMonitorResult] = useState<any>(null);
  const [emailLogs, setEmailLogs] = useState<{email: string, status: string, url?: string, error?: string}[]>([]);

  const fetchEditais = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/editais');
      const data = await res.json();
      if (data.editais) {
        const withTheme = data.editais.map((e: any) => ({
          ...e,
          theme: deriveTheme(e.title, e.organization),
        }));
        setEditais(withTheme);
      }
    } catch (err) {
      console.error('Erro ao carregar editais:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEditais();
  }, [fetchEditais]);

  function deriveTheme(title: string, org: string): string {
    const text = (title + ' ' + org).toLowerCase();
    if (text.includes('inovação') || text.includes('inovacao') || text.includes('tecnologia') || text.includes('finep') || text.includes('funcap')) return 'Inovação';
    if (text.includes('cultura') || text.includes('secult')) return 'Cultura';
    if (text.includes('consultoria') || text.includes('seplag')) return 'Gestão/Consultoria';
    if (text.includes('empreendedorismo') || text.includes('empreendedora')) return 'Empreendedorismo';
    if (text.includes('impacto social') || text.includes('terceiro setor')) return 'Impacto Social';
    if (text.includes('futuro do trabalho')) return 'Futuro do Trabalho';
    return 'Diversos';
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  const triggerMonitor = async () => {
    setMonitoring(true);
    setMonitorResult(null);
    try {
      const res = await fetch('/api/monitor');
      const data = await res.json();
      setMonitorResult(data);
      if (data.emailLogs) setEmailLogs(data.emailLogs);
      await fetchEditais();
    } catch (e) {
      setMonitorResult({ error: 'Erro ao executar monitoramento.' });
    } finally {
      setMonitoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-emerald-500/30">
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Search className="w-5 h-5 text-neutral-950" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">MonitorCE</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={triggerMonitor}
              disabled={monitoring}
              className="text-sm font-medium px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${monitoring ? 'animate-spin' : ''}`} />
              {monitoring ? 'Buscando nos portais...' : 'Forçar Busca Agora'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-neutral-900 rounded-2xl p-8 border border-neutral-800 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Monitoramento de Editais no Ceará</h2>
              <p className="text-neutral-400 mb-8 max-w-xl leading-relaxed">Acompanhe em tempo real as oportunidades nas áreas de Inovação, Cultura, Futuro do Trabalho e Consultorias.</p>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu melhor e-mail..." className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-neutral-100 placeholder:text-neutral-600" required />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  {subscribed ? <CheckCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  {subscribed ? 'Inscrito!' : 'Receber Alertas'}
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex items-start justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium mb-1">Editais na Planilha</p>
                <p className="text-4xl font-bold">{loading ? '–' : editais.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex items-start justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium mb-1">Fontes Monitoradas</p>
                <p className="text-4xl font-bold text-emerald-400">4</p>
                <p className="text-xs text-neutral-500 mt-1">FUNCAP · SEPLAG · FINEP · Gov CE</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {monitorResult && (
          <div className={`rounded-2xl border p-6 ${monitorResult.error ? 'bg-red-500/5 border-red-500/20' : 'bg-neutral-900 border-neutral-800'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${monitorResult.error ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                {monitorResult.error ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <Bell className="w-5 h-5 text-emerald-400" />}
              </div>
              <div className="flex-1">
                <p className={`font-semibold mb-1 ${monitorResult.error ? 'text-red-400' : 'text-emerald-400'}`}>{monitorResult.error || monitorResult.message}</p>
                {!monitorResult.error && (
                  <div className="flex flex-wrap gap-4 mt-3">
                    <span className="text-xs bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-700">🔍 <strong>{monitorResult.totalRaspados}</strong> editais varridos</span>
                    <span className="text-xs bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-700">✨ <strong>{monitorResult.editaisNovosAdicionados}</strong> novos adicionados</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
          <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Últimos Editais Capturados</h3>
            <span className="text-xs text-neutral-500 bg-neutral-950 px-3 py-1.5 rounded-full border border-neutral-800">Atualizado ao vivo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950/50">
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Título</th>
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Órgão</th>
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Tema</th>
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-800 rounded w-3/4"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-800 rounded w-1/2"></div></td>
                      <td colSpan={3}></td>
                    </tr>
                  ))
                ) : editais.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-neutral-500">Nenhum edital capturado ainda.</td></tr>
                ) : (
                  editais.map((edital) => (
                    <tr key={edital.id} className="hover:bg-neutral-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/edital/${edital.id}`} className="block group-hover:text-emerald-400 transition-colors font-medium">
                          {edital.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-400">
                        <Link href={`/edital/${edital.id}`} className="block">{edital.organization}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/edital/${edital.id}`} className="block">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{edital.theme}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-400">
                        <Link href={`/edital/${edital.id}`} className="block">{format(new Date(edital.publishDate), "dd 'de' MMM", { locale: ptBR })}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/edital/${edital.id}`} className="block">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${edital.status === 'Aberto' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                            {edital.status}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
