import { useState, useEffect, useMemo, useCallback } from 'react';
import { ProCard } from '@/components/admin/ProGate';
import { useAdmin } from '@/contexts/AdminContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  DollarSign, TrendingDown, TrendingUp, Crown, Wallet, ArrowUpRight, ArrowDownRight,
  Plus, Download, FileText, CalendarIcon, AlertCircle, Trash2, CreditCard,
  BarChart3, PieChart,
} from 'lucide-react';
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, parseISO, isWithinInterval, differenceInDays, getDaysInMonth, eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell, PieChart as RPieChart, Pie } from 'recharts';
import * as expensesService from '@/services/expensesService';
import { cn } from '@/lib/utils';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtShort = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : fmt(v);

type PeriodKey = 'hoje' | 'semana' | 'mes' | '30dias' | 'custom';

const EXPENSE_CATEGORIES = ['Produtos', 'Funcionários', 'Aluguel', 'Energia', 'Manutenção', 'Outros'];

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro', outro: 'Outro',
};

const PIE_COLORS = ['hsl(200, 80%, 50%)', 'hsl(150, 70%, 45%)', 'hsl(45, 90%, 55%)', 'hsl(280, 60%, 55%)'];
const BAR_COLORS = ['hsl(200, 80%, 55%)', 'hsl(150, 70%, 50%)', 'hsl(280, 60%, 55%)', 'hsl(45, 90%, 55%)', 'hsl(340, 70%, 55%)'];

