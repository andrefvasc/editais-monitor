'use client';

import { useState, useEffect } from 'react';
import { Bell, Briefcase, Calendar, CheckCircle, Search, TrendingUp, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data for the chart
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
  const [emailLogs, setEmailLogs] = useState<{email: string, status: string, url?: string, error?: string}[]>([]);

  useEffect(() => {
    // In a real app, this would fetch from our Next.js API that reads from Google Sheets
    setTimeout(() => {
      setEditais([
        {
          id: '1',
          title: 'Edital de Fomento à Inovação Tecnológica 2026',
          organization: 'SECITECE',
          publishDate: new Date().toISOString(),
          link: '#',
          status: 'Aberto',
          theme: 'Inovação'
        },
        {
          id: '2',
          title: 'Credenciamento de Consultorias em Gestão Pública',
          organization: 'SEPLAG',
          publishDate: new Date(Date.now() - 86400000).toISOString(),
          link: '#',
          status: 'Aberto',
          theme: 'Consultorias'
        },
        {
          id: '3',
          title: 'Apoio a Projetos de Cultura Digital',
          organization: 'SECULT',
          publishDate: new Date(Date.now() - 172800000).toISOString(),
          link: '#',
          status: 'Fechado',
          theme: 'Cultura'
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Real app: call API to append to Subscribers sheet
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  const triggerMonitor = async () => {
    setMonitoring(true);
    try {
      const res = await fetch('/api/monitor');
      const data = await res.json();
      if (data.emailLogs) setEmailLogs(data.emailLogs);
      alert(`Monitoramento concluído! ${data.editaisEncontrados} editais encontrados e ${data.emailsEnviados} e-mails enviados.`);
    } catch (e) {
      alert('Erro ao executar monitoramento.');
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
              className="text-sm font-medium px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {monitoring ? 'Buscando...' : 'Forçar Busca Agora'}
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
                <p className="text-neutral-400 text-sm font-medium mb-1">Editais Abertos</p>
                <p className="text-4xl font-bold">24</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            
            <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex items-start justify-between">
              <div>
                <p className="text-neutral-400 text-sm font-medium mb-1">Crescimento (Mês)</p>
                <p className="text-4xl font-bold text-emerald-400">+12%</p>
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

        {/* Email Logs Section */}
        {emailLogs.length > 0 && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-neutral-400" />
                Log de E-mails Enviados
              </h3>
            </div>
            <div className="p-6">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl mb-6 text-sm">
                <strong>Nota sobre E-mails:</strong> Como você ainda não configurou as credenciais SMTP no arquivo <code>.env</code>, o sistema utilizou o <strong>Ethereal Email</strong> (um serviço de teste) para simular o disparo. Abaixo estão os links para você visualizar como o e-mail chegou na caixa de entrada virtual!
              </div>
              <ul className="space-y-3">
                {emailLogs.map((log, i) => (
                  <li key={i} className="flex items-center justify-between bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'Enviado' ? 'bg-emerald-400' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium">{log.email}</span>
                      <span className="text-xs text-neutral-500">- {log.status}</span>
                    </div>
                    {log.url && (
                      <a href={log.url} target="_blank" rel="noreferrer" className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full transition-colors">
                        Visualizar E-mail
                      </a>
                    )}
                    {log.error && <span className="text-xs text-red-400">{log.error}</span>}
                  </li>
                ))}
              </ul>
            </div>
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
