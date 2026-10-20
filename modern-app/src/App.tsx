import { useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import {
  Activity, ArrowDownLeft, ArrowUpRight, BadgeCheck, BarChart3, Boxes,
  ChevronDown, CircleHelp, ClipboardList, ExternalLink, Leaf, LoaderCircle,
  LogOut, Menu, RefreshCw, ShieldCheck, ShoppingBag, Users, WalletCards, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const SUPABASE_URL = "https://zsepwkequzwwuxtrpmmy.supabase.co";
const SUPABASE_KEY = "sb_publishable_iTpErW44DA3l6Sz22MSgAw_fQ4xaQKC";
const ADMIN_API = SUPABASE_URL + "/functions/v1/ecuisine-admin";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

type Order = { id?: string; order_number?: string; status?: string; payment_status?: string; total_ngn?: number; subtotal_ngn?: number; delivery_fee_ngn?: number; created_at?: string; items?: unknown };
type Analytics = Record<string, unknown>;
type NavKey = "overview" | "orders" | "affiliates" | "cashflow";
const navItems: { id: NavKey; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "orders", label: "Orders & fulfilment", icon: ClipboardList },
  { id: "affiliates", label: "Affiliates", icon: Users },
  { id: "cashflow", label: "Cash flow", icon: WalletCards },
];
const naira = (n: number) => "₦" + Math.round(n || 0).toLocaleString("en-NG");
const orderTotal = (o: Order) => Number(o.total_ngn ?? (Number(o.subtotal_ngn || 0) + Number(o.delivery_fee_ngn || 0)));
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "—";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState<NavKey>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [affiliates, setAffiliates] = useState<Record<string, unknown>[]>([]);
  const [conversions, setConversions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function api(body: Record<string, unknown>) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("Your session has expired. Please sign in again.");
    const response = await fetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + data.session.access_token },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The dashboard request failed.");
    return payload;
  }

  async function refresh() {
    setLoading(true); setLoadError("");
    try {
      const [o, a, f] = await Promise.all([api({ action: "list" }), api({ action: "analytics" }), api({ action: "affiliates" })]);
      setOrders(Array.isArray(o.orders) ? o.orders : []);
      setAnalytics(a.analytics || null);
      setAffiliates(Array.isArray(f.affiliates) ? f.affiliates : []);
      setConversions(Array.isArray(f.conversions) ? f.conversions : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load dashboard data.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (session) void refresh(); }, [session]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setLoginError(error.message);
  }

  async function signOut() { await supabase.auth.signOut(); setOrders([]); setAnalytics(null); }
  const paidOrders = orders.filter(o => o.payment_status === "paid");
  const inflow = paidOrders.reduce((sum, o) => sum + orderTotal(o), 0);
  const paidConversions = conversions.filter(c => c.status === "paid");
  const outflow = paidConversions.reduce((sum, c) => sum + Number(c.commission_amount_ngn || 0), 0);
  const outstanding = orders.filter(o => o.payment_status !== "paid" && o.status !== "cancelled").reduce((sum, o) => sum + orderTotal(o), 0);
  const completed = orders.filter(o => o.status === "delivered");
  const salesTotal = completed.reduce((sum, o) => sum + orderTotal(o), 0);
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      const sales = completed.filter(o => o.created_at?.slice(0, 7) === key).reduce((sum, o) => sum + orderTotal(o), 0);
      return { month: date.toLocaleDateString("en-NG", { month: "short" }), sales };
    });
  }, [orders]);
  const productStats = (analytics?.best_sellers ?? analytics?.bestSellers ?? []) as { name?: string; product_name?: string; units?: number; quantity?: number; sales?: number }[];

  if (checking) return <div className="grid min-h-screen place-items-center text-forest-800"><LoaderCircle className="animate-spin" /> Checking your secure session…</div>;
  if (!session) return <main className="grid min-h-screen place-items-center px-4 py-12"><div className="w-full max-w-md rounded-3xl border border-forest-100 bg-white p-8 shadow-soft sm:p-10"><Brand /><div className="mt-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-gold-600">Owner workspace</p><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-900">Welcome back.</h1><p className="mt-2 text-sm leading-6 text-slate-500">Sign in with the authorised eCuisine store-owner account to access business information.</p></div><form className="mt-7 space-y-4" onSubmit={signIn}><label className="block text-sm font-semibold">Email address<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-forest-600" /></label><label className="block text-sm font-semibold">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-forest-600" /></label>{loginError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{loginError}</p>}<button className="w-full rounded-xl bg-forest-800 px-4 py-3.5 font-semibold text-white transition hover:bg-forest-700">Sign in securely</button></form><p className="mt-6 flex items-start gap-2 text-xs leading-5 text-slate-400"><ShieldCheck size={16} className="mt-0.5 shrink-0" /> Dashboard data is requested through the existing owner-authorised Supabase API.</p><a className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-700" href="../admin.html">Open current dashboard <ExternalLink size={14} /></a></div></main>;

  return <div className="min-h-screen bg-[#f3f5f0] text-slate-800">
    {mobileNav && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-forest-950/40 md:hidden" onClick={() => setMobileNav(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-forest-100 bg-white transition-transform md:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[82px] items-center justify-between border-b border-slate-100 px-6"><Brand /><button className="rounded-lg p-2 text-slate-500 md:hidden" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="px-4 pt-7"><p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</p><nav className="mt-3 space-y-1">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setPage(item.id); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${page === item.id ? "bg-forest-800 text-white shadow-md shadow-forest-900/10" : "text-slate-500 hover:bg-forest-50 hover:text-forest-800"}`}><Icon size={18}/>{item.label}</button>; })}</nav></div>
      <div className="mt-auto p-4"><div className="rounded-2xl bg-cream p-4"><div className="flex items-center gap-2 text-sm font-bold text-forest-900"><CircleHelp size={17}/> Need a hand?</div><p className="mt-2 text-xs leading-5 text-slate-500">Keep payment and fulfilment records up to date to make your business figures more useful.</p><a href="https://wa.me/2348080942328" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest-700">Contact support <ExternalLink size={12}/></a></div><button onClick={signOut} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700"><LogOut size={17}/> Sign out</button></div>
    </aside>
    <div className="min-h-screen md:pl-[258px]">
      <header className="sticky top-0 z-20 flex min-h-[82px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10"><div className="flex items-center gap-3"><button className="rounded-xl border border-slate-200 p-2 md:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19}/></button><div><p className="text-xs font-medium text-slate-400">eCuisine Foods / <span className="text-forest-700">{navItems.find(n => n.id === page)?.label}</span></p><h1 className="mt-1 text-lg font-bold tracking-tight text-forest-900 sm:text-xl">{page === "overview" ? "Business overview" : navItems.find(n => n.id === page)?.label}</h1></div></div><div className="flex items-center gap-2 sm:gap-3"><span className="hidden items-center gap-2 rounded-full bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-700 sm:inline-flex"><span className="h-2 w-2 rounded-full bg-emerald-500"/>{loading ? "Updating data" : "Connected"}</span><button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/><span className="hidden sm:inline">Refresh</span></button></div></header>
      <main className="mx-auto max-w-[1450px] p-4 sm:p-7 lg:p-10">
        {loadError && <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><Activity size={18} className="mt-0.5 shrink-0"/><div><p className="font-bold">Could not refresh all dashboard data</p><p className="mt-1">{loadError}</p><p className="mt-1 text-xs">The figures below may reflect the last successful refresh. Please retry before making payment decisions.</p></div></div>}
        {page === "overview" && <><div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Here is your store's latest recorded performance.</p><p className="mt-1 text-xs text-slate-400">Figures reflect the records returned by the existing owner API.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-forest-100 bg-white px-3 py-2 text-xs font-semibold text-forest-700"><BadgeCheck size={15}/> Private owner view</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Delivered sales value" value={naira(salesTotal)} hint={`${completed.length} delivered orders in loaded records`} icon={ShoppingBag}/><Metric label="Verified customer inflow" value={naira(inflow)} hint={`${paidOrders.length} orders marked paid`} icon={ArrowDownLeft}/><Metric label="Affiliate commission paid" value={naira(outflow)} hint={`${paidConversions.length} ledger entries marked paid`} icon={ArrowUpRight}/><Metric label="Awaiting payment" value={naira(outstanding)} hint="Not counted as money received" icon={WalletCards}/></div><div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]"><section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-forest-900">Sales performance</h2><p className="mt-1 text-sm text-slate-500">Delivered order value by month · last six months</p></div><span className="rounded-lg bg-forest-50 px-3 py-2 text-xs font-bold text-forest-700">NGN</span></div><div className="mt-6 h-[260px] w-full">{chartData.some(d => d.sales > 0) ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2c6948" stopOpacity={0.18}/><stop offset="95%" stopColor="#2c6948" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#edf1eb" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#849087", fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#849087", fontSize: 11 }} tickFormatter={v => v >= 1000 ? `₦${Math.round(v / 1000)}k` : String(v)} width={48}/><Tooltip formatter={v => naira(Number(v))} contentStyle={{ borderRadius: 12, borderColor: "#e2e9e2", fontSize: 12 }}/><Area type="monotone" dataKey="sales" stroke="#286143" strokeWidth={2.5} fill="url(#salesFill)" activeDot={{ r: 5, strokeWidth: 0 }}/></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-5 text-center text-sm text-slate-500">No delivered sales are available in the loaded records for this period.</div>}</div><p className="mt-4 text-xs leading-5 text-slate-400">This chart uses the latest orders returned by the API, not a complete historical accounting export.</p></section><section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><h2 className="font-bold text-forest-900">Quick business checks</h2><p className="mt-1 text-sm text-slate-500">A snapshot of loaded records</p><div className="mt-5 space-y-4"><QuickCheck icon={ClipboardList} label="Orders loaded" value={String(orders.length)} detail="Owner API result"/><QuickCheck icon={Users} label="Affiliate partners" value={String(affiliates.length)} detail="Registered partner profiles"/><QuickCheck icon={Boxes} label="Orders needing attention" value={String(orders.filter(o => !["delivered","cancelled"].includes(String(o.status))).length)} detail="Not delivered or cancelled"/><QuickCheck icon={ShieldCheck} label="Paid order records" value={String(paidOrders.length)} detail="Payment status marked paid"/></div><button onClick={() => setPage("orders")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-4 py-3 text-sm font-bold text-white hover:bg-forest-700">Review orders <ChevronDown size={16} className="-rotate-90"/></button></section></div><section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-forest-900">Recent orders</h2><p className="mt-1 text-sm text-slate-500">Latest orders returned by the owner API</p></div><button onClick={() => setPage("orders")} className="text-sm font-bold text-forest-700 hover:underline">View all</button></div><OrderTable orders={orders.slice(0, 5)} /></section></>}
        {page === "orders" && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><h2 className="font-bold text-forest-900">Orders & fulfilment</h2><p className="mt-1 text-sm text-slate-500">This first React pass is read-only. Use the current dashboard to change fulfilment or payment status.</p><OrderTable orders={orders}/><a className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest-800 px-4 py-3 text-sm font-bold text-white" href="../admin.html">Open full order controls <ExternalLink size={15}/></a></section>}
        {page === "affiliates" && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><h2 className="font-bold text-forest-900">Affiliate programme</h2><p className="mt-1 text-sm text-slate-500">Read-only view of affiliate balances from the current owner API. Use the legacy controls to change partner status or record payouts.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Partners" value={String(affiliates.length)} hint="Loaded partner profiles" icon={Users}/><Metric label="Pending commission" value={naira(sumField(affiliates, "pending_ngn"))} hint="Not yet payable" icon={Activity}/><Metric label="Payable commission" value={naira(sumField(affiliates, "payable_ngn"))} hint="Check eligibility before payout" icon={WalletCards}/><Metric label="Paid commission" value={naira(outflow)} hint="Ledger entries marked paid" icon={BadgeCheck}/></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Affiliate</th><th className="pb-3">Referral code</th><th className="pb-3">Status</th><th className="pb-3">Orders</th><th className="pb-3">Payable</th></tr></thead><tbody>{affiliates.map((a,i)=><tr key={String(a.user_id || i)} className="border-t border-slate-100"><td className="py-4 font-semibold">{String(a.display_name || "Affiliate")}</td><td className="py-4">{String(a.referral_code || "—")}</td><td className="py-4"><span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-bold text-forest-700">{String(a.status || "unknown")}</span></td><td className="py-4">{String(a.orders ?? "—")}</td><td className="py-4 font-semibold">{naira(Number(a.payable_ngn || 0))}</td></tr>)}</tbody></table></div><a className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest-800 px-4 py-3 text-sm font-bold text-white" href="../admin.html">Open affiliate management controls <ExternalLink size={15}/></a></section>}
        {page === "cashflow" && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Verified customer inflow" value={naira(inflow)} hint="Orders marked paid" icon={ArrowDownLeft}/><Metric label="Affiliate commission outflow" value={naira(outflow)} hint="Commissions marked paid" icon={ArrowUpRight}/><Metric label="Unpaid / unverified orders" value={naira(outstanding)} hint="Not counted as cash received" icon={WalletCards}/><Metric label="Net of recorded flows" value={naira(inflow-outflow)} hint="Not full business profit" icon={Activity}/></div><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><p className="font-bold">Important accounting limitation</p><p className="mt-1">These figures only cover the latest order records returned by the API and loaded commission records. They exclude supplier costs, operating expenses, refunds, taxes, and other cash movements. They are not a full profit-and-loss statement.</p></div></>}
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row"><span>eCuisine Foods · Good Food, Better Living</span><span>Private owner workspace · verify records before payout</span></footer>
      </main>
    </div>
  </div>;
}

function Brand() { return <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-800 text-white"><Leaf size={23}/></div><div><p className="font-display text-xl font-bold tracking-tight text-forest-900">eCuisine Foods</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.2em] text-gold-600">Good Food, Better Living</p></div></div>; }
function Metric({label,value,hint,icon:Icon}:{label:string;value:string;hint:string;icon:typeof BarChart3}) { return <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft"><div className="absolute inset-y-0 left-0 w-[3px] bg-gold-500"/><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold leading-5 text-slate-500">{label}</p><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><Icon size={18}/></span></div><p className="mt-3 break-words text-2xl font-bold tracking-tight text-forest-900">{value}</p><p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p></div>; }
function QuickCheck({icon:Icon,label,value,detail}:{icon:typeof BarChart3;label:string;value:string;detail:string}) { return <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><Icon size={18}/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">{label}</p><p className="mt-0.5 text-xs text-slate-400">{detail}</p></div><strong className="text-lg text-forest-900">{value}</strong></div>; }
function OrderTable({orders}:{orders:Order[]}) { return <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Order</th><th className="pb-3">Date</th><th className="pb-3">Status</th><th className="pb-3">Payment</th><th className="pb-3 text-right">Value</th></tr></thead><tbody>{orders.map((o,i)=><tr key={String(o.id || o.order_number || i)} className="border-t border-slate-100"><td className="py-4 font-semibold text-forest-800">{String(o.order_number || o.id || "Order")}</td><td className="py-4 text-slate-500">{formatDate(o.created_at)}</td><td className="py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{String(o.status || "unknown").replaceAll("_"," ")}</span></td><td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{String(o.payment_status || "unverified").replaceAll("_"," ")}</span></td><td className="py-4 text-right font-bold">{naira(orderTotal(o))}</td></tr>)}{!orders.length && <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No order records were returned.</td></tr>}</tbody></table></div>; }
function sumField(rows:Record<string,unknown>[], key:string) { return rows.reduce((sum,row)=>sum+Number(row[key]||0),0); }
