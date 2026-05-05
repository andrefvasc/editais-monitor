'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Briefcase, Calendar, CheckCircle, Search, TrendingUp, AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        // Derivar o "tema" a partir das palavras-chave do título/organização
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
      // Recarregar a tabela para mostrar os novos editais
      await fetchEditais();
    } catch (e) {
      setMonitorResult({ error: 'Erro ao executar monitoramento.' });
    } finally {
      setMonitoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-emerald-500/30">
      {/* Header */}
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
        
        {/* Top Section: Metrics & Subscribe */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Welcome & Subscribe */}
          <div className="lg:col-span-2 bg-neutral-900 rounded-2xl p-8 border border-neutral-800 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                Monitoramento de Editais no Ceará
              </h2>
              <p className="text-neutral-400 mb-8 max-w-xl leading-relaxed">
                Acompanhe em tempo real as oportunidades nas áreas de Inovação, Cultura, Futuro do Trabalho e Consultorias.
              </p>
              
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu melhor e-mail..." 
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-neutral-100 placeholder:text-neutral-600"
                  required
                />
                <button 
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {subscribed ? <CheckCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  {subscribed ? 'Inscrito!' : 'Receber Alertas'}
                </button>
              </form>
            </div>
          </div>

          {/* Metric Cards */}
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

        {/* Middle Section: Chart & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart */}
          <div className="lg:col-span-2 bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neutral-400" />
              Volume de Editais (2026)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEditais" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="name" stroke="#525252" tick={{ fill: '#737373', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#525252" tick={{ fill: '#737373', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="editais" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEditais)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status/Alerts */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex flex-col">
             <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Status do Sistema
            </h3>
            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-400">Google Sheets Sync</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <p className="text-xs text-neutral-500">Última checagem: há 2 minutos</p>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-400">Serviço de Email</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <p className="text-xs text-neutral-500">Pronto para disparos</p>
              </div>
            </div>
          </div>

        </div>

        {/* Resultado do Monitoramento */}
        {monitorResult && (
          <div className={`rounded-2xl border p-6 ${
            monitorResult.error 
              ? 'bg-red-500/5 border-red-500/20' 
              : monitorResult.editaisNovosAdicionados > 0
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                monitorResult.error ? 'bg-red-500/10' : monitorResult.editaisNovosAdicionados > 0 ? 'bg-emerald-500/10' : 'bg-neutral-800'
              }`}>
                {monitorResult.error 
                  ? <AlertTriangle className="w-5 h-5 text-red-400" />
                  : monitorResult.editaisNovosAdicionados > 0 
                    ? <Bell className="w-5 h-5 text-emerald-400" />
                    : <Inbox className="w-5 h-5 text-neutral-400" />}
              </div>
              <div className="flex-1">
                <p className={`font-semibold mb-1 ${
                  monitorResult.error ? 'text-red-400' : monitorResult.editaisNovosAdicionados > 0 ? 'text-emerald-400' : 'text-neutral-200'
                }`}>
                  {monitorResult.error || monitorResult.message}
                </p>
                {!monitorResult.error && (
                  <div className="flex flex-wrap gap-4 mt-3">
                    <span className="text-xs bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-700">
                      🔍 <strong>{monitorResult.totalRaspados}</strong> editais varridos
                    </span>
                    <span className="text-xs bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-700">
                      🎯 <strong>{monitorResult.totalRelevantes ?? monitorResult.editaisRelevantes ?? 0}</strong> relevantes
                    </span>
                    <span className={`text-xs px-3 py-1.5 rounded-full border ${
                      monitorResult.editaisNovosAdicionados > 0 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-neutral-800 border-neutral-700'
                    }`}>
                      ✨ <strong>{monitorResult.editaisNovosAdicionados ?? monitorResult.novos ?? 0}</strong> novos adicionados
                    </span>
                    {monitorResult.emailsEnviados > 0 && (
                      <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full">
                        📧 <strong>{monitorResult.emailsEnviados}</strong> e-mails enviados
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {emailLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <p className="text-xs text-neutral-500 mb-3 font-medium uppercase tracking-wider">Log de envios</p>
                <ul className="space-y-2">
                  {emailLogs.map((log, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'Enviado' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      <span className="text-neutral-300">{log.email}</span>
                      <span className="text-neutral-500">— {log.status}</span>
                      {log.error && <span className="text-red-400 text-xs">{log.error}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Latest Data Table */}
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
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-800 rounded w-1/2"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-800 rounded w-1/3"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-800 rounded w-1/4"></div></td>
                    </tr>
                  ))
                ) : editais.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <Inbox className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                      <p className="text-neutral-500 font-medium">Nenhum edital capturado ainda.</p>
                      <p className="text-neutral-600 text-sm mt-1">Clique em <strong className="text-neutral-400">"Forçar Busca Agora"</strong> para varrer os portais.</p>
                    </td>
                  </tr>
                ) : (
                  editais.map((edital) => (
                    <tr 
                      key={edital.id} 
                      className="hover:bg-neutral-800/50 transition-colors group cursor-pointer"
                      onClick={() => window.open(`/edital/${edital.id}`, '_blank')}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors line-clamp-1">{edital.title}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-400">{edital.organization}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {edital.theme}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-400">
                        {format(new Date(edital.publishDate), "dd 'de' MMM", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4">
                         <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${edital.status === 'Aberto' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
                          {edital.status === 'Aberto' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                          {edital.status}
                        </span>
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
