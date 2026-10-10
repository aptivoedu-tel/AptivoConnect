"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Atom, BadgeCheck, BookOpen, Clock, Dna, FlaskConical, Heart, Search, Sparkles, Star, Users, X } from "lucide-react";
import { demoProducts, demoSellers, demoTests, type DemoProduct, type DemoSeller, type DemoTest } from "./demoFixtures";

type Viewer = { id: string; name?: string; role: string };
type Props = { viewer?: Viewer | null; demoOnly?: boolean };
type Product = DemoProduct & { isDemo?: boolean };
type Attempt = { id: string; title: string; score: number; total: number; date: string };
type Tab = "discover" | "library" | "studio" | "review";
type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

const storageKey = "aptivo-connect-demo-v1";
const exams = ["All exams", "MDCAT", "ECAT", "NUMS"];
const subjects = ["All subjects", "Biology", "Physics", "Chemistry", "Study skills"];
const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const tealButton = `${button} bg-teal-600 text-white hover:bg-teal-700 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50`;
const quietButton = `${button} border border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700 focus-visible:outline-teal-600`;

function subjectIcon(subject: string, className: string) {
  if (subject === "Biology") return <Dna className={className} />;
  if (subject === "Physics") return <Atom className={className} />;
  if (subject === "Chemistry") return <FlaskConical className={className} />;
  return <BookOpen className={className} />;
}

function readDemo<T>(key: string, fallback: T): T {
  try { const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}"); return parsed[key] ?? fallback; }
  catch { return fallback; }
}
function saveDemo(key: string, value: unknown) {
  try { const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}"); localStorage.setItem(storageKey, JSON.stringify({ ...parsed, [key]: value })); }
  catch { /* Demo progress is optional when browser storage is unavailable. */ }
}
function getList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>)[key])) return (data as Record<string, T[]>)[key];
  return [];
}
function humanError(error: unknown) {
  return error instanceof Error ? error.message : "We could not load this section. Please try again.";
}