export function FinanceiroProComplete() {
  const { appointments } = useAdmin();
  const [expenses, setExpenses] = useState<expensesService.ExpenseRow[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('mes');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Outros', date: format(new Date(), 'yyyy-MM-dd') });

  const loadExpenses = useCallback(async () => {
    const data = await expensesService.getExpenses();
    setExpenses(data);
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  // Period range
  const { start, end } = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'hoje': return { start: startOfDay(now), end: endOfDay(now) };
      case 'semana': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'mes': return { start: startOfMonth(now), end: endOfMonth(now) };
      case '30dias': return { start: subDays(now, 30), end: now };
      case 'custom': return { start: customStart || startOfMonth(now), end: customEnd || endOfMonth(now) };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period, customStart, customEnd]);

  // Filter appointments by period
  const filtered = useMemo(() => {
    return appointments.filter(a => {
      const d = parseISO(a.date);
      return isWithinInterval(d, { start, end });
    });
  }, [appointments, start, end]);

  const paidAppointments = useMemo(() =>
    filtered.filter(a => a.status === 'realizado' && a.payment_status === 'pago'),
    [filtered]
  );

  const filteredExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start, end });
    }),
    [expenses, start, end]
  );

  // Metrics
  const metrics = useMemo(() => {
    const revenue = paidAppointments.reduce((s, a) => s + (a.payment_amount || a.price || 0), 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const profit = revenue - totalExpenses;
    const ticketMedio = paidAppointments.length > 0 ? revenue / paidAppointments.length : 0;
    return { revenue, totalExpenses, profit, ticketMedio, paidCount: paidAppointments.length };
  }, [paidAppointments, filteredExpenses]);

  // Smart alerts
  const alerts = useMemo(() => {
    const msgs: string[] = [];
    // Compare with previous period
    const periodDays = Math.max(1, differenceInDays(end, start) + 1);
    const prevStart = subDays(start, periodDays);
    const prevEnd = subDays(start, 1);
    const prevPaid = appointments.filter(a => {
      const d = parseISO(a.date);
      return a.status === 'realizado' && a.payment_status === 'pago' && isWithinInterval(d, { start: prevStart, end: prevEnd });
    });
    const prevRevenue = prevPaid.reduce((s, a) => s + (a.payment_amount || a.price || 0), 0);

    if (prevRevenue > 0 && metrics.revenue > prevRevenue) {
      const pct = Math.round(((metrics.revenue - prevRevenue) / prevRevenue) * 100);
      msgs.push(`📈 Seu faturamento aumentou ${pct}% comparado ao período anterior.`);
    } else if (prevRevenue > 0 && metrics.revenue < prevRevenue) {
      const pct = Math.round(((prevRevenue - metrics.revenue) / prevRevenue) * 100);
      msgs.push(`📉 Seu faturamento está ${pct}% menor que o período anterior.`);
    }

    if (metrics.revenue === 0 && period === 'hoje') {
      msgs.push('⚠️ Hoje ainda não houve faturamento registrado.');
    }

    if (metrics.profit < 0) {
      msgs.push('🔴 Atenção: suas despesas estão superando a receita neste período.');
    }

    return msgs;
  }, [metrics, appointments, start, end, period]);

  // Revenue chart (line per day)
  const revenueChartData = useMemo(() => {
    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRevenue = paidAppointments
        .filter(a => a.date === dayStr)
        .reduce((s, a) => s + (a.payment_amount || a.price || 0), 0);
      return { date: format(day, 'dd/MM'), value: dayRevenue };
    });
  }, [paidAppointments, start, end]);

  // Revenue by service
  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {};
    paidAppointments.forEach(a => {
      map[a.service_name] = (map[a.service_name] || 0) + (a.payment_amount || a.price || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [paidAppointments]);

  // Most profitable service
  const topService = revenueByService[0] || null;

  // Payment methods
  const paymentMethods = useMemo(() => {
    const map: Record<string, number> = {};
    paidAppointments.forEach(a => {
      const method = a.payment_method || 'outro';
      map[method] = (map[method] || 0) + 1;
    });
    const total = paidAppointments.length || 1;
    return Object.entries(map).map(([method, count]) => ({
      name: PAYMENT_LABELS[method] || method,
      value: count,
      pct: Math.round((count / total) * 100),
    }));
  }, [paidAppointments]);

  // Forecast
  const forecast = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const totalDays = getDaysInMonth(now);
    if (dayOfMonth === 0) return 0;
    const currentMonthPaid = appointments.filter(a => {
      const d = parseISO(a.date);
      return a.status === 'realizado' && a.payment_status === 'pago' &&
        isWithinInterval(d, { start: startOfMonth(now), end: endOfDay(now) });
    });
    const currentRevenue = currentMonthPaid.reduce((s, a) => s + (a.payment_amount || a.price || 0), 0);
    return (currentRevenue / dayOfMonth) * totalDays;
  }, [appointments]);

  // Expense handlers
  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    await expensesService.createExpense({
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date,
    });
    setNewExpense({ description: '', amount: '', category: 'Outros', date: format(new Date(), 'yyyy-MM-dd') });
    setNewExpenseOpen(false);
    await loadExpenses();
  };

  const handleDeleteExpense = async (id: string) => {
    await expensesService.deleteExpense(id);
    await loadExpenses();
  };

  // Export
  const handleExport = (type: 'csv' | 'pdf' | 'excel') => {
    const rows = paidAppointments.map(a => ({
      Data: a.date,
      Pet: a.pets?.map(p => p.pet_name).join(', ') || '',
      Cliente: a.customer_name || '',
      Serviço: a.service_name,
      Valor: a.payment_amount || a.price || 0,
      Pagamento: PAYMENT_LABELS[a.payment_method || ''] || a.payment_method || '',
    }));

    if (type === 'csv') {
      const headers = Object.keys(rows[0] || {});
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financeiro-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (type === 'excel') {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Financeiro');
        XLSX.writeFile(wb, `financeiro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      });
    } else if (type === 'pdf') {
      import('jspdf').then(({ jsPDF }) => {
        import('jspdf-autotable').then(({ default: autoTable }) => {
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Relatório Financeiro', 14, 20);
          doc.setFontSize(10);
          doc.text(`Período: ${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`, 14, 28);
          doc.text(`Receita: ${fmt(metrics.revenue)} | Despesas: ${fmt(metrics.totalExpenses)} | Lucro: ${fmt(metrics.profit)}`, 14, 35);

          const headers = ['Data', 'Pet', 'Cliente', 'Serviço', 'Valor', 'Pagamento'];
          const body = rows.map(r => [r.Data, r.Pet, r.Cliente, r.Serviço, fmt(r.Valor as number), r.Pagamento]);
          autoTable(doc, { head: [headers], body, startY: 42, styles: { fontSize: 8 } });
          doc.save(`financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        });
      });
    }
  };

  const chartConfig = {
    value: { label: 'Faturamento', color: 'hsl(150, 70%, 45%)' },
  };

  return (
    <ProCard>
      <div id="pro-financeiro" className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Financeiro</h3>
            <p className="text-xs text-muted-foreground">Receitas, despesas e lucro</p>
          </div>
          <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Crown className="w-3 h-3 mr-1" /> PRO
          </Badge>
        </div>

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-sm text-foreground">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                {msg}
              </div>
            ))}
          </div>
        )}

        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: 'hoje', label: 'Hoje' },
            { key: 'semana', label: 'Esta semana' },
            { key: 'mes', label: 'Este mês' },
            { key: '30dias', label: 'Últimos 30 dias' },
            { key: 'custom', label: 'Personalizado' },
          ] as { key: PeriodKey; label: string }[]).map(p => (
            <Button
              key={p.key}
              variant={period === p.key ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customStart ? format(customStart, 'dd/MM/yyyy') : 'Data início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customStart} onSelect={setCustomStart} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Data fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Receita', value: fmt(metrics.revenue), icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/20' },
            { label: 'Despesas', value: fmt(metrics.totalExpenses), icon: ArrowDownRight, color: 'text-red-500', bg: 'bg-red-500/5 border-red-500/20' },
            { label: 'Lucro', value: fmt(metrics.profit), icon: Wallet, color: metrics.profit >= 0 ? 'text-emerald-500' : 'text-red-500', bg: metrics.profit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20' },
            { label: 'Ticket Médio', value: fmt(metrics.ticketMedio), icon: DollarSign, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          ].map(s => (
            <Card key={s.label} className={s.bg}>
              <CardContent className="p-4 text-center">
                <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Forecast + Most Profitable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Previsão do mês</span>
              </div>
              <p className="text-xl font-bold text-primary">{fmt(forecast)}</p>
              <p className="text-[10px] text-muted-foreground">estimado</p>
            </CardContent>
          </Card>
          {topService && (
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-muted-foreground">Serviço mais lucrativo</span>
                </div>
                <p className="text-base font-bold text-foreground">{topService.name}</p>
                <p className="text-sm font-semibold text-emerald-500">{fmt(topService.value)}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Revenue Line Chart */}
        {revenueChartData.length > 0 && (
          <Card className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-foreground">Faturamento por dia</span>
              </div>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtShort} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />} />
                  <Line type="monotone" dataKey="value" stroke="hsl(150, 70%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Service Bar Chart */}
        {revenueByService.length > 0 && (
          <Card className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-semibold text-foreground">Receita por serviço</span>
              </div>
              <ChartContainer config={{ value: { label: 'Receita', color: 'hsl(200, 80%, 55%)' } }} className="h-[200px] w-full">
                <BarChart data={revenueByService} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtShort} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {revenueByService.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods Pie Chart */}
        {paymentMethods.length > 0 && (
          <Card className="border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold text-foreground">Formas de pagamento</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ChartContainer config={{ value: { label: 'Pagamentos' } }} className="h-[160px] w-[160px] shrink-0">
                  <RPieChart>
                    <Pie data={paymentMethods} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} strokeWidth={2}>
                      {paymentMethods.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RPieChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-3">
                  {paymentMethods.map((pm, i) => (
                    <div key={pm.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-foreground font-medium">{pm.name}</span>
                      <span className="text-xs text-muted-foreground">{pm.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paid Appointments Table */}
        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-semibold text-foreground">Atendimentos pagos</span>
                <Badge variant="outline" className="text-[10px]">{paidAppointments.length}</Badge>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Pet</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Cliente</TableHead>
                    <TableHead className="text-xs">Serviço</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                        Nenhum atendimento pago neste período.
                      </TableCell>
                    </TableRow>
                  ) : paidAppointments.slice(0, 50).map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{a.date ? format(parseISO(a.date), 'dd/MM') : ''}</TableCell>
                      <TableCell className="text-xs">{a.pets?.map(p => p.pet_name).join(', ') || '—'}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{a.customer_name || '—'}</TableCell>
                      <TableCell className="text-xs">{a.service_name}</TableCell>
                      <TableCell className="text-xs font-medium">{fmt(a.payment_amount || a.price || 0)}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{PAYMENT_LABELS[a.payment_method || ''] || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Management */}
        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-foreground">Controle de despesas</span>
                <Badge variant="outline" className="text-[10px]">{filteredExpenses.length}</Badge>
              </div>
              <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-xs gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nova Despesa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={newExpense.description}
                        onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))}
                        placeholder="Ex: Shampoo pet"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newExpense.amount}
                        onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Categoria</Label>
                      <Select value={newExpense.category} onValueChange={v => setNewExpense(p => ({ ...p, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Data</Label>
                      <Input
                        type="date"
                        value={newExpense.date}
                        onChange={e => setNewExpense(p => ({ ...p, date: e.target.value }))}
                      />
                    </div>
                    <Button onClick={handleAddExpense} className="w-full">Salvar despesa</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                        Nenhuma despesa neste período.
                      </TableCell>
                    </TableRow>
                  ) : filteredExpenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{format(parseISO(e.date), 'dd/MM')}</TableCell>
                      <TableCell className="text-xs">{e.description}</TableCell>
                      <TableCell className="text-xs">{e.category}</TableCell>
                      <TableCell className="text-xs font-medium text-red-500">{fmt(e.amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteExpense(e.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-1">Exportar relatório:</span>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleExport('pdf')}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleExport('csv')}>
            <FileText className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleExport('excel')}>
            <FileText className="w-3.5 h-3.5" /> Excel
          </Button>
        </div>
      </div>
    </ProCard>
  );
}
