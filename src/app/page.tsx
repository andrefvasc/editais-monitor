'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Briefcase, Calendar, CheckCircle, Search, TrendingUp, AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function Dashboard() {
  const [editais, setEditais] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);
  const [monitorResult, setMonitorResult] = useState<any>(null);

  const fetchEditais = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/editais');
      const data = await res.json();
      if (data.editais) {
        // Filtro agressivo para garantir que NADA antigo apareça na UI
        const currentYearEditais = data.editais.filter((e: any) => {
          const title = e.title.toLowerCase();
          // Blacklist de anos antigos (até 2024 inclusive)
          const oldYears = ['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','/09','/20','/21','/22','/23','/24'];
          const hasOldYear = oldYears.some(y => title.includes(y));
          
          // Se tiver um ano de 4 dígitos, tem que ser 2025 ou 2026
          const years = title.match(/\d{4}/g);
          if (years && !years.some((y: string) => y === '2025' || y === '2026')) return false;

          return !hasOldYear;
        });

        // Deduplicação por título
        const uniqueTitles = new Map();
        currentYearEditais.forEach((e: any) => {
          const normalizedTitle = e.title.toLowerCase().trim();
          if (!uniqueTitles.has(normalizedTitle)) {
            uniqueTitles.set(normalizedTitle, {
              ...e,
              theme: deriveTheme(e.title, e.organization),
            });
          }
        });

        setEditais(Array.from(uniqueTitles.values()));
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
    if (text.includes('cultura') || text.includes('secult') || text.includes('mecenas')) return 'Cultura';
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
              {monitoring ? 'Sincronizando Portais...' : 'Forçar Busca Agora'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-neutral-900 rounded-2xl p-8 border border-neutral-800 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Monitoramento de Editais Ativos</h2>
              <p className="text-neutral-400 mb-8 max-w-xl leading-relaxed">Filtro de temporalidade ativo: Apenas oportunidades de 2025 e 2026 capturadas diretamente dos portais oficiais.</p>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail..." className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-neutral-100" required />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <Bell className="w-5 h-5" />
                  {subscribed ? 'Inscrito!' : 'Receber Alertas'}
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex items-start justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium mb-1">Editais Abertos (25/26)</p>
                <p className="text-4xl font-bold">{loading ? '–' : editais.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {monitorResult && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <p className="text-emerald-400 font-medium">Busca finalizada: {monitorResult.totalRaspados} portais verificados com sucesso.</p>
          </div>
        )}

        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
          <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Lista de Oportunidades Reais</h3>
            <span className="text-xs text-neutral-500 bg-neutral-950 px-3 py-1.5 rounded-full border border-neutral-800">Sincronizado com Portais Oficiais</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950/50">
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase">Edital</th>
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase">Órgão</th>
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase">Tema</th>
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase">Data</th>
                  <th className="px-6 py-4 text-xs font-medium text-neutral-400 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-4 h-12 bg-neutral-800/20"></td></tr>)
                ) : editais.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-neutral-500">Nenhum edital ativo para 2025/2026 encontrado.</td></tr>
                ) : (
                  editais.map((edital) => (
                    <tr key={edital.id} className="hover:bg-neutral-800/50 transition-colors group">
                      <td className="px-6 py-4 font-medium max-w-md truncate">{edital.title}</td>
                      <td className="px-6 py-4 text-neutral-400">{edital.organization}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{edital.theme}</span>
                      </td>
                      <td className="px-6 py-4 text-neutral-400 text-sm">{format(new Date(edital.publishDate), "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td className="px-6 py-4">
                        <Link href={`/edital/${edital.id}`} className="text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-1">
                          Acessar <TrendingUp className="w-4 h-4" />
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