function Modal({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#042F2E]/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={onClose}>
    <div className="mx-auto my-4 max-w-4xl sm:my-8" onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>;
}

function DemoQuiz({ test, onClose, onComplete }: { test: DemoTest; onClose: () => void; onComplete: (attempt: Attempt) => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => test.questions.map(() => null));
  const [seconds, setSeconds] = useState(test.minutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const current = test.questions[index];
  const complete = answers.filter((a) => a !== null).length;
  const score = answers.reduce<number>((total, answer, i) => total + (answer === test.questions[i].answer ? 1 : 0), 0);

  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);
  useEffect(() => { if (seconds === 0 && !submitted) submit(); }, [seconds, submitted]);

  function submit() {
    if (submitted) return;
    setSubmitted(true);
    const attempt = { id: `${test.id}-${startedAt}`, title: test.title, score, total: test.questions.length, date: new Date().toISOString() };
    onComplete(attempt);
  }

  return <Modal labelledBy="quiz-title" onClose={onClose}>
    <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/10">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-8">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-600">Free demo practice</p><h2 id="quiz-title" className="mt-1 text-lg font-bold text-slate-900">{test.title}</h2></div>
        <button className={`${quietButton} !px-3`} onClick={onClose} aria-label="Close practice test"><X className="h-4 w-4" />Close</button>
      </header>
      {!submitted ? <div className="grid md:grid-cols-[1fr_220px]">
        <main className="p-5 sm:p-8">
          <div className="mb-5 flex items-center justify-between text-sm text-slate-500"><span>Question {index + 1} of {test.questions.length}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold tabular-nums text-slate-800"><Clock className="h-3.5 w-3.5 text-teal-600" />{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span></div>
          <div className="mb-7 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all" style={{ width: `${((index + 1) / test.questions.length) * 100}%` }} /></div>
          <h3 className="text-xl font-semibold leading-8 text-slate-900">{current.prompt}</h3>
          <fieldset className="mt-6 space-y-3"><legend className="sr-only">Choose one answer</legend>{current.options.map((option, i) => <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${answers[index] === i ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-slate-200 hover:border-teal-300"}`}><input type="radio" name={`question-${index}`} checked={answers[index] === i} onChange={() => setAnswers((old) => old.map((value, n) => n === index ? i : value))} className="accent-teal-600" /><span className="text-sm leading-6 text-slate-700">{option}</span></label>)}</fieldset>
          <div className="mt-8 flex items-center justify-between"><button className={quietButton} disabled={!index} onClick={() => setIndex((i) => i - 1)}>Previous</button><button className={tealButton} onClick={() => index === test.questions.length - 1 ? submit() : setIndex((i) => i + 1)}>{index === test.questions.length - 1 ? "Finish test" : "Next question"}</button></div>
        </main>
        <aside className="border-t border-slate-100 bg-slate-50 p-5 md:border-l md:border-t-0"><p className="text-sm font-bold text-slate-800">Question map</p><div className="mt-4 grid grid-cols-5 gap-2 md:grid-cols-4">{test.questions.map((_, i) => <button key={i} onClick={() => setIndex(i)} aria-label={`Go to question ${i + 1}`} className={`h-10 rounded-lg text-sm font-semibold transition ${index === i ? "bg-teal-600 text-white" : answers[i] !== null ? "bg-teal-100 text-teal-900" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-teal-300"}`}>{i + 1}</button>)}</div><p className="mt-5 text-xs leading-5 text-slate-500">{complete} of {test.questions.length} answered. Your answers stay in this browser only.</p></aside>
      </div> : <main className="p-5 sm:p-8">
        <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-6 ring-1 ring-teal-100"><p className="text-sm font-semibold text-teal-700">Demo test complete</p><div className="mt-1 flex flex-wrap items-end gap-2"><h3 className="text-4xl font-bold tracking-tight text-slate-900">{score}<span className="text-2xl text-slate-400">/{test.questions.length}</span></h3><p className="pb-1 text-sm text-slate-600">{Math.round(score / test.questions.length * 100)}% correct</p></div><p className="mt-2 text-sm text-slate-600">This result is stored in this browser only. No account or database was changed.</p></div>
        <div className="mt-5 flex flex-wrap gap-3"><button className={tealButton} onClick={() => setShowReview((v) => !v)}>{showReview ? "Hide explanations" : "Review answers & explanations"}</button><button className={quietButton} onClick={onClose}>Back to Connect</button></div>
        {showReview && <div className="mt-6 space-y-4">{test.questions.map((question, i) => <article key={i} className="rounded-2xl border border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Question {i + 1} · {answers[i] === question.answer ? <span className="text-emerald-600">Correct</span> : <span className="text-rose-600">Review</span>}</p><h4 className="mt-2 font-semibold leading-6 text-slate-900">{question.prompt}</h4><p className="mt-2 text-sm text-slate-600">Your answer: {answers[i] === null ? "Not answered" : question.options[answers[i]!]}</p><p className="mt-1 text-sm font-medium text-teal-700">Correct: {question.options[question.answer]}</p><p className="mt-3 text-sm leading-6 text-slate-600">{question.explanation}</p></article>)}</div>}
      </main>}
    </div>
  </Modal>;
}

function sellerOf(product: Product): DemoSeller | null {
  return product.sellerId ? demoSellers.find((s) => s.id === product.sellerId) ?? null : null;
}

function ProductCard({ product, onOpen, saved, onSave, onOpenSeller }: { product: Product; onOpen: () => void; saved: boolean; onSave: () => void; onOpenSeller?: () => void }) {
  return <article className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
    <div className="flex items-start justify-between gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-sm">{subjectIcon(product.subject, "h-5 w-5")}</div>
      <div className="flex items-center gap-1.5">
        {product.isDemo && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Demo</span>}
        <button onClick={onSave} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-teal-50 hover:text-teal-600" aria-label={saved ? "Remove bookmark" : "Save item"}>{saved ? <Heart className="h-4 w-4 fill-teal-600 text-teal-600" /> : <Heart className="h-4 w-4" />}</button>
      </div>
    </div>
    <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{product.exam} · {product.subject}</p>
    <h3 className="mt-1 text-[15px] font-bold leading-5 text-slate-900 group-hover:text-teal-700">{product.title}</h3>
    <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-slate-500">{product.description}</p>
    <div className="mt-3 flex flex-wrap gap-1.5">{product.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-medium text-slate-500">{tag}</span>)}</div>
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-4">
      <div className="min-w-0">
        {onOpenSeller ? <button onClick={onOpenSeller} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline-offset-2 hover:underline"><BadgeCheck className="h-3.5 w-3.5" />{product.creator}</button> : <p className="truncate text-xs text-slate-500">{product.isDemo ? "Demo creator" : product.creator}</p>}
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /><span className="font-semibold text-slate-600">{product.rating.toFixed(1)}</span>· {product.downloads.toLocaleString()} learners</p>
      </div>
      <button className={`${quietButton} !px-3 !py-2 !text-xs`} onClick={onOpen}>Explore</button>
    </div>
  </article>;
}

export default function ConnectPage({ viewer, demoOnly = false }: Props) {
  const [tab, setTab] = useState<Tab>("discover");
  const [products, setProducts] = useState<Product[]>(demoProducts.map((p) => ({ ...p, isDemo: true })));
  const [search, setSearch] = useState("");
  const [exam, setExam] = useState("All exams");
  const [subject, setSubject] = useState("All subjects");
  const [selected, setSelected] = useState<Product | null>(null);
  const [seller, setSeller] = useState<DemoSeller | null>(null);
  const [quiz, setQuiz] = useState<DemoTest | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [remoteLibrary, setRemoteLibrary] = useState<unknown[]>([]);
  const [studioData, setStudioData] = useState<unknown>(null);
  const [moderationData, setModerationData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [creatorBio, setCreatorBio] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftSubject, setDraftSubject] = useState("Biology");

  const isAdmin = viewer?.role === "super_admin";
  const canStudio = Boolean(viewer && viewer.role === "student");
  const isDemo = demoOnly;

  useEffect(() => {
    setSaved(readDemo("saved", []));
    setAttempts(readDemo("attempts", []));
  }, []);

  const load = useCallback(async (section: "catalog" | "library" | "studio" | "moderation") => {
    if (isDemo) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/connect?action=${section}`, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
      const body = await response.json() as ApiEnvelope<unknown>;
      if (!response.ok || !body.ok) throw new Error(body.ok ? `Request failed (${response.status})` : body.error);
      if (section === "catalog") {
        const rows = getList<Record<string, unknown>>(body.data, "products");
        const live = rows.map((row) => ({
          id: String(row.id ?? row._id ?? ""), title: String(row.title ?? "Untitled resource"), exam: String(row.exam ?? "MDCAT"),
          subject: String(row.subject ?? row.type ?? "Study skills"), kind: row.kind === "Study guide" ? "Study guide" as const : "Practice test" as const,
          description: String(row.description ?? "Creator resource"), creator: String(row.creatorName ?? row.creator_name ?? "Connect creator"),
          rating: Number(row.rating ?? 0), downloads: Number(row.downloads ?? 0), tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
          isDemo: false,
        }));
        setProducts([...live, ...demoProducts.map((p) => ({ ...p, isDemo: true }))]);
      } else if (section === "library") setRemoteLibrary(getList(body.data, "items"));
      else if (section === "studio") setStudioData(body.data);
      else setModerationData(getList(body.data, "queue"));
    } catch (e) { setError(humanError(e)); }
    finally { setLoading(false); }
  }, [isDemo]);

  useEffect(() => { if (viewer && !isDemo) void load("catalog"); }, [viewer, isDemo, load]);
  useEffect(() => { if (!isDemo && viewer && tab !== "discover" && tab !== "review") void load(tab); }, [tab, viewer, isDemo, load]);

  const filtered = useMemo(() => products.filter((p) => {
    const text = `${p.title} ${p.description} ${p.subject} ${p.creator}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (exam === "All exams" || p.exam === exam) && (subject === "All subjects" || p.subject === subject);
  }), [products, search, exam, subject]);

  function toggleSaved(id: string) { setSaved((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]; saveDemo("saved", next); return next; }); }
  function completeAttempt(attempt: Attempt) { setAttempts((current) => { const next = [attempt, ...current].slice(0, 30); saveDemo("attempts", next); return next; }); }
  async function post(action: string, payload: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/connect", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const body = await response.json() as ApiEnvelope<unknown>;
      if (!response.ok || !body.ok) throw new Error(body.ok ? `Request failed (${response.status})` : body.error);
      setNotice("Saved. Your request was sent securely.");
      await load(tab === "studio" ? "studio" : "moderation");
      return true;
    } catch (e) { setError(humanError(e)); return false; }
    finally { setBusy(false); }
  }

  function nav(tabKey: Tab, label: string) { return <button key={tabKey} onClick={() => { setTab(tabKey); setError(""); setNotice(""); }} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === tabKey ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"}`}>{label}</button>; }

  return <div className="mx-auto max-w-7xl space-y-8 pb-16">
    <section className="relative overflow-hidden rounded-[2rem] bg-[#042F2E] p-6 text-white shadow-xl sm:p-10 lg:p-12">
      <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-1/3 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute right-24 top-1/2 h-40 w-40 rounded-full border-[28px] border-white/5" />
      <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-50"><Sparkles className="h-3.5 w-3.5 text-emerald-300" /> APTIVO CONNECT <span className="text-white/40">/</span> STUDENT MARKETPLACE</div>
          <h1 className="mt-6 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl sm:leading-[1.12]">Your next good study session <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">starts here.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-teal-50/80 sm:text-base">Explore focused practice and study resources made for Pakistan's entrance exams. Start with free demos, then keep your learning in one place.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#catalog" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/30 transition hover:bg-teal-500">Explore resources <Search className="h-4 w-4" /></a>
            {canStudio ? <button onClick={() => { setTab("studio"); setError(""); setNotice(""); window.setTimeout(() => document.getElementById("creator")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-teal-50 transition hover:bg-white/10">Become a creator <Sparkles className="h-4 w-4" /></button> : <a href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-teal-50 transition hover:bg-white/10">Become a creator <Sparkles className="h-4 w-4" /></a>}
          </div>
        </div>
        <div className="hidden rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur sm:block">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal-200">Start free</p>
          <p className="mt-3 text-2xl font-bold text-white">3 practice sets</p>
          <p className="mt-1 text-sm text-teal-50/70">Original demo questions<br />with full explanations</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-teal-100/80"><Users className="h-4 w-4" />One browser-only preview, no account needed</div>
        </div>
      </div>
    </section>

    <div className="sticky top-[5.5rem] z-30 mx-auto flex w-fit flex-wrap items-center gap-1 rounded-full bg-white/95 p-1 shadow-sm ring-1 ring-slate-200 backdrop-blur" aria-label="Connect sections">{nav("discover", "Discover")}{nav("library", "My library")}{canStudio && nav("studio", "Creator studio")}{isAdmin && nav("review", "Review queue")}</div>

    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-slate-500">{filtered.length} resources in this preview · demos are clearly marked</p>
      <div className="text-right">{viewer ? <><p className="text-xs text-slate-500">Signed in as</p><p className="text-sm font-semibold text-slate-800">{viewer.name || "Aptivo student"}</p></> : <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:inline">Browse the free demo collection</span><a href="/login" className="text-sm font-semibold text-teal-700 hover:text-teal-900">Sign in</a></div>}</div>
    </div>

    {isDemo && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><Sparkles className="mt-1 h-4 w-4 shrink-0 text-amber-600" /><p><strong>Preview mode.</strong> This demo uses original sample content and browser-only progress. Sign in to use the live Connect marketplace. No account, payment or database changes happen here.</p></div>}
    {!viewer && !isDemo && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-900">You can explore the free demo resources below. <a className="font-bold underline underline-offset-2" href="/login">Sign in</a> to open your library or creator tools.</div>}

    {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900" role="alert"><p>{error}</p><button className="font-bold underline" onClick={() => void load(tab === "discover" ? "catalog" : tab === "review" ? "moderation" : tab)}>Retry</button></div>}
    {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-900">{notice}</div>}

    {tab === "discover" && <section id="catalog" className="scroll-mt-28 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-600">Thoughtful prep, one resource at a time</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Find your next focus</h2><p className="mt-2 text-sm text-slate-500">Browse by exam or subject. Demo materials are clearly marked.</p></div>
        {loading && <span className="text-sm text-slate-500" role="status">Updating catalog…</span>}
      </div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_190px_190px]">
        <label className="relative block"><span className="sr-only">Search resources</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search biology, practice, creators…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
        <label className="text-xs font-semibold text-slate-500"><span className="sr-only">Filter by exam</span><select value={exam} onChange={(e) => setExam(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-500">{exams.map((e) => <option key={e}>{e}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-500"><span className="sr-only">Filter by subject</span><select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-500">{subjects.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((product) => <ProductCard key={product.id} product={product} onOpen={() => setSelected(product)} saved={saved.includes(product.id)} onSave={() => toggleSaved(product.id)} onOpenSeller={sellerOf(product) ? () => setSeller(sellerOf(product)) : undefined} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold text-slate-800">No resources match those filters.</p><button className="mt-3 text-sm font-bold text-teal-700 hover:text-teal-900" onClick={() => { setSearch(""); setExam("All exams"); setSubject("All subjects"); }}>Clear filters</button></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-5 py-4"><p className="text-sm text-slate-500">All resources here are free to explore. Payments are not available.</p><p className="text-xs font-medium text-slate-400">Demo creator resources are sample content, not user-verified listings.</p></div>
    </section>}

    {tab === "library" && <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-600">Your learning shelf</p><h2 className="mt-2 text-2xl font-bold text-slate-900">My library</h2><p className="mt-2 text-sm text-slate-500">Saved resources and demo results from this browser.</p></div><div className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Saved resources <span className="ml-1 text-sm font-medium text-slate-400">{saved.length}</span></h3>{saved.length ? <ul className="mt-4 divide-y divide-slate-100">{saved.map((id) => { const p = products.find((item) => item.id === id); return p ? <li key={id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-slate-800">{p.title}</p><p className="mt-1 text-xs text-slate-500">{p.isDemo ? "Demo creator" : p.creator}</p></div><button className="text-xs font-bold text-teal-700 hover:text-teal-900" onClick={() => setSelected(p)}>Open</button></li> : null; })}</ul> : <p className="mt-4 rounded-xl bg-[#F8FAFC] p-4 text-sm text-slate-500">Tap the heart on a resource to save it for later.</p>}</div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Practice history <span className="ml-1 text-sm font-medium text-slate-400">{attempts.length}</span></h3>{attempts.length ? <ul className="mt-4 divide-y divide-slate-100">{attempts.map((attempt) => <li key={attempt.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-slate-800">{attempt.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(attempt.date).toLocaleDateString()}</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-900">{attempt.score}/{attempt.total}</span></li>)}</ul> : <p className="mt-4 rounded-xl bg-[#F8FAFC] p-4 text-sm text-slate-500">Complete a free demo practice set to see a result here.</p>}<p className="mt-4 text-xs leading-5 text-slate-400">Demo progress is kept in this browser only and can be cleared through your browser storage settings.</p></div></div>{!isDemo && <RemoteList title="Purchased library" rows={remoteLibrary}/>}</section>}

    {tab === "studio" && canStudio && <section id="creator" className="scroll-mt-28 space-y-6"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-600">Share what helped you</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Creator studio</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Apply as a student creator, then submit resources for review. Creator status is reviewed by Aptivo; submitting does not publish a resource.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 text-sm font-bold text-white">1</span><div><p className="text-sm font-bold text-slate-800">Apply as a creator</p><p className="mt-0.5 text-xs leading-5 text-slate-500">A short profile review — display name and what you teach.</p></div></div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 text-sm font-bold text-white">2</span><div><p className="text-sm font-bold text-slate-800">Submit resources</p><p className="mt-0.5 text-xs leading-5 text-slate-500">Practice sets and guides go straight to the review queue.</p></div></div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 text-sm font-bold text-white">3</span><div><p className="text-sm font-bold text-slate-800">Aptivo reviews</p><p className="mt-0.5 text-xs leading-5 text-slate-500">An admin approves content before students ever see it.</p></div></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2"><form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={async (e) => { e.preventDefault(); const ok = await post("creatorApply", { displayName: creatorName, bio: creatorBio }); if (ok) { setCreatorName(""); setCreatorBio(""); } }}><div><h3 className="font-bold text-slate-900">Creator application</h3><p className="mt-1 text-sm text-slate-500">Tell us what you want to help students learn.</p></div><label className="block text-sm font-semibold text-slate-700">Display name<input required maxLength={80} value={creatorName} onChange={(e) => setCreatorName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-500" placeholder="How students will know you"/></label><label className="block text-sm font-semibold text-slate-700">Short introduction<textarea required maxLength={700} rows={4} value={creatorBio} onChange={(e) => setCreatorBio(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-500" placeholder="Your subject strengths and experience"/></label><button disabled={busy} className={tealButton}>{busy ? "Sending…" : "Submit application"}</button></form><form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={async (e) => { e.preventDefault(); const ok = await post("productSubmit", { title: draftTitle, description: draftDescription, subject: draftSubject }); if (ok) { setDraftTitle(""); setDraftDescription(""); } }}><div><h3 className="font-bold text-slate-900">Submit a resource</h3><p className="mt-1 text-sm text-slate-500">The full resource builder is opening soon, so submissions are reviewed before they are accepted. No payments or publishing happen here.</p></div><label className="block text-sm font-semibold text-slate-700">Resource title<input required maxLength={120} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-500"/></label><label className="block text-sm font-semibold text-slate-700">Subject<select value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal-500">{subjects.slice(1).map((s) => <option key={s}>{s}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Description<textarea required maxLength={1500} rows={3} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-500"/></label><button disabled={busy} className={quietButton}>{busy ? "Sending…" : "Submit for review"}</button></form></div><div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">Creator applications and resource submissions are not proof of verification. No real financial actions are available in Connect.</div><RemoteList title="Your current submissions" rows={Array.isArray(studioData) ? studioData : getList(studioData, "items")}/></section>}

    {tab === "review" && isAdmin && <section className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-600">Admin review</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Submission queue</h2><p className="mt-2 text-sm text-slate-500">Approve only content that has completed the platform's review process.</p></div>{moderationData.length ? <div className="space-y-3">{moderationData.map((item, i) => { const row = item as Record<string, unknown>; const id = String(row.id ?? row._id ?? ""); return <article key={id || i} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="font-bold text-slate-900">{String(row.title ?? row.displayName ?? "Review item")}</p><p className="mt-1 text-sm text-slate-500">{String(row.type ?? row.status ?? "Awaiting review")} · {String(row.creatorName ?? row.creator_name ?? "Creator")}</p></div><button disabled={busy || !id} className={tealButton} onClick={() => void post("adminApprove", { itemId: id })}>{busy ? "Working…" : "Approve"}</button></article>; })}</div> : <EmptyState title={loading ? "Loading review queue…" : "No items are waiting for review."} detail="When creator applications or resources need review, they will appear here."/>}</section>}

    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#042F2E] via-teal-900 to-teal-700 p-6 text-white shadow-lg sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-400/15 blur-2xl" />
      <div className="relative"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Made for focused progress</p><h2 className="mt-2 text-xl font-bold text-white">Good preparation is built one clear step at a time.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-teal-100/80">Try an original demo set, see your explanations, and decide what you want to practice next.</p></div>
      <a href="#catalog" className="relative mt-4 inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-teal-900 transition hover:bg-teal-50 sm:mt-0">Browse demos <Search className="ml-2 h-4 w-4" /></a>
    </section>

    {selected && <ProductDetail product={selected} onClose={() => setSelected(null)} onStart={(id) => { const test = demoTests.find((item) => item.id === id); if (test) { setSelected(null); setQuiz(test); } }} onOpenSeller={sellerOf(selected) ? () => { setSeller(sellerOf(selected)); setSelected(null); } : undefined} />}
    {seller && <SellerDetail seller={seller} products={products.filter((p) => p.sellerId === seller.id)} onClose={() => setSeller(null)} onOpenProduct={(p) => { setSeller(null); setSelected(p); }} />}
    {quiz && <DemoQuiz test={quiz} onClose={() => setQuiz(null)} onComplete={completeAttempt} />}
  </div>;
}

function RemoteList({ title, rows }: { title: string; rows: unknown[] }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">{title}</h3>{rows.length ? <ul className="mt-3 divide-y divide-slate-100">{rows.map((item, i) => { const row = item as Record<string, unknown>; return <li className="py-3 text-sm" key={String(row.id ?? row._id ?? i)}><p className="font-semibold text-slate-800">{String(row.title ?? row.displayName ?? "Connect item")}</p><p className="mt-1 text-xs text-slate-500">{String(row.status ?? row.state ?? "Active")}</p></li>; })}</ul> : <p className="mt-3 text-sm text-slate-500">Nothing to show yet. Your demo saves stay in this browser.</p>}</div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold text-slate-800">{title}</p><p className="mt-2 text-sm text-slate-500">{detail}</p></div>; }

function SellerDetail({ seller, products, onClose, onOpenProduct }: { seller: DemoSeller; products: Product[]; onClose: () => void; onOpenProduct: (product: Product) => void }) {
  const avg = products.length ? products.reduce((total, p) => total + p.rating, 0) / products.length : 0;
  const learners = products.reduce((total, p) => total + p.downloads, 0);
  return <Modal labelledBy="seller-title" onClose={onClose}>
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/10">
      <div className="relative bg-gradient-to-br from-[#042F2E] via-teal-900 to-teal-700 p-6 text-white sm:p-8">
        <div className="flex items-center justify-between"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">Demo seller · sample content</span><button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close seller profile"><X className="h-5 w-5" /></button></div>
        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 to-emerald-300 text-xl font-bold text-teal-950 shadow-lg">{seller.initials}</div>
          <div><h2 id="seller-title" className="text-2xl font-bold text-white sm:text-3xl">{seller.name}</h2><p className="mt-1 text-sm text-teal-100">{seller.tagline}</p></div>
        </div>
        <div className="mt-5 grid max-w-sm grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 px-2 py-3 backdrop-blur"><p className="flex items-center justify-center gap-1 text-lg font-bold text-white"><Star className="h-4 w-4 fill-amber-300 text-amber-300" />{avg.toFixed(1)}</p><p className="mt-0.5 text-[11px] uppercase tracking-wide text-teal-100/80">avg rating</p></div>
          <div className="rounded-xl bg-white/10 px-2 py-3 backdrop-blur"><p className="text-lg font-bold text-white">{products.length}</p><p className="mt-0.5 text-[11px] uppercase tracking-wide text-teal-100/80">resources</p></div>
          <div className="rounded-xl bg-white/10 px-2 py-3 backdrop-blur"><p className="text-lg font-bold text-white">{learners.toLocaleString()}</p><p className="mt-0.5 text-[11px] uppercase tracking-wide text-teal-100/80">learners</p></div>
        </div>
      </div>
      <div className="space-y-5 p-6 sm:p-8">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700"><BadgeCheck className="h-4 w-4" />{seller.credential}</p>
        <p className="text-sm leading-7 text-slate-600">{seller.bio}</p>
        <div><h3 className="text-sm font-bold uppercase tracking-[.14em] text-teal-700">Catalog in this preview</h3><ul className="mt-3 divide-y divide-slate-100">{products.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 text-white">{subjectIcon(p.subject, "h-4 w-4")}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{p.title}</p><p className="mt-0.5 text-xs text-slate-500">{p.exam} · {p.subject} · {p.kind}</p></div></div><button className={`${quietButton} !px-3 !py-2 !text-xs`} onClick={() => onOpenProduct(p)}>Open</button></li>)}</ul></div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Sample seller.</strong> Sara Khan is fictional demo content showing how creator profiles will look. She is not a real, verified Connect seller, and no purchases, payouts or account changes exist in this preview.</p>
      </div>
    </div>
  </Modal>;
}

function ProductDetail({ product, onClose, onStart, onOpenSeller }: { product: Product; onClose: () => void; onStart: (testId?: string) => void; onOpenSeller?: () => void }) {
  return <Modal labelledBy="product-title" onClose={onClose}>
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/10">
      <div className="relative bg-gradient-to-br from-[#042F2E] via-teal-900 to-teal-700 p-6 text-white sm:p-8">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">{product.isDemo ? "Demo resource" : product.kind}</span>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close details"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-7 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 to-emerald-300 text-teal-950 shadow-lg">{subjectIcon(product.subject, "h-6 w-6")}</div>
          <div><p className="text-sm text-teal-100">{product.exam} · {product.subject}</p><h2 id="product-title" className="mt-1 text-2xl font-bold text-white sm:text-3xl">{product.title}</h2></div>
        </div>
        <p className="mt-3 text-sm text-teal-50/90">by {product.isDemo ? "Demo creator · Aptivo sample content" : product.creator}{onOpenSeller && <> · <button onClick={onOpenSeller} className="font-semibold underline underline-offset-2 hover:text-white">View seller profile</button></>}</p>
      </div>
      <div className="space-y-6 p-6 sm:p-8">
        <p className="text-sm leading-7 text-slate-600">{product.description}</p>
        <div className="grid grid-cols-3 gap-3">{product.tags.map((tag) => <div key={tag} className="rounded-xl bg-[#F8FAFC] p-3 text-center text-xs font-semibold text-slate-600">{tag}</div>)}</div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div><p className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{product.rating.toFixed(1)} rating</p><p className="mt-1 text-xs text-slate-500">{product.downloads.toLocaleString()} learners practicing with this</p></div>
          {product.testId && <button className={tealButton} onClick={() => onStart(product.testId)}>Start free demo</button>}
        </div>
        <p className="rounded-xl bg-[#F8FAFC] p-4 text-xs leading-5 text-slate-500">Free preview · no payment, download or account change happens from this screen.</p>
      </div>
    </div>
  </Modal>;
}
