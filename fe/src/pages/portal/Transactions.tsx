import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Search,
  Filter,
  ChevronRight,
  Calendar,
  Clock,
  CreditCard,
  RefreshCcw,
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  X,
  Copy,
  Check,
  ExternalLink,
  Receipt,
  FileText,
  Activity,
  History,
  Info,
  Terminal as TerminalIcon,
  Loader2
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalCard } from "@/components/portal/ui";
import { usePortal } from "@/components/portal/PortalContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
type TransactionSummary = {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  payment_channel: string;
  status: 'pending_payment' | 'paid' | 'failed' | 'expired' | 'expired_stale';
  vendor_id: string;
  vendor_code: string;
  environment: 'sandbox' | 'production';
  routing_reason: string;
  vendor_transaction_id?: string;
  created_at: string;
  paid_at?: string;
  expired_at?: string;
};

type TransactionStats = {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  total_volume: number;
  success_rate: number;
};

type PaginationMeta = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

type TransactionEvent = {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
};

type TransactionDetail = TransactionSummary & {
  qris_code?: string;
  expires_at?: string;
  callback_delivered: boolean;
  reconciliation_attempts: number;
  events: TransactionEvent[];
};

export default function TransactionsPage() {
  const { env, setEnv } = usePortal();
  const { toast } = useToast();
  const { txId } = useParams(); // For deep linking

  // State
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  
  const [filters, setFilters] = useState({
    status: "all",
    vendor_id: "all",
    date_range: "7d",
    search: "",
    page: 1,
    per_page: 25
  });

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [txDetail, setTxDetail] = useState<TransactionDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Constants
  const dateRanges = [
    { label: "Today", value: "today" },
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "Last 90 days", value: "90d" },
  ];

  const statuses = [
    { label: "Semua Status", value: "all" },
    { label: "Paid", value: "paid" },
    { label: "Pending", value: "pending_payment" },
    { label: "Failed", value: "failed" },
    { label: "Expired", value: "expired" },
    { label: "Stale", value: "expired_stale" },
  ];

  // Logic: Fetch Stats
  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const res = await fetch(`/api/portal/transactions/stats?environment=${env}&date_range=${filters.date_range}`, {
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Logic: Fetch Transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        environment: env,
        page: filters.page.toString(),
        per_page: filters.per_page.toString(),
      });
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.vendor_id !== "all") params.append("vendor_id", filters.vendor_id);
      if (filters.search) params.append("search", filters.search);
      // Date handling would go here

      const res = await fetch(`/api/portal/transactions?${params.toString()}`, {
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();
      if (data.data) {
        setTransactions(data.data);
        setMeta(data.meta);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Gagal memuat daftar transaksi.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Logic: Fetch Detail
  const fetchDetail = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/portal/transactions/${id}`, {
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();
      setTxDetail(data);
    } catch (err) {
      toast({
        title: "Error",
        description: "Gagal memuat detail transaksi.",
        variant: "destructive"
      });
      setIsDrawerOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [env, filters.date_range]);

  useEffect(() => {
    fetchTransactions();
  }, [env, filters]);

  // Handle deep linking from URL
  useEffect(() => {
    if (txId) {
      setSelectedTxId(txId);
    }
  }, [txId]);

  useEffect(() => {
    if (selectedTxId) {
      fetchDetail(selectedTxId);
      setIsDrawerOpen(true);
    }
  }, [selectedTxId]);

  const handleReset = () => {
    setFilters({
      status: "all",
      vendor_id: "all",
      date_range: "7d",
      search: "",
      page: 1,
      per_page: 25
    });
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} disalin ke clipboard.`
    });
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <PortalLayout title="Transactions" breadcrumb="Transactions / History">
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-portal-text">Transactions</h1>
            <p className="text-sm text-portal-text-muted mt-1">Riwayat transaksi masuk dan status pembayaran.</p>
          </div>

          <div className="flex items-center gap-3">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-portal-surface border-portal-border text-portal-text h-9">
                    <Calendar className="h-4 w-4 mr-2 text-portal-text-dim" />
                    {dateRanges.find(r => r.value === filters.date_range)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-portal-surface border-portal-border text-portal-text min-w-[160px]">
                  {dateRanges.map(range => (
                    <DropdownMenuItem
                      key={range.value}
                      onClick={() => setFilters(f => ({...f, date_range: range.value, page: 1}))}
                      className="cursor-pointer hover:bg-portal-elev"
                    >
                      {range.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Transactions" 
            value={stats?.total.toLocaleString() || "0"} 
            subtitle="dalam periode ini"
            isLoading={isStatsLoading}
          />
          <StatCard 
            title="Paid" 
            value={stats?.paid.toLocaleString() || "0"} 
            subtitle={`${stats?.success_rate || 0}% success rate`}
            color="text-teal"
            isLoading={isStatsLoading}
          />
          <StatCard 
            title="Pending" 
            value={stats?.pending.toLocaleString() || "0"} 
            subtitle="awaiting payment"
            color="text-amber-500"
            isLoading={isStatsLoading}
          />
          <StatCard 
            title="Total Volume" 
            value={stats ? formatIDR(stats.total_volume).replace('Rp', 'Rp ') : "Rp 0"} 
            subtitle="dari transaksi sukses"
            isLoading={isStatsLoading}
          />
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 bg-portal-surface p-3 rounded-xl border border-portal-border">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-portal-text-dim" />
              <Input 
                placeholder="Cari transaction ID..." 
                className="pl-9 bg-portal-elev border-portal-border h-10 focus-visible:ring-teal"
                value={filters.search}
                onChange={e => setFilters(f => ({...f, search: e.target.value, page: 1}))}
              />
            </div>

            <Select value={filters.status} onValueChange={v => setFilters(f => ({...f, status: v, page: 1}))}>
              <SelectTrigger className="w-[160px] bg-portal-elev border-portal-border h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-portal-surface border-portal-border text-portal-text">
                {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.vendor_id} onValueChange={v => setFilters(f => ({...f, vendor_id: v, page: 1}))}>
              <SelectTrigger className="w-[160px] bg-portal-elev border-portal-border h-10">
                <SelectValue placeholder="Semua Vendor" />
              </SelectTrigger>
              <SelectContent className="bg-portal-surface border-portal-border text-portal-text">
                <SelectItem value="all">Semua Vendor</SelectItem>
                <SelectItem value="qoinhub">Qoinhub</SelectItem>
                <SelectItem value="midtrans">Midtrans</SelectItem>
                <SelectItem value="xendit">Xendit</SelectItem>
              </SelectContent>
            </Select>

            {(filters.status !== "all" || filters.vendor_id !== "all" || filters.search) && (
              <button 
                onClick={handleReset}
                className="ml-auto text-xs text-portal-text-dim hover:text-red-500 transition-colors px-2 underline underline-offset-4"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* ACTIVE FILTER PILLS */}
          <div className="flex flex-wrap gap-2 px-1">
             {filters.status !== "all" && (
                <Badge variant="secondary" className="bg-portal-elev text-portal-text border-portal-border gap-1 py-1 px-2.5">
                   Status: {statuses.find(s => s.value === filters.status)?.label}
                   <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setFilters(f => ({...f, status: "all"}))} />
                </Badge>
             )}
             {filters.vendor_id !== "all" && (
                <Badge variant="secondary" className="bg-portal-elev text-portal-text border-portal-border gap-1 py-1 px-2.5 uppercase text-[10px] tracking-wider">
                   Vendor: {filters.vendor_id}
                   <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setFilters(f => ({...f, vendor_id: "all"}))} />
                </Badge>
             )}
             {(filters.status !== "all" || filters.vendor_id !== "all") && (
                <button 
                  onClick={handleReset}
                  className="text-[10px] font-bold text-red-500/80 hover:text-red-500 uppercase tracking-widest px-2"
                >
                  Clear All
                </button>
             )}
          </div>
        </div>

        {/* TRANSACTION TABLE */}
        <div className="bg-portal-surface rounded-xl border border-portal-border overflow-hidden shadow-xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-portal-elev/50 border-b border-portal-border">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-portal-text-muted">Transaction ID</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-portal-text-muted">Amount</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-portal-text-muted text-center">Vendor</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-portal-text-muted text-center">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-portal-text-muted text-center">Channel</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-portal-text-muted">Waktu</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-portal-text-muted text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                       <td colSpan={7} className="px-6 py-4"><div className="h-4 bg-portal-elev rounded w-full" /></td>
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                       <div className="flex flex-col items-center gap-3">
                          <Receipt className="h-12 w-12 text-portal-text-dim opacity-10" />
                          <div className="text-lg font-semibold text-portal-text-dim">Belum ada transaksi</div>
                          <p className="text-sm text-portal-text-muted">Transaksi yang kamu buat akan muncul di sini.</p>
                          <a href="/docs" className="text-teal text-sm hover:underline flex items-center gap-1 mt-2">
                             Lihat dokumentasi <ChevronRight className="h-3 w-3" />
                          </a>
                       </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-portal-elev/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTxId(tx.transaction_id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-portal-text hover:text-teal transition-colors">
                            {tx.transaction_id.slice(0, 16)}...
                          </code>
                          <button 
                            onClick={(e) => { e.stopPropagation(); copyText(tx.transaction_id, "Transaction ID"); }}
                            className="p-1 rounded hover:bg-portal-elev text-portal-text-dim opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-portal-text">
                          {formatIDR(tx.amount).replace('Rp', 'Rp ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <VendorBadge code={tx.vendor_code} />
                      </td>
                      <td className="px-6 py-4 flex justify-center">
                        <StatusPill status={tx.status} />
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="inline-flex items-center gap-1.5 text-xs text-portal-text-muted font-medium bg-portal-elev px-2 py-1 rounded-md border border-portal-border">
                            <TerminalIcon className="h-3 w-3" /> QRIS
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-portal-text-muted" title={new Date(tx.created_at).toLocaleString()}>
                           {getRelativeTime(tx.created_at)}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <Button variant="ghost" size="sm" className="h-8 text-portal-text-dim group-hover:text-teal group-hover:bg-teal/10">
                            Detail <ArrowRight className="h-3 w-3 ml-1.5" />
                         </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {meta && meta.total > 0 && (
            <div className="px-6 py-4 bg-portal-elev/20 border-t border-portal-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-portal-text-muted">
                Menampilkan <span className="text-portal-text font-semibold">{((filters.page - 1) * filters.per_page) + 1}–{Math.min(filters.page * filters.per_page, meta.total)}</span> dari <span className="text-portal-text font-semibold">{meta.total.toLocaleString()}</span> transaksi
              </div>

              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!meta.has_prev}
                  onClick={() => setFilters(f => ({...f, page: f.page - 1}))}
                  className="h-8 border-portal-border bg-portal-surface hover:bg-portal-elev"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                
                <div className="flex items-center gap-1 px-2">
                   {[...Array(Math.min(5, meta.total_pages))].map((_, i) => {
                      const p = i + 1;
                      return (
                        <button 
                          key={p}
                          onClick={() => setFilters(f => ({...f, page: p}))}
                          className={`h-8 w-8 rounded text-xs font-bold transition-all ${filters.page === p ? 'bg-teal text-white shadow-lg shadow-teal/20' : 'text-portal-text-muted hover:bg-portal-elev'}`}
                        >
                          {p}
                        </button>
                      );
                   })}
                   {meta.total_pages > 5 && <span className="text-portal-text-dim">...</span>}
                </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!meta.has_next}
                  onClick={() => setFilters(f => ({...f, page: f.page + 1}))}
                  className="h-8 border-portal-border bg-portal-surface hover:bg-portal-elev"
                >
                  Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              <Select value={filters.per_page.toString()} onValueChange={v => setFilters(f => ({...f, per_page: parseInt(v), page: 1}))}>
                <SelectTrigger className="w-[120px] h-8 bg-portal-surface border-portal-border text-xs">
                  <SelectValue placeholder="25 per page" />
                </SelectTrigger>
                <SelectContent className="bg-portal-surface border-portal-border text-portal-text">
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* DETAIL DRAWER */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent className="sm:max-w-[500px] w-full bg-portal-surface border-l border-portal-border text-portal-text p-0 overflow-y-auto">
            {isDetailLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-teal" />
                <p className="text-sm text-portal-text-muted animate-pulse">Memuat detail transaksi...</p>
              </div>
            ) : txDetail && (
              <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* DRAWER HEADER */}
                <div className="px-6 py-6 border-b border-portal-border sticky top-0 bg-portal-surface z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-portal-elev border border-portal-border flex items-center justify-center text-teal">
                       <Receipt className="h-5 w-5" />
                    </div>
                    <button onClick={() => setIsDrawerOpen(false)} className="p-2 rounded-lg hover:bg-portal-elev text-portal-text-dim">
                       <X className="h-5 w-5" />
                    </button>
                  </div>
                  <SheetHeader className="text-left">
                    <SheetTitle className="text-xl font-bold flex items-center gap-3">
                       <code className="text-base font-mono text-portal-text">{txDetail.transaction_id}</code>
                       <StatusPill status={txDetail.status} />
                    </SheetTitle>
                    <SheetDescription className="text-xs text-portal-text-muted flex items-center gap-2 pt-1">
                       <History className="h-3 w-3" />
                       Internal ID: {txDetail.id}
                    </SheetDescription>
                  </SheetHeader>
                </div>

                <div className="p-6 space-y-8 flex-1">
                   {/* OVERVIEW SECTION */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-portal-text-dim tracking-widest flex items-center gap-2">
                        <FileText className="h-3 w-3" /> Overview
                      </h4>
                      <div className="bg-portal-elev/40 border border-portal-border rounded-xl divide-y divide-portal-border overflow-hidden">
                         <DetailRow label="Amount" value={<span className="font-bold text-teal">{formatIDR(txDetail.amount)}</span>} />
                         <DetailRow label="Channel" value="QRIS" />
                         <DetailRow label="Environment" value={<Badge variant="outline" className={txDetail.environment === 'sandbox' ? 'text-amber-500' : 'text-teal'}>{txDetail.environment.toUpperCase()}</Badge>} />
                         <DetailRow label="Created" value={new Date(txDetail.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} />
                         {txDetail.paid_at && <DetailRow label="Paid at" value={new Date(txDetail.paid_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} />}
                         {txDetail.status === 'pending_payment' && txDetail.expires_at && <DetailRow label="Expires at" value={new Date(txDetail.expires_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} />}
                      </div>
                   </div>

                   {/* ROUTING SECTION */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-portal-text-dim tracking-widest flex items-center gap-2">
                        <RefreshCcw className="h-3 w-3" /> Routing Decision
                      </h4>
                      <div className="bg-portal-elev/40 border border-portal-border rounded-xl divide-y divide-portal-border overflow-hidden">
                         <DetailRow label="Selected Vendor" value={<VendorBadge code={txDetail.vendor_code} />} />
                         <DetailRow label="Routing Reason" value={txDetail.routing_reason || "Dynamic routing"} />
                         <DetailRow label="Vendor Tx ID" value={<code className="text-xs font-mono">{txDetail.vendor_transaction_id || "-"}</code>} />
                         <DetailRow label="Recon Attempts" value={txDetail.reconciliation_attempts} />
                      </div>
                   </div>

                   {/* QRIS SECTION */}
                   {txDetail.status === 'pending_payment' && txDetail.qris_code && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] uppercase font-bold text-portal-text-dim tracking-widest flex items-center gap-2">
                          <CreditCard className="h-3 w-3" /> QRIS Code
                        </h4>
                        <div className="relative group">
                           <div className="bg-black/60 border-2 border-teal/30 rounded-xl p-5 pr-14 font-mono text-[10px] break-all text-teal-400 selection:bg-teal/20">
                             {txDetail.qris_code}
                           </div>
                           <button 
                             onClick={() => copyText(txDetail.qris_code!, "QRIS String")}
                             className="absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-lg bg-teal text-white hover:bg-teal/90 transition-all shadow-lg"
                           >
                             <Copy className="h-3.5 w-3.5" />
                           </button>
                        </div>
                      </div>
                   )}

                   {/* TIMELINE SECTION */}
                   <div className="space-y-4 pb-12">
                      <h4 className="text-[10px] uppercase font-bold text-portal-text-dim tracking-widest flex items-center gap-2">
                        <Activity className="h-3 w-3" /> Event Timeline
                      </h4>
                      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-portal-border">
                         {txDetail.events.map((event, i) => (
                            <div key={event.id} className="relative">
                               <div className={`absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 border-portal-surface ${i === txDetail.events.length - 1 ? 'bg-teal animate-pulse scale-110 shadow-[0_0_8px_hsl(var(--teal)/0.5)]' : 'bg-portal-text-dim'}`} />
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-mono text-portal-text-dim uppercase tracking-tighter">
                                    {new Date(event.created_at).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                  <span className="text-xs font-semibold text-portal-text mt-0.5">
                                    {event.event_type.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* DRAWER FOOTER */}
                <div className="px-6 py-6 border-t border-portal-border bg-portal-elev/20 mt-auto flex items-center gap-3">
                   <Button variant="outline" className="flex-1 border-portal-border bg-portal-surface hover:bg-portal-elev text-xs h-10" onClick={() => copyText(txDetail.transaction_id, "ID")}>
                      <Copy className="h-3.5 w-3.5 mr-2" /> Copy Transaction ID
                   </Button>
                   <Button className="flex-1 bg-teal hover:bg-teal/90 text-white text-xs font-bold h-10 shadow-lg shadow-teal/10">
                      <ExternalLink className="h-3.5 w-3.5 mr-2" /> View JSON API
                   </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </PortalLayout>
  );
}

// Sub-components
function StatCard({ title, value, subtitle, color = "text-portal-text", isLoading = false }: any) {
  return (
    <PortalCard className="relative overflow-hidden group">
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
           <div className="h-3 bg-portal-elev rounded w-24" />
           <div className="h-8 bg-portal-elev rounded w-32" />
           <div className="h-3 bg-portal-elev rounded w-20" />
        </div>
      ) : (
        <>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-portal-text-dim">{title}</h4>
          <div className={`mt-2 text-3xl font-extrabold tracking-tight ${color}`}>{value}</div>
          <p className="mt-1 text-[11px] text-portal-text-muted font-medium">{subtitle}</p>
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
             <FileText className="h-24 w-24" />
          </div>
        </>
      )}
    </PortalCard>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string, color: string, pulse: boolean }> = {
    paid: { label: "Paid", color: "bg-teal text-white", pulse: false },
    pending_payment: { label: "Pending", color: "bg-amber-500 text-white", pulse: true },
    failed: { label: "Failed", color: "bg-red-500 text-white", pulse: false },
    expired: { label: "Expired", color: "bg-gray-500 text-white", pulse: false },
    expired_stale: { label: "Stale", color: "bg-orange-500 text-white", pulse: false },
  };

  const item = config[status] || { label: status, color: "bg-gray-500 text-white", pulse: false };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.color}`}>
      {item.pulse && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
      {!item.pulse && <div className="h-1.5 w-1.5 rounded-full bg-white/40" />}
      {item.label}
    </div>
  );
}

function VendorBadge({ code }: { code: string }) {
  const colors: Record<string, string> = {
    QOINHUB: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    MIDTRANS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    XENDIT: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  };
  
  return (
    <Badge variant="outline" className={`text-[10px] font-bold tracking-widest px-2 py-0 ${colors[code] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
      {code}
    </Badge>
  );
}

function DetailRow({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-portal-text-muted">{label}</span>
      <span className="text-portal-text font-medium text-right">{value}</span>
    </div>
  );
}
