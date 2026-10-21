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

type Order = { id?: string; order_reference?: string; customer_name?: string; customer_phone?: string; tracking_phone?: string; customer_email?: string; delivery_state?: string; delivery_area?: string; delivery_address?: string; payment_method?: string; payment_reference?: string; referral_code?: string; checkout_channel?: string; status?: string; payment_status?: string; total_ngn?: number; subtotal_ngn?: number; delivery_fee_ngn?: number; created_at?: string; items?: unknown };
type NavKey = "overview" | "orders" | "customers" | "affiliates" | "cashflow";
const navItems: { id: NavKey; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "orders", label: "Orders & fulfilment", icon: ClipboardList },
  { id: "customers", label: "Customers", icon: Users },
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
  const [resetMessage, setResetMessage] = useState("");
  const [archivedCount, setArchivedCount] = useState(0);
  const [dashboardNotice, setDashboardNotice] = useState("");
  const [page, setPage] = useState<NavKey>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [affiliates, setAffiliates] = useState<Record<string, unknown>[]>([]);
  const [conversions, setConversions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [customerQuery, setCustomerQuery] = useState("");
  const [affiliateQuery, setAffiliateQuery] = useState("");

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      if (active) { setSession(next); setChecking(false); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventReceived) return;
      if (error) setLoginError("Could not check your saved sign-in session. Please sign in again.");
      setSession(data.session);
      setChecking(false);
    }).catch(() => {
      if (active && !authEventReceived) { setSession(null); setChecking(false); setLoginError("Could not check your saved sign-in session. Please sign in again."); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
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
      const [o, f] = await Promise.all([api({ action: "list" }), api({ action: "affiliates" })]);
      setOrders(Array.isArray(o.orders) ? o.orders : []);
      setArchivedCount(Number(o.archived_count || 0));
      setAffiliates(Array.isArray(f.affiliates) ? f.affiliates : []);
      setConversions(Array.isArray(f.conversions) ? f.conversions : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load dashboard data.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (session) void refresh(); }, [session]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginError(""); setResetMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setLoginError(error.message);
    } catch {
      setLoginError("Sign-in could not reach the authentication service. Check your connection and try again.");
    }
  }

  async function sendPasswordReset() {
    setResetMessage(""); setLoginError("");
    if (!email.trim()) { setResetMessage("Enter your owner email address above first."); return; }
    setResetMessage("Sending secure password reset email…");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/ecuisine-foods-online-store/admin-accept-invite.html",
      });
      if (error) throw error;
      setResetMessage("If this email belongs to an eCuisine account, a password reset link has been sent. Check your inbox and spam folder.");
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : "Could not send a reset email. Please try again.");
    }
  }

  async function archiveDashboardData() {
    if (!window.confirm("Clear the active dashboard by archiving all order records? Nothing will be deleted. You can restore all archived orders later.")) return;
    setLoading(true); setDashboardNotice(""); setLoadError("");
    try {
      const result = await api({ action: "dashboard_archive_orders" });
      await refresh();
      setDashboardNotice(String(result.message || "Order records archived safely."));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not archive dashboard records.");
    } finally { setLoading(false); }
  }

  async function restoreDashboardData() {
    if (!window.confirm("Restore all archived order records to the active dashboard?")) return;
    setLoading(true); setDashboardNotice(""); setLoadError("");
    try {
      const result = await api({ action: "dashboard_restore_orders" });
      await refresh();
      setDashboardNotice(String(result.message || "Archived records restored."));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not restore archived records.");
    } finally { setLoading(false); }
  }

  async function signOut() { await supabase.auth.signOut(); setOrders([]); setAffiliates([]); setConversions([]); setLoadError(""); setArchivedCount(0); setDashboardNotice(""); }
  const paidOrders = orders.filter(o => o.payment_status === "paid");
  const inflow = paidOrders.reduce((sum, o) => sum + orderTotal(o), 0);
  const paidConversions = conversions.filter(c => c.status === "paid");
  const outflow = paidConversions.reduce((sum, c) => sum + Number(c.commission_amount_ngn || 0), 0);
  const outstanding = orders.filter(o => o.payment_status !== "paid" && o.status !== "cancelled").reduce((sum, o) => sum + orderTotal(o), 0);
  const completed = orders.filter(o => o.status === "delivered");
  const customerDirectory = useMemo(() => {
    const grouped = new Map<string, { key: string; name: string; phone: string; email: string; orders: Order[]; spend: number; latest?: string; locations: string[] }>();
    for (const order of orders) {
      const phone = String(order.customer_phone || order.tracking_phone || "").trim();
      const email = String(order.customer_email || "").trim().toLowerCase();
      const key = phone || email || String(order.customer_name || "unknown").trim().toLowerCase();
      if (!key || key === "unknown") continue;
      const existing = grouped.get(key) || { key, name: String(order.customer_name || "Customer"), phone, email, orders: [], spend: 0, latest: order.created_at, locations: [] };
      existing.orders.push(order);
      existing.spend += orderTotal(order);
      if (order.created_at && (!existing.latest || order.created_at > existing.latest)) existing.latest = order.created_at;
      if (order.delivery_address && !existing.locations.includes(order.delivery_address)) existing.locations.push(order.delivery_address);
      grouped.set(key, existing);
    }
    return [...grouped.values()].sort((a,b) => (b.latest || "").localeCompare(a.latest || ""));
  }, [orders]);
  const matchingCustomers = customerDirectory.filter(c => `${c.name} ${c.phone} ${c.email} ${c.locations.join(" ")}`.toLowerCase().includes(customerQuery.trim().toLowerCase()));
  const matchingAffiliates = affiliates.filter(a => `${a.display_name || ""} ${a.referral_code || ""} ${a.status || ""}`.toLowerCase().includes(affiliateQuery.trim().toLowerCase()));
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

  if (checking) return <div className="grid min-h-screen place-items-center text-forest-800"><LoaderCircle className="animate-spin" /> Checking your secure session…</div>;
  if (!session) return <main className="grid min-h-screen place-items-center px-4 py-12"><div className="w-full max-w-md rounded-3xl border border-forest-100 bg-white p-8 shadow-soft sm:p-10"><Brand /><div className="mt-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-gold-600">Owner workspace</p><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-900">Welcome back.</h1><p className="mt-2 text-sm leading-6 text-slate-500">Sign in with the authorised eCuisine store-owner account to access business information.</p></div><form className="mt-7 space-y-4" onSubmit={signIn}><label className="block text-sm font-semibold">Email address<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-forest-600" /></label><label className="block text-sm font-semibold">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-forest-600" /></label>{loginError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{loginError}</p>}<button className="w-full rounded-xl bg-forest-800 px-4 py-3.5 font-semibold text-white transition hover:bg-forest-700">Sign in securely</button></form><div className="mt-4"><button type="button" onClick={() => void sendPasswordReset()} className="text-sm font-semibold text-forest-700 hover:underline">Forgot password? Send me a reset link</button>{resetMessage && <p role="status" className="mt-2 rounded-xl bg-forest-50 p-3 text-sm leading-5 text-forest-800">{resetMessage}</p>}</div><p className="mt-6 flex items-start gap-2 text-xs leading-5 text-slate-400"><ShieldCheck size={16} className="mt-0.5 shrink-0" /> Dashboard data is requested through the existing owner-authorised Supabase API.</p><a className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-700" href="../admin.html">Open current dashboard <ExternalLink size={14} /></a></div></main>;

  return <div className="min-h-screen bg-[#f3f5f0] text-slate-800">
    {mobileNav && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-forest-950/40 md:hidden" onClick={() => setMobileNav(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-forest-100 bg-white transition-transform md:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[82px] items-center justify-between border-b border-slate-100 px-6"><Brand /><button className="rounded-lg p-2 text-slate-500 md:hidden" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="px-4 pt-7"><p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</p><nav className="mt-3 space-y-1">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setPage(item.id); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${page === item.id ? "bg-forest-800 text-white shadow-md shadow-forest-900/10" : "text-slate-500 hover:bg-forest-50 hover:text-forest-800"}`}><Icon size={18}/>{item.label}</button>; })}</nav></div>
      <div className="mt-auto p-4"><div className="rounded-2xl bg-cream p-4"><div className="flex items-center gap-2 text-sm font-bold text-forest-900"><CircleHelp size={17}/> Need a hand?</div><p className="mt-2 text-xs leading-5 text-slate-500">Keep payment and fulfilment records up to date to make your business figures more useful.</p><a href="https://wa.me/2348080942328" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest-700">Contact support <ExternalLink size={12}/></a></div><button onClick={signOut} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700"><LogOut size={17}/> Sign out</button></div>
    </aside>
    <div className="min-h-screen md:pl-[258px]">
      <header className="sticky top-0 z-20 flex min-h-[82px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10"><div className="flex items-center gap-3"><button className="rounded-xl border border-slate-200 p-2 md:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19}/></button><div><p className="text-xs font-medium text-slate-400">eCuisine Foods / <span className="text-forest-700">{navItems.find(n => n.id === page)?.label}</span></p><h1 className="mt-1 text-lg font-bold tracking-tight text-forest-900 sm:text-xl">{page === "overview" ? "Business overview" : navItems.find(n => n.id === page)?.label}</h1></div></div><div className="flex items-center gap-2 sm:gap-3"><span className="hidden items-center gap-2 rounded-full bg-forest-50 px-3 py-2 text-xs font-semibold text-forest-700 sm:inline-flex"><span className="h-2 w-2 rounded-full bg-emerald-500"/>{loadError ? "Needs attention" : loading ? "Updating data" : "Connected"}</span><button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/><span className="hidden sm:inline">Refresh</span></button></div></header>
      <main className="mx-auto max-w-[1450px] p-4 sm:p-7 lg:p-10">
        {dashboardNotice && <div role="status" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{dashboardNotice}</div>}
        {loadError && <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><Activity size={18} className="mt-0.5 shrink-0"/><div><p className="font-bold">Could not refresh all dashboard data</p><p className="mt-1">{loadError}</p><p className="mt-1 text-xs">The figures below may reflect the last successful refresh. Please retry before making payment decisions.</p></div></div>}
        {page === "overview" && <><div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Here is your store's latest recorded performance.</p><p className="mt-1 text-xs text-slate-400">Figures reflect the records returned by the existing owner API.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-forest-100 bg-white px-3 py-2 text-xs font-semibold text-forest-700"><BadgeCheck size={15}/> Private owner view</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Delivered sales value" value={naira(salesTotal)} hint={`${completed.length} delivered orders in loaded records`} icon={ShoppingBag}/><Metric label="Verified customer inflow" value={naira(inflow)} hint={`${paidOrders.length} orders marked paid`} icon={ArrowDownLeft}/><Metric label="Affiliate commission paid" value={naira(outflow)} hint={`${paidConversions.length} ledger entries marked paid`} icon={ArrowUpRight}/><Metric label="Awaiting payment" value={naira(outstanding)} hint="Not counted as money received" icon={WalletCards}/></div><div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]"><section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-forest-900">Sales performance</h2><p className="mt-1 text-sm text-slate-500">Delivered order value by month · last six months</p></div><span className="rounded-lg bg-forest-50 px-3 py-2 text-xs font-bold text-forest-700">NGN</span></div><div className="mt-6 h-[260px] w-full">{chartData.some(d => d.sales > 0) ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2c6948" stopOpacity={0.18}/><stop offset="95%" stopColor="#2c6948" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#edf1eb" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#849087", fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#849087", fontSize: 11 }} tickFormatter={v => v >= 1000 ? `₦${Math.round(v / 1000)}k` : String(v)} width={48}/><Tooltip formatter={v => naira(Number(v))} contentStyle={{ borderRadius: 12, borderColor: "#e2e9e2", fontSize: 12 }}/><Area type="monotone" dataKey="sales" stroke="#286143" strokeWidth={2.5} fill="url(#salesFill)" activeDot={{ r: 5, strokeWidth: 0 }}/></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-5 text-center text-sm text-slate-500">No delivered sales are available in the loaded records for this period.</div>}</div><p className="mt-4 text-xs leading-5 text-slate-400">This chart uses the latest orders returned by the API, not a complete historical accounting export.</p></section><section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><h2 className="font-bold text-forest-900">Quick business checks</h2><p className="mt-1 text-sm text-slate-500">A snapshot of loaded records</p><div className="mt-5 space-y-4"><QuickCheck icon={ClipboardList} label="Orders loaded" value={String(orders.length)} detail="Owner API result"/><QuickCheck icon={Users} label="Affiliate partners" value={String(affiliates.length)} detail="Registered partner profiles"/><QuickCheck icon={Boxes} label="Orders needing attention" value={String(orders.filter(o => !["delivered","cancelled"].includes(String(o.status))).length)} detail="Not delivered or cancelled"/><QuickCheck icon={ShieldCheck} label="Paid order records" value={String(paidOrders.length)} detail="Payment status marked paid"/></div><button onClick={() => setPage("orders")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-4 py-3 text-sm font-bold text-white hover:bg-forest-700">Review orders <ChevronDown size={16} className="-rotate-90"/></button></section></div><section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-forest-900">Recent orders</h2><p className="mt-1 text-sm text-slate-500">Latest orders returned by the owner API</p></div><button onClick={() => setPage("orders")} className="text-sm font-bold text-forest-700 hover:underline">View all</button></div><OrderTable orders={orders.slice(0, 5)} /></section></>}
        {page === "orders" && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="font-bold text-forest-900">Orders & fulfilment</h2><p className="mt-1 text-sm text-slate-500">Search and filter active records. Archived records remain saved and can be restored.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void archiveDashboardData()} disabled={loading || !orders.length} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50">Clear dashboard data (archive)</button>{archivedCount > 0 && <button type="button" onClick={() => void restoreDashboardData()} disabled={loading} className="rounded-xl border border-forest-200 bg-forest-50 px-3 py-2 text-xs font-bold text-forest-800 disabled:opacity-50">Restore archived records ({archivedCount})</button>}</div></div><span className="w-fit rounded-full bg-forest-50 px-3 py-2 text-xs font-bold text-forest-700">{orders.filter(o => (orderStatus === "all" || o.status === orderStatus) && `${o.order_reference || ""} ${o.status || ""} ${o.payment_status || ""}`.toLowerCase().includes(orderQuery.trim().toLowerCase())).length} active orders</span></div><div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><label className="block text-xs font-bold text-slate-500">Search orders<input value={orderQuery} onChange={e => setOrderQuery(e.target.value)} placeholder="Order reference or status…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-forest-600" /></label><label className="block text-xs font-bold text-slate-500">Filter by fulfilment status<select value={orderStatus} onChange={e => setOrderStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-forest-600"><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="preparing">Preparing</option><option value="out_for_delivery">Out for delivery</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label></div><OrderTable orders={orders.filter(o => (orderStatus === "all" || o.status === orderStatus) && `${o.order_reference || ""} ${o.status || ""} ${o.payment_status || ""}`.toLowerCase().includes(orderQuery.trim().toLowerCase()))}/><a className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest-800 px-4 py-3 text-sm font-bold text-white" href="../admin.html">Open full order controls <ExternalLink size={15}/></a></section>}
        {page === "customers" && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="font-bold text-forest-900">Customer directory</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Search customer contact and delivery details, review order history, and export a working CSV for customer service. Access is restricted to the authorised owner account.</p></div><button onClick={() => exportCustomers(matchingCustomers)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-forest-800 px-4 py-3 text-sm font-bold text-white hover:bg-forest-700"><ExternalLink size={15}/> Export CSV</button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Unique customers" value={String(customerDirectory.length)} hint="Identified by phone/email in loaded orders" icon={Users}/><Metric label="Orders in directory" value={String(orders.length)} hint="Latest records returned by owner API" icon={ClipboardList}/><Metric label="Recorded order value" value={naira(customerDirectory.reduce((n,c)=>n+c.spend,0))} hint="Not the same as verified revenue" icon={ShoppingBag}/></div><label className="mt-6 block text-xs font-bold text-slate-500">Search customers<input value={customerQuery} onChange={e=>setCustomerQuery(e.target.value)} placeholder="Name, phone, email or delivery address…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-forest-600"/></label><p className="mt-3 text-xs leading-5 text-slate-400">Privacy note: customer details are sensitive. Export only when needed for legitimate store operations, and keep the file secure. Directory coverage is limited to the latest records returned by the current API.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Customer</th><th className="pb-3">Contact</th><th className="pb-3">Latest delivery address</th><th className="pb-3">Orders</th><th className="pb-3">Recorded value</th><th className="pb-3">Latest order</th></tr></thead><tbody>{matchingCustomers.map(c=><tr key={c.key} className="border-t border-slate-100 align-top"><td className="py-4 font-semibold text-forest-900">{c.name}<div className="mt-1 text-xs font-normal text-slate-400">{c.orders.map(o=>o.order_reference).filter(Boolean).slice(0,3).join(", ") || "No reference"}</div></td><td className="py-4"><div>{c.phone || "No phone recorded"}</div><div className="mt-1 text-xs text-slate-500">{c.email || "No email recorded"}</div>{c.phone && <a className="mt-2 inline-block text-xs font-bold text-forest-700 hover:underline" href={"https://wa.me/"+c.phone.replace(/[^0-9]/g,"")} target="_blank" rel="noreferrer">Message on WhatsApp</a>}</td><td className="max-w-[260px] whitespace-normal py-4 text-slate-600">{c.locations[c.locations.length-1] || "No address recorded"}</td><td className="py-4">{c.orders.length}</td><td className="py-4 font-bold">{naira(c.spend)}</td><td className="py-4 text-slate-500">{formatDate(c.latest)}</td></tr>)}{!matchingCustomers.length && <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No customers match this search in the loaded order records.</td></tr>}</tbody></table></div><div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">For a complete lifetime CRM, the owner API must support paginated order history or a dedicated customer table. This view groups all customer details currently returned by the API (latest 5,000 orders), so it does not claim to include every historical customer if older orders exist.</div></section>}
        {page === "affiliates" && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7"><h2 className="font-bold text-forest-900">Affiliate growth centre</h2><p className="mt-1 text-sm text-slate-500">Monitor partner performance, commission liabilities and attributed orders. Use the existing management controls for status changes and payouts.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Partners" value={String(affiliates.length)} hint="Loaded partner profiles" icon={Users}/><Metric label="Pending commission" value={naira(sumField(affiliates, "pending_ngn"))} hint="Not yet payable" icon={Activity}/><Metric label="Payable commission" value={naira(sumField(affiliates, "payable_ngn"))} hint="Check eligibility before payout" icon={WalletCards}/><Metric label="Paid commission" value={naira(outflow)} hint="Ledger entries marked paid" icon={BadgeCheck}/></div><label className="mt-6 block text-xs font-bold text-slate-500">Search affiliates<input value={affiliateQuery} onChange={e=>setAffiliateQuery(e.target.value)} placeholder="Partner name, referral code or status…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-forest-600"/></label><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-50 px-3 py-2 font-bold text-emerald-800">{affiliates.filter(a=>a.status==="active").length} active</span><span className="rounded-full bg-amber-50 px-3 py-2 font-bold text-amber-800">{affiliates.filter(a=>a.status==="suspended").length} suspended</span><span className="rounded-full bg-red-50 px-3 py-2 font-bold text-red-800">{affiliates.filter(a=>a.status==="banned").length} banned</span><span className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-700">{conversions.length} conversion records loaded</span></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Affiliate</th><th className="pb-3">Referral code</th><th className="pb-3">Status</th><th className="pb-3">Orders</th><th className="pb-3">Payable</th></tr></thead><tbody>{matchingAffiliates.slice().sort((a,b)=>Number(b.payable_ngn||0)-Number(a.payable_ngn||0)).map((a,i)=><tr key={String(a.user_id || i)} className="border-t border-slate-100"><td className="py-4 font-semibold">{String(a.display_name || "Affiliate")}</td><td className="py-4">{String(a.referral_code || "—")}</td><td className="py-4"><span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-bold text-forest-700">{String(a.status || "unknown")}</span></td><td className="py-4">{String(a.orders ?? "—")}</td><td className="py-4 font-semibold">{naira(Number(a.payable_ngn || 0))}</td></tr>)}</tbody></table></div><div className="mt-8 border-t border-slate-100 pt-6"><h3 className="font-bold text-forest-900">Recent affiliate conversions</h3><p className="mt-1 text-sm text-slate-500">Commission status is shown as recorded in the ledger; verify payment before treating it as paid.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Order</th><th className="pb-3">Commission</th><th className="pb-3">Status</th><th className="pb-3">Recorded</th></tr></thead><tbody>{conversions.slice(0, 25).map((c, i) => <tr key={String(c.id || i)} className="border-t border-slate-100"><td className="py-3 font-semibold">{String(c.order_reference || (c.orders as Record<string, unknown> | undefined)?.order_reference || c.order_id || "Order")}</td><td className="py-3">{naira(Number(c.commission_amount_ngn || 0))}</td><td className="py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{String(c.status || "unknown")}</span></td><td className="py-3 text-slate-500">{formatDate(String(c.created_at || ""))}</td></tr>)}{!conversions.length && <tr><td colSpan={4} className="py-7 text-center text-sm text-slate-400">No affiliate conversion records were returned.</td></tr>}</tbody></table></div></div><a className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest-800 px-4 py-3 text-sm font-bold text-white" href="../admin.html">Open affiliate management controls <ExternalLink size={15}/></a></section>}
        {page === "cashflow" && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Verified customer inflow" value={naira(inflow)} hint="Orders marked paid" icon={ArrowDownLeft}/><Metric label="Affiliate commission outflow" value={naira(outflow)} hint="Commissions marked paid" icon={ArrowUpRight}/><Metric label="Unpaid / unverified orders" value={naira(outstanding)} hint="Not counted as cash received" icon={WalletCards}/><Metric label="Net of recorded flows" value={naira(inflow-outflow)} hint="Not full business profit" icon={Activity}/></div><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><p className="font-bold">Important accounting limitation</p><p className="mt-1">These figures only cover the latest order records returned by the API and loaded commission records. They exclude supplier costs, operating expenses, refunds, taxes, and other cash movements. They are not a full profit-and-loss statement.</p></div></>}
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row"><span>eCuisine Foods · Good Food, Better Living</span><span>Private owner workspace · verify records before payout</span></footer>
      </main>
    </div>
  </div>;
}

function exportCustomers(rows: { name: string; phone: string; email: string; orders: Order[]; spend: number; latest?: string; locations: string[] }[]) {
  const quote = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
  const csv = [["Customer","Phone","Email","Orders in loaded records","Order value (NGN)","Latest order","Delivery addresses","Order references"].map(quote).join(","), ...rows.map(c => [c.name,c.phone,c.email,c.orders.length,c.spend,c.latest || "",c.locations.join(" | "),c.orders.map(o => o.order_reference || o.id || "").join(" | ")].map(quote).join(","))].join("\\r\\n");
  const blob = new Blob(["\\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "ecuisine-customer-directory.csv"; a.click(); URL.revokeObjectURL(url);
}
function Brand() { return <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-800 text-white"><Leaf size={23}/></div><div><p className="font-display text-xl font-bold tracking-tight text-forest-900">eCuisine Foods</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.2em] text-gold-600">Good Food, Better Living</p></div></div>; }
function Metric({label,value,hint,icon:Icon}:{label:string;value:string;hint:string;icon:typeof BarChart3}) { return <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft"><div className="absolute inset-y-0 left-0 w-[3px] bg-gold-500"/><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold leading-5 text-slate-500">{label}</p><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><Icon size={18}/></span></div><p className="mt-3 break-words text-2xl font-bold tracking-tight text-forest-900">{value}</p><p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p></div>; }
function QuickCheck({icon:Icon,label,value,detail}:{icon:typeof BarChart3;label:string;value:string;detail:string}) { return <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><Icon size={18}/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">{label}</p><p className="mt-0.5 text-xs text-slate-400">{detail}</p></div><strong className="text-lg text-forest-900">{value}</strong></div>; }
function OrderTable({orders}:{orders:Order[]}) { return <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Order</th><th className="pb-3">Date</th><th className="pb-3">Status</th><th className="pb-3">Payment</th><th className="pb-3 text-right">Value</th></tr></thead><tbody>{orders.map((o,i)=><tr key={String(o.id || o.order_reference || i)} className="border-t border-slate-100"><td className="py-4 font-semibold text-forest-800">{String(o.order_reference || o.id || "Order")}</td><td className="py-4 text-slate-500">{formatDate(o.created_at)}</td><td className="py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{String(o.status || "unknown").replace(/_/g," ")}</span></td><td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{String(o.payment_status || "unverified").replace(/_/g," ")}</span></td><td className="py-4 text-right font-bold">{naira(orderTotal(o))}</td></tr>)}{!orders.length && <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No order records were returned.</td></tr>}</tbody></table></div>; }
function sumField(rows:Record<string,unknown>[], key:string) { return rows.reduce((sum,row)=>sum+Number(row[key]||0),0); }
