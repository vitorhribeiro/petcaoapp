import { useDevMonitor } from '@/hooks/useDevMonitor';
import { useSystemStatus, getOverallStatus } from '@/hooks/useSystemStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, Cpu, Database, Zap, RefreshCw, Trash2, 
  Terminal, ShieldCheck, Bug
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { InfoTip } from '@/components/dashboard/InfoTip';

export function DevToolsOverview() {
  const monitor = useDevMonitor();
  const { statuses } = useSystemStatus();
  const overallStatus = getOverallStatus(statuses);
  
  // Combine logs and JS errors for a unified terminal feed, sort by time desc
  const terminalFeed = [
    ...monitor.logs.map(l => ({ ...l, type: 'log' as const, time: l.timestamp.getTime() })),
    ...monitor.jsErrors.map(e => ({ 
      id: e.id, 
      level: 'ERROR' as const, 
      message: `[JS Exception] ${e.message} at ${e.source}:${e.line}`, 
      timestamp: e.timestamp,
      type: 'error' as const,
      time: e.timestamp.getTime()
    }))
  ].sort((a, b) => b.time - a.time).slice(0, 50);

  const StatusDot = ({ status }: { status: string }) => {
    const color = status === 'online' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-destructive';
    return (
      <span className="relative flex h-2.5 w-2.5">
        {status === 'online' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`}></span>}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`}></span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Status Board
            <Badge variant="outline" className="ml-2 font-mono text-[10px] h-5 bg-muted/50">
              {monitor.backendLoading ? 'SYNCING...' : 'LIVE'}
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de infraestrutura e performance em tempo real
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={monitor.refreshAll} disabled={monitor.backendLoading} className="h-8 text-xs gap-1.5 rounded-lg border-border/60">
            <RefreshCw className={cn("w-3 h-3", monitor.backendLoading && "animate-spin")} />
            Verificar Agora
          </Button>
          <Button variant="outline" size="sm" onClick={() => { monitor.clearLogs(); monitor.clearErrors(); }} className="h-8 text-xs gap-1.5 rounded-lg border-border/60 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3 h-3" />
            Limpar Logs
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Memory Metric */}
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm relative group rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-sky-500" />
              </div>
              <div className="flex items-center gap-2">
                <InfoTip text="Quantidade de memória RAM alocada pela aplicação no navegador do usuário." />
                <Badge variant="secondary" className="text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400">CLIENT</Badge>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {monitor.metrics.memoryUsedMB}<span className="text-sm text-muted-foreground font-normal"> MB</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Uso de Heap JS</p>
          </CardContent>
        </Card>

        {/* API Traffic */}
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm relative group rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <InfoTip text="Taxa de requisições de rede enviadas da aplicação por minuto (RPM)." />
                <Badge variant="secondary" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">NETWORK</Badge>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {monitor.metrics.rpm}<span className="text-sm text-muted-foreground font-normal"> /min</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Requisições API</p>
          </CardContent>
        </Card>

        {/* DB Latency */}
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm relative group rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-violet-500" />
              </div>
              <div className="flex items-center gap-2">
                <InfoTip text="Tempo de resposta atual (ping) para consultas diretas no banco de dados." />
                <Badge variant="secondary" className="text-[10px] font-mono bg-violet-500/10 text-violet-600 dark:text-violet-400">SUPABASE</Badge>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {monitor.dbStatus.responseTime ?? '—'}<span className="text-sm text-muted-foreground font-normal"> ms</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Latência do Banco</p>
          </CardContent>
        </Card>

        {/* DB Size */}
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm relative group rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-center gap-2">
                <InfoTip text="Quantidade total estimada de registros processados nas tabelas principais do banco." />
                <Badge variant="secondary" className="text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400">STORAGE</Badge>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {monitor.dbStatus.totalRows > 0 ? (monitor.dbStatus.totalRows / 1000).toFixed(1) + 'k' : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Registros no DB</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 lg:h-[450px]">
        
        {/* Left Column: System Health & Errors */}
        <div className="flex flex-col gap-4 lg:gap-6 h-[450px] lg:h-full">
          
          {/* Service Health */}
          <Card className="border-border/60 shadow-sm overflow-hidden shrink-0">
            <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Saúde dos Serviços
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {Object.entries(statuses).map(([service, statusObj]) => (
                  <div key={service} className="flex items-center justify-between p-3 px-4 hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-medium capitalize text-foreground">{service}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">{statusObj.status}</span>
                      <StatusDot status={statusObj.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Frontend Errors */}
          <Card className="border-border/60 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bug className="w-4 h-4 text-destructive" />
                Erros Capturados
              </CardTitle>
              {monitor.jsErrors.length > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px] font-mono">{monitor.jsErrors.length}</Badge>
              )}
            </CardHeader>
            <ScrollArea className="flex-1 bg-card/30">
              <div className="p-3 space-y-2">
                {monitor.jsErrors.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground mt-4">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                    <p className="text-xs">Nenhum erro JS detectado.</p>
                  </div>
                ) : (
                  monitor.jsErrors.slice(0, 10).map((err, i) => (
                    <div key={i} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                      <p className="text-xs font-mono font-medium text-destructive truncate">{err.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{err.source.split('/').pop()}:{err.line}</span>
                        <span className="text-[10px] text-muted-foreground/60">{format(err.timestamp, 'HH:mm:ss')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right Column: Live Terminal */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm overflow-hidden flex flex-col h-[450px] lg:h-full bg-[#0a0a0a] ring-1 ring-white/5">
          <CardHeader className="p-3 border-b border-white/10 bg-[#111] flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-zinc-400">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-mono tracking-wider font-semibold">syslog_stream</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 hover:bg-red-500 transition-colors cursor-pointer" onClick={monitor.clearLogs} title="Limpar terminal" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 hover:bg-amber-500 transition-colors cursor-pointer" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 hover:bg-emerald-500 transition-colors cursor-pointer" />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 p-4 font-mono text-[11px] leading-relaxed">
            {terminalFeed.length === 0 ? (
              <div className="text-zinc-600 flex items-center gap-2">
                <span className="animate-pulse">_</span> Aguardando eventos...
              </div>
            ) : (
              <div className="space-y-1">
                {terminalFeed.map((log) => {
                  const isError = log.level === 'ERROR';
                  const isWarn = log.level === 'WARN';
                  const timeStr = format(log.timestamp, 'HH:mm:ss.SSS');
                  
                  return (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, x: -5 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group break-all"
                    >
                      <span className="text-zinc-600 shrink-0 select-none">{timeStr}</span>
                      <span className={cn(
                        "shrink-0 font-bold w-12",
                        isError ? "text-red-500" : isWarn ? "text-amber-500" : "text-sky-500"
                      )}>
                        [{log.level}]
                      </span>
                      <span className={cn(
                        "text-zinc-300",
                        isError && "text-red-400/90"
                      )}>
                        {log.message}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
