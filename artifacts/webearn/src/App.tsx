import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useAcceptProposal, useApproveProject, useCreateProject, useCreateProposal,
  useCreateReview, useGetAdminOverview, useGetCurrentUser, useGetDashboard,
  useGetProject, useGetPublicProfile, useGetWorkspace, useListAdminPayments,
  useListAdminProjects, useListAdminUsers, useListDisputes, useListMessages,
  useListProjectProposals, useListProjects, useListUserReviews, useOpenDispute,
  useRequestRevision, useResolveDispute, useSaveCurrentProfile, useSendMessage,
  useSubmitProject, useUpdateMilestone, useUpdateProject,
  getGetAdminOverviewQueryKey, getGetCurrentUserQueryKey, getGetDashboardQueryKey, getGetProjectQueryKey,
  getGetWorkspaceQueryKey,
  getListDisputesQueryKey, getListMessagesQueryKey,
  getListProjectProposalsQueryKey, getListProjectsQueryKey,
  getListUserReviewsQueryKey,
} from '@workspace/api-client-react';
import type { Project, Proposal } from '@workspace/api-client-react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Banknote,
  BriefcaseBusiness, Check, CheckCircle2, CircleHelp, Clock3,
  Compass, ExternalLink, FileText, Filter, Globe2, LayoutDashboard, LockKeyhole,
  LogOut, Menu, MessageCircle, Plus, Search, Send, ShieldCheck, Sparkles,
  Star, Users, X, Zap,
} from 'lucide-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path; }
if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#167b91', colorForeground: '#193749', colorMutedForeground: '#66808c',
    colorDanger: '#c4403c', colorBackground: '#ffffff', colorInput: '#f5fafb',
    colorInputForeground: '#193749', colorNeutral: '#d3e1e4', fontFamily: 'DM Sans',
    borderRadius: '0.85rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center', cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#193749] font-bold', headerSubtitle: 'text-[#66808c]',
    socialButtonsBlockButtonText: 'text-[#193749] font-semibold', formFieldLabel: 'text-[#284b5b] font-semibold',
    footerActionLink: 'text-[#167b91] font-semibold', footerActionText: 'text-[#66808c]',
    dividerText: 'text-[#66808c]', identityPreviewEditButton: 'text-[#167b91]',
    formFieldSuccessText: 'text-[#18786e]', alertText: 'text-[#193749]', logoBox: 'rounded-xl',
    logoImage: 'rounded-xl', socialButtonsBlockButton: 'border-[#d3e1e4] bg-white',
    formButtonPrimary: 'bg-[#167b91] hover:bg-[#106879] text-white shadow-none',
    formFieldInput: 'bg-[#f5fafb] border-[#d3e1e4] text-[#193749]',
    footerAction: 'border-t border-[#e7eff0]', dividerLine: 'bg-[#d3e1e4]', alert: 'bg-[#fff6ed]',
    otpCodeFieldInput: 'border-[#d3e1e4]', formFieldRow: 'gap-2', main: 'gap-5',
  },
};

function ClerkCacheReset() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previousUser.current !== undefined && previousUser.current !== id) client.clear();
    previousUser.current = id;
  }), [addListener, client]);
  return null;
}

function Mark({ inverse = false }: { inverse?: boolean }) {
  return <span className={`inline-flex items-center gap-2.5 ${inverse ? 'text-white' : 'text-[#173e50]'}`}>
    <span className="grid size-9 place-items-center rounded-xl bg-[#1a8194] text-white shadow-sm"><span className="font-display text-lg font-extrabold">w</span></span>
    <span className="font-display text-[20px] font-extrabold tracking-[-.055em]">web<span className={inverse ? 'text-[#73d8c8]' : 'text-[#198d8d]'}>earn</span></span>
  </span>;
}

function Button({ children, onClick, href, variant = 'primary', type = 'button', disabled, className = '' }: {
  children: ReactNode; onClick?: () => void; href?: string; variant?: 'primary' | 'outline' | 'quiet' | 'light'; type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  const styles = {
    primary: 'bg-[#177c91] text-white hover:bg-[#116a7c] shadow-[0_5px_15px_rgba(20,105,124,.13)]',
    outline: 'border border-[#cbdde1] bg-white text-[#244756] hover:border-[#83b6bb] hover:bg-[#f3f9fa]',
    quiet: 'text-[#456473] hover:bg-[#eaf3f4]',
    light: 'bg-white text-[#145a67] hover:bg-[#e8fbf7]',
  }[variant];
  const cls = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${styles} ${className}`;
  if (href) return <Link href={href} className={cls} data-testid={`link-${href.replaceAll('/', '-').replace(/^-/, '')}`}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls} data-testid={`button-${String(children).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>{children}</button>;
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#52707d] transition-colors hover:bg-[#edf6f6] hover:text-[#176f7e]" data-testid={`nav-${href.replaceAll('/', '-').replace(/^-/, '')}`}>{children}</Link>;
}

function PublicNav() {
  return <header className="relative z-10 mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 md:px-10">
    <Link href="/" className="inline-flex" data-testid="link-brand-home"><Mark /></Link>
    <nav className="hidden items-center gap-1 md:flex"><a href="#how-it-works" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#52707d] hover:bg-white/70">How it works</a><Link href="/projects" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#52707d] hover:bg-white/70" data-testid="nav-find-work">Find work</Link><a href="#for-businesses" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#52707d] hover:bg-white/70">For businesses</a></nav>
    <div className="flex items-center gap-2"><Button href="/sign-in" variant="quiet" className="hidden sm:inline-flex">Sign in</Button><Button href="/sign-up">Get started <ArrowRight size={16} /></Button></div>
  </header>;
}

function Landing() {
  const { data: projects, isLoading, isError, refetch } = useListProjects({ sort: 'newest' });
  return <main className="grain min-h-[100dvh] overflow-hidden bg-[#f4f9f8]">
    <div className="relative bg-[radial-gradient(ellipse_at_75%_30%,rgba(169,224,218,.42),transparent_42%),linear-gradient(115deg,#edf7f7_0%,#f6faf9_58%,#e8f4f1_100%)]">
      <PublicNav />
      <section className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-20 pt-12 md:grid-cols-[1.04fr_.96fr] md:px-10 md:pb-28 md:pt-16">
        <div className="page-enter max-w-[660px]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c4e0dc] bg-white/70 px-3.5 py-2 text-xs font-bold tracking-wide text-[#286a72]"><span className="size-2 rounded-full bg-[#54b8a9]" /> GOOD WORK, AT A FAIR PRICE</div>
          <h1 className="font-display text-[clamp(3.2rem,7vw,6.5rem)] font-extrabold leading-[.98] tracking-[-.075em] text-[#163e50]">A better web.<br /><span className="text-[#198d8d]">Built together.</span></h1>
          <p className="mt-7 max-w-[520px] text-lg leading-8 text-[#52707d]">Small businesses get a website they can afford. Students get paid experience that belongs in their portfolio. Everyone gets a fair start.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Button href="/sign-up">Post a project <ArrowRight size={16} /></Button><Button href="/projects" variant="outline">Explore projects</Button></div>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#d7e7e5] pt-6 text-sm font-medium text-[#55727c]"><span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-[#278d82]" /> Clear milestones</span><span className="inline-flex items-center gap-2"><Banknote size={17} className="text-[#278d82]" /> Fair, upfront budgets</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[580px] page-enter [animation-delay:120ms]">
          <div className="absolute -right-8 top-3 size-48 rounded-full bg-[#b9e4dc]/60 blur-[2px]" />
          <div className="absolute -bottom-8 -left-2 h-40 w-40 rounded-full bg-[#c9e1ee]/75" />
          <div className="relative rounded-[2rem] border border-[#d7e8e6] bg-white/75 p-4 shadow-[0_25px_80px_rgba(34,89,97,.12)] backdrop-blur md:rotate-[1deg]">
            <div className="rounded-[1.5rem] bg-[#173f50] p-5 text-white md:p-7">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold"><Globe2 size={17} className="text-[#72d7c5]" /> Project match</span><span className="rounded-full bg-[#285969] px-3 py-1 text-xs font-semibold text-[#aee5dc]">New opportunity</span></div>
              <div className="mt-9 rounded-2xl bg-[#ecf7f5] p-5 text-[#183e4d]">
                <div className="flex items-start justify-between gap-4"><div><span className="text-xs font-bold uppercase tracking-[.16em] text-[#52858a]">Local business · Portland</span><h2 className="font-display mt-2 text-2xl font-extrabold tracking-tight">A home for Juniper &amp; Grain</h2></div><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d9efeb] text-[#287975]"><Sparkles size={21} /></span></div>
                <p className="mt-3 text-sm leading-6 text-[#5a727b]">A welcoming five-page site for a neighborhood bakery ready to grow online.</p>
                <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#45616d]">Small business</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#45616d]">5 pages</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#45616d]">WordPress</span></div>
                <div className="mt-6 flex items-center justify-between border-t border-[#dce9e6] pt-4"><span className="text-sm text-[#69818a]">Project budget</span><strong className="font-display text-xl text-[#176f72]">$650–$900</strong></div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.07] p-3">
                <div className="grid size-10 place-items-center rounded-full bg-[#71cabc] font-bold text-[#174d55]">AM</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">Avery is interested</p><p className="mt-0.5 text-xs text-[#adced0]">Web design student · 4.9 rating</p></div><span className="rounded-lg bg-[#56b8a8] px-3 py-2 text-xs font-bold text-[#153e49]">View profile</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <section className="mx-auto grid max-w-[1280px] gap-4 px-5 py-9 md:grid-cols-3 md:px-10">
      {[['01', 'A real brief', 'Business owners share the project, budget, and what success looks like.'], ['02', 'A fair match', 'Students send a clear proposal. Owners choose the right fit, not the loudest pitch.'], ['03', 'Work with confidence', 'Milestones keep the work clear, with feedback and payment protection along the way.']].map(([n, title, text]) => <article key={n} className="flex gap-4 rounded-2xl border border-[#deebea] bg-white/75 p-5"><span className="font-display text-sm font-extrabold text-[#258989]">{n}</span><div><h3 className="font-display font-bold text-[#234957]">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[#67808a]">{text}</p></div></article>)}
    </section>
    <section id="how-it-works" className="mx-auto max-w-[1280px] px-5 py-14 md:px-10 md:py-20">
      <div className="grid gap-10 rounded-[2rem] bg-[#e4f1ef] p-7 md:grid-cols-[.85fr_1.15fr] md:p-12">
        <div><span className="text-xs font-extrabold uppercase tracking-[.18em] text-[#287c7e]">A marketplace with people in mind</span><h2 className="font-display mt-4 text-4xl font-extrabold leading-tight tracking-[-.055em] text-[#183e50]">Good projects.<br />No guesswork.</h2><p className="mt-5 max-w-sm leading-7 text-[#56737d]">WebEarn brings owners and emerging talent together around practical work, honest expectations, and visible progress.</p><Button href="/projects" className="mt-7">See open projects <ArrowRight size={16} /></Button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5"><span className="grid size-10 place-items-center rounded-xl bg-[#e2f2ef] text-[#1b817d]"><BriefcaseBusiness size={20} /></span><h3 className="font-display mt-5 font-bold text-[#254d59]">For business owners</h3><p className="mt-2 text-sm leading-6 text-[#66808a]">Post what you need in plain language. Compare proposals, keep scope clear, and work with a real person.</p></div>
          <div className="rounded-2xl bg-[#17485a] p-5 text-white sm:translate-y-8"><span className="grid size-10 place-items-center rounded-xl bg-[#286577] text-[#8be0ce]"><Zap size={20} /></span><h3 className="font-display mt-5 font-bold">For student creators</h3><p className="mt-2 text-sm leading-6 text-[#c0d8d8]">Build more than a class project. Get paid, get feedback, and share work that makes your next opportunity easier to find.</p></div>
        </div>
      </div>
    </section>
    <section id="for-businesses" className="mx-auto max-w-[1280px] px-5 py-12 md:px-10 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><span className="text-xs font-extrabold uppercase tracking-[.18em] text-[#287c7e]">A few good briefs</span><h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.05em] text-[#183e50]">Work worth making</h2></div><Button href="/projects" variant="outline">Browse all work <ArrowRight size={16} /></Button></div>
      {isLoading ? <SkeletonRows /> : isError ? <ErrorState retry={() => refetch()} /> : !projects?.length ? <EmptyState title="The next great brief could be yours" text="New project opportunities will appear here. Take a look around and be ready when one lands." /> :
        <div className="mt-7 grid gap-4 md:grid-cols-3">{projects.slice(0, 3).map((p) => <ProjectCard key={p.id} project={p} />)}</div>}
    </section>
    <section className="px-5 pb-20 pt-8 md:px-10"><div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-7 rounded-[2rem] bg-[#163e50] p-7 text-white md:flex-row md:items-center md:p-11"><div><span className="text-xs font-bold uppercase tracking-[.18em] text-[#77d6c7]">Make the next move</span><h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.045em] md:text-4xl">A good match starts with a conversation.</h2><p className="mt-3 text-[#bed6d8]">Join a marketplace built for real work and real people.</p></div><Button href="/sign-up" variant="light">Create your free account <ArrowRight size={16} /></Button></div></section>
    <Footer />
  </main>;
}

function Footer() {
  return <footer className="border-t border-[#dce9e7] px-5 py-8 md:px-10"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 text-sm text-[#69808a] md:flex-row md:items-center"><Mark /><span>Fair work makes a stronger web.</span><div className="flex gap-4"><Link href="/projects" className="hover:text-[#177c91]">Explore projects</Link><Link href="/sign-in" className="hover:text-[#177c91]">Sign in</Link></div></div></footer>;
}

function PrivateShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useClerk();
  const { data: me } = useGetCurrentUser();
  const admin = me?.role === 'admin';
  const items: Array<[string, string, typeof LayoutDashboard]> = [
    ['/dashboard', 'Overview', LayoutDashboard],
    ['/projects', me?.role === 'business' ? 'My briefs' : 'Find projects', Compass],
    ...(admin ? [['/admin', 'Moderation', ShieldCheck] as [string, string, typeof ShieldCheck]] : []),
  ];
  return <Show when="signed-in"><div className="min-h-[100dvh] bg-[#f2f7f6] md:flex">
    <aside className={`fixed inset-y-0 left-0 z-30 w-[258px] border-r border-white/10 bg-[#173f50] px-5 py-6 text-white transition-transform md:sticky md:top-0 md:h-[100dvh] md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Link href="/dashboard" className="inline-flex" data-testid="link-sidebar-brand"><Mark inverse /></Link><button onClick={() => setOpen(false)} className="md:hidden" aria-label="Close navigation"><X size={20} /></button></div>
      <p className="mb-3 mt-11 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#8fb1b8]">Workspace</p>
      <nav className="space-y-1">{items.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#c5dbdc] transition hover:bg-white/10 hover:text-white" data-testid={`nav-${String(label).toLowerCase().replaceAll(' ', '-')}`}><Icon size={18} />{label}<ArrowRight className="ml-auto opacity-0 group-hover:opacity-100" size={14} /></Link>)}</nav>
      <div className="absolute bottom-5 left-5 right-5">
        {me && <Link href={`/profile/${me.id}`} className="mb-3 flex items-center gap-3 rounded-xl bg-white/[.07] p-3" data-testid="link-my-profile"><span className="grid size-9 place-items-center rounded-full bg-[#79cfc2] text-sm font-extrabold text-[#173f50]">{initials(me.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{me.name}</span><span className="mt-0.5 block text-xs capitalize text-[#9dbec1]">{me.role || 'Set up profile'}</span></span></Link>}
        <button onClick={() => signOut({ redirectUrl: basePath || '/' })} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#b8d0d1] hover:bg-white/10 hover:text-white" data-testid="button-sign-out"><LogOut size={17} /> Sign out</button>
      </div>
    </aside>
    {open && <button className="fixed inset-0 z-20 bg-[#102d39]/45 md:hidden" aria-label="Close menu backdrop" onClick={() => setOpen(false)} />}
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-[#dce8e7] bg-[#f7faf9]/90 px-5 backdrop-blur md:px-9">
        <button className="rounded-lg p-2 text-[#426370] hover:bg-[#e7f1f0] md:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20} /></button>
        <div className="hidden text-sm text-[#65808a] md:block">A little more progress, every day.</div>
        <div className="ml-auto flex items-center gap-2"><Link href="/projects" className="rounded-lg p-2.5 text-[#4c6d79] hover:bg-[#e8f1f0]" aria-label="Browse projects" data-testid="link-search-projects"><Search size={18} /></Link><Link href="/projects/new" className="hidden items-center gap-2 rounded-xl bg-[#177c91] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#116a7c] sm:inline-flex" data-testid="link-post-project"><Plus size={17} /> Post a project</Link></div>
      </header>
      <main className="mx-auto max-w-[1360px] px-5 py-7 md:px-9 md:py-10">{children}</main>
    </div>
  </div></Show>;
}

function initials(value?: string | null) { return (value || 'WE').split(/\s+/).slice(0, 2).map(s => s.charAt(0)).join('').toUpperCase(); }
function Money({ amount }: { amount?: number }) { return <>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0)}</>; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'; }

function PageHeading({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#228485]">{eyebrow}</p>}<h1 className="font-display text-3xl font-extrabold tracking-[-.055em] text-[#193f50] md:text-[2.55rem]">{title}</h1>{text && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647e87]">{text}</p>}</div>{action}</div>;
}
function SkeletonRows() { return <div className="mt-7 grid gap-4 md:grid-cols-3" aria-label="Loading projects">{[1, 2, 3].map(i => <div key={i} className="animate-pulse rounded-2xl border border-[#deebea] bg-white p-5"><div className="h-3 w-24 rounded bg-[#e3eeed]" /><div className="mt-5 h-5 w-3/4 rounded bg-[#e3eeed]" /><div className="mt-3 h-3 w-full rounded bg-[#edf3f2]" /><div className="mt-2 h-3 w-4/5 rounded bg-[#edf3f2]" /><div className="mt-7 h-10 rounded bg-[#e3eeed]" /></div>)}</div>; }
function ErrorState({ retry }: { retry: () => void }) { return <div className="my-6 rounded-2xl border border-[#f1d3cd] bg-[#fff8f4] p-6"><h3 className="font-display font-bold text-[#744c43]">We couldn’t load this just now</h3><p className="mt-1 text-sm text-[#84675f]">Please try again. Your work is still here.</p><button onClick={retry} className="mt-4 rounded-lg border border-[#dfb9b0] px-4 py-2 text-sm font-bold text-[#744c43] hover:bg-white" data-testid="button-retry">Try again</button></div>; }
function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="my-6 rounded-2xl border border-dashed border-[#c9ddde] bg-[#f8fbfa] px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e4f2ef] text-[#25837f]"><CircleHelp size={23} /></span><h3 className="font-display mt-4 text-lg font-bold text-[#284b5a]">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#69808a]">{text}</p>{action && <div className="mt-5">{action}</div>}</div>; }
function AlertMessage({ children }: { children: ReactNode }) { return <div role="alert" className="rounded-xl border border-[#f0d1c9] bg-[#fff6f1] px-4 py-3 text-sm text-[#814c40]">{children}</div>; }
function StatusPill({ status }: { status?: string | null }) {
  const value = (status || 'open').replaceAll('_', ' ');
  const colors: Record<string, string> = { open: 'bg-[#e6f5ef] text-[#24755d]', active: 'bg-[#e5f0f5] text-[#2d7184]', submitted: 'bg-[#fff2dc] text-[#93651c]', disputed: 'bg-[#fff0eb] text-[#a44d3d]', completed: 'bg-[#e7f3ed] text-[#46775d]', approved: 'bg-[#e7f3ed] text-[#46775d]', pending: 'bg-[#fff2dc] text-[#93651c]', accepted: 'bg-[#e5f0f5] text-[#2d7184]', revision_requested: 'bg-[#fff2dc] text-[#93651c]' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${colors[status || 'open'] || 'bg-[#edf2f3] text-[#627983]'}`} data-testid={`status-${value.replaceAll(' ', '-')}`}>{value}</span>;
}
function ProjectCard({ project }: { project: Project }) {
  return <article className="flex flex-col rounded-2xl border border-[#dce9e8] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#b8d8d7] hover:shadow-[0_12px_30px_rgba(33,86,94,.08)]" data-testid={`card-project-${project.id}`}>
    <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e9f4f2] px-3 py-1 text-xs font-bold text-[#35767a]">{project.category}</span><StatusPill status={project.status} /></div>
    <Link href={`/projects/${project.id}`} className="font-display mt-4 text-lg font-extrabold leading-snug tracking-[-.025em] text-[#234958] hover:text-[#177c91]" data-testid={`link-project-title-${project.id}`}>{project.title}</Link>
    <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#68818a]">{project.about}</p>
    <div className="mt-4 flex items-center gap-2 text-xs text-[#66808a]"><span className="grid size-7 place-items-center rounded-full bg-[#eef4f2] font-bold text-[#47747a]">{initials(project.businessName)}</span>{project.businessName}<span className="ml-auto flex items-center gap-1"><FileText size={14} />{project.proposalCount} proposals</span></div>
    <div className="mt-5 flex items-end justify-between border-t border-[#edf2f1] pt-4"><div><p className="text-[11px] font-bold uppercase tracking-wide text-[#82959b]">Budget</p><p className="font-display mt-1 font-extrabold text-[#226c71]"><Money amount={project.minBudget} />–<Money amount={project.maxBudget} /></p></div><Button href={`/projects/${project.id}`} variant="outline" className="min-h-9 px-3 text-xs">View brief <ArrowRight size={14} /></Button></div>
  </article>;
}

function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboard();
  const { data: me } = useGetCurrentUser();
  if (isLoading) return <><PageHeading title="Your workspace" text="A clear view of what is moving." /><SkeletonRows /></>;
  if (isError || !data) return <><PageHeading title="Your workspace" /><ErrorState retry={() => refetch()} /></>;
  const business = me?.role === 'business';
  const metrics: Array<[string, ReactNode, typeof BriefcaseBusiness, string, string]> = [
    ['Active projects', data.activeProjects, BriefcaseBusiness, '#e2f2ef', '#297e79'],
    ['Open proposals', data.openProposals, FileText, '#eaf0f5', '#4c7991'],
    ['Completed projects', data.completedProjects, CheckCircle2, '#eaf4ec', '#558465'],
    ['Total earnings', <Money amount={data.earnings} />, Banknote, '#fff3df', '#a2772d'],
  ];
  return <div className="page-enter">
    <PageHeading eyebrow={`Good to see you${me?.name ? `, ${me.name.split(' ')[0]}` : ''}`} title={business ? 'Your business, moving forward.' : 'Your next great project starts here.'} text={business ? 'Keep track of your open briefs, proposals, and work in progress.' : 'Find meaningful client work and build a portfolio you can stand behind.'} action={!business ? <Button href="/projects">Explore open work <ArrowRight size={16} /></Button> : <Button href="/projects/new"><Plus size={16} /> Post a project</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon, bg, color]) => <div key={label} className="rounded-2xl border border-[#dfeae9] bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#637c86]">{label}</span><span className="grid size-10 place-items-center rounded-xl" style={{ background: bg, color }}><Icon size={19} /></span></div><div className="font-display mt-5 text-3xl font-extrabold tracking-tight text-[#234858]" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</div></div>)}</div>
    <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <section className="rounded-2xl border border-[#dfeae9] bg-white p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold text-[#244958]">Your projects</h2><p className="mt-1 text-sm text-[#71868e]">The work you’re part of, all in one place.</p></div><Link href="/projects" className="text-sm font-bold text-[#187b89]" data-testid="link-all-projects">View all <ArrowRight className="ml-1 inline" size={15} /></Link></div>
        {!data.projects?.length ? <EmptyState title="Ready for a first project?" text="Browse open briefs or post your first project to get started." action={<Button href={business ? '/projects/new' : '/projects'}>{business ? 'Post a project' : 'Browse projects'}</Button>} /> :
          <div className="mt-5 divide-y divide-[#edf2f1]">{data.projects.slice(0, 5).map(p => <Link href={`/projects/${p.id}`} key={p.id} className="flex items-center gap-4 py-4 first:pt-1 last:pb-1" data-testid={`row-dashboard-project-${p.id}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f3f1] text-[#287b7a]"><Globe2 size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate font-bold text-[#315360]">{p.title}</span><span className="mt-1 block text-xs text-[#7b8f96]">{p.businessName} · {p.category}</span></span><StatusPill status={p.status} /><ArrowRight className="hidden text-[#8ca2a8] sm:block" size={17} /></Link>)}</div>}
      </section>
      <section className="rounded-2xl border border-[#dfeae9] bg-white p-5 md:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e6f3f0] text-[#287b7a]"><Clock3 size={19} /></span><div><h2 className="font-display font-extrabold text-[#244958]">Recent activity</h2><p className="text-xs text-[#71868e]">A little progress adds up.</p></div></div>
        {!data.activity?.length ? <EmptyState title="Your timeline starts here" text="Updates about proposals and project progress will appear as you work." /> : <div className="mt-5 space-y-4">{data.activity.slice(0, 6).map(a => <div key={a.id} className="flex gap-3" data-testid={`activity-${a.id}`}><span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#57b7a9]" /><div><p className="text-sm leading-5 text-[#46636e]">{a.text}</p><p className="mt-1 text-xs text-[#899ba1]">{formatDate(a.createdAt)}</p></div></div>)}</div>}
      </section>
    </div>
    <section className="mt-7 rounded-2xl bg-[#e0f0ed] p-5 md:flex md:items-center md:justify-between md:p-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#277d78]"><Sparkles size={21} /></span><div><h3 className="font-display font-extrabold text-[#244958]">Keep your profile up to date</h3><p className="mt-1 text-sm text-[#658087]">A thoughtful profile helps good people find each other.</p></div></div><Button href={me ? `/profile/${me.id}` : '/onboarding'} variant="outline" className="mt-4 md:mt-0">View your profile <ArrowUpRight size={15} /></Button></section>
  </div>;
}

function ProjectsPage() {
  const { data: me } = useGetCurrentUser();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [sort, setSort] = useState<'newest' | 'budget'>('newest');
  const params = { ...(search ? { search } : {}), ...(category ? { category } : {}), ...(budget ? { maxBudget: Number(budget) } : {}), sort };
  const { data, isLoading, isError, refetch } = useListProjects(params);
  const categories = ['Brand & design', 'Business website', 'Portfolio', 'Online store', 'Landing page', 'Other'];
  const business = me?.role === 'business';
  return <div className="page-enter"><PageHeading eyebrow={business ? 'Your business briefs' : 'The open brief board'} title={business ? 'Your briefs, your matches.' : 'Find work worth doing.'} text={business ? 'Manage your briefs and review students who have expressed interest in your work.' : 'Browse business briefs and express interest when the work and budget are right for you.'} action={business ? <Button href="/projects/new"><Plus size={16} /> Create a brief</Button> : undefined} />
    <div className="mb-6 grid gap-3 rounded-2xl border border-[#dce9e8] bg-white p-4 md:grid-cols-[1.5fr_1fr_1fr_auto]">
      <label className="relative"><Search className="absolute left-3 top-3 text-[#82969c]" size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search project briefs" className="h-11 w-full rounded-xl border border-[#d8e5e4] bg-[#fbfdfc] pl-10 pr-3 text-sm outline-none focus:border-[#5aabb0]" data-testid="input-project-search" /></label>
      <select value={category} onChange={e => setCategory(e.target.value)} className="h-11 rounded-xl border border-[#d8e5e4] bg-[#fbfdfc] px-3 text-sm text-[#476571] outline-none focus:border-[#5aabb0]" data-testid="select-project-category"><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
      <select value={budget} onChange={e => setBudget(e.target.value)} className="h-11 rounded-xl border border-[#d8e5e4] bg-[#fbfdfc] px-3 text-sm text-[#476571] outline-none focus:border-[#5aabb0]" data-testid="select-project-budget"><option value="">Any budget</option><option value="500">Up to $500</option><option value="1000">Up to $1,000</option><option value="2500">Up to $2,500</option></select>
      <button onClick={() => setSort(sort === 'newest' ? 'budget' : 'newest')} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8e5e4] px-4 text-sm font-bold text-[#466570] hover:bg-[#f3f9f8]" data-testid="button-sort-projects"><Filter size={16} /> {sort === 'newest' ? 'Newest' : 'Budget'}</button>
    </div>
    {isLoading ? <SkeletonRows /> : isError ? <ErrorState retry={() => refetch()} /> : !data?.length ? <EmptyState title="No briefs match those filters" text="Try a different search, or clear your filters to see more opportunities." action={<Button onClick={() => { setSearch(''); setCategory(''); setBudget(''); }} variant="outline">Clear filters</Button>} /> : <><div className="mb-4 flex items-center justify-between text-sm text-[#71868e]"><span>{data.length} {data.length === 1 ? 'open project' : 'open projects'}</span><span className="inline-flex items-center gap-1"><Filter size={14} /> Sorted by {sort === 'newest' ? 'newest' : 'budget'}</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map(p => <ProjectCard key={p.id} project={p} />)}</div></>}
  </div>;
}

function ProjectForm() {
  const create = useCreateProject();
  const client = useQueryClient();
  const [, setLocation] = useLocation();
  const [error, setError] = useState('');
  const [pages, setPages] = useState('Home, About, Contact');
  const [features, setFeatures] = useState('Mobile-friendly, Contact form');
  const [refs, setRefs] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const f = new FormData(e.currentTarget);
    const minBudget = Number(f.get('minBudget')); const maxBudget = Number(f.get('maxBudget'));
    if (maxBudget < minBudget || !Number.isFinite(minBudget) || !Number.isFinite(maxBudget)) { setError('The upper budget should be at least as much as the lower budget.'); return; }
    create.mutate({ data: {
      title: String(f.get('title')), category: String(f.get('category')), about: String(f.get('about')),
      requiredPages: pages.split(',').map(s => s.trim()).filter(Boolean), requiredFeatures: features.split(',').map(s => s.trim()).filter(Boolean),
      minBudget, maxBudget, deadline: String(f.get('deadline') || '') || null,
      referenceLinks: refs.split('\n').map(s => s.trim()).filter(Boolean), notes: String(f.get('notes') || ''),
    } }, { onSuccess: project => { client.invalidateQueries({ queryKey: getListProjectsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLocation(`/projects/${project.id}`); }, onError: () => setError('We couldn’t publish this brief. Please check the details and try again.') });
  }
  return <div className="page-enter mx-auto max-w-[860px]"><Link href="/projects" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#66808a]" data-testid="link-back-projects"><ArrowLeft size={16} /> Back to projects</Link><PageHeading eyebrow="Share the work" title="Post a project brief." text="A clear, friendly brief helps students understand what you need and propose the right plan." />
    <form onSubmit={submit} className="rounded-2xl border border-[#dce9e8] bg-white p-5 md:p-8">
      {error && <div className="mb-5"><AlertMessage>{error}</AlertMessage></div>}
      <div className="mb-7 rounded-xl bg-[#edf6f4] p-4 text-sm leading-6 text-[#506d76]"><ShieldCheck className="mr-2 inline text-[#23847c]" size={18} />You’re in control. Agree on the scope and milestones with your student before work begins.</div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Project title" name="title" placeholder="A welcoming website for my shop" required minLength={4} />
        <label className="block"><span className="mb-2 block text-sm font-bold text-[#385a67]">What kind of project?</span><select name="category" className={inputStyle} required data-testid="select-new-project-category"><option value="">Choose a category</option>{['Business website','Landing page','Online store','Portfolio','Brand & design','Other'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="block md:col-span-2"><span className="mb-2 block text-sm font-bold text-[#385a67]">Tell us what you need</span><textarea name="about" required minLength={10} rows={5} placeholder="What does your business do? What should the website help you accomplish? Share what you already know." className={`${inputStyle} resize-y leading-6`} data-testid="input-project-about" /></label>
        <Field label="Pages needed" value={pages} onChange={setPages} hint="Separate page names with commas." placeholder="Home, About, Contact" />
        <Field label="Features or tools" value={features} onChange={setFeatures} hint="Separate features with commas." placeholder="Contact form, booking calendar" />
        <Field label="Minimum budget" name="minBudget" type="number" min="0" placeholder="350" required />
        <Field label="Maximum budget" name="maxBudget" type="number" min="1" placeholder="800" required />
        <Field label="Ideal finish date" name="deadline" type="date" />
        <Field label="Reference links" value={refs} onChange={setRefs} hint="One link per line. Optional." multiline placeholder="https://example.com" />
        <label className="block md:col-span-2"><span className="mb-2 block text-sm font-bold text-[#385a67]">Anything else to know?</span><textarea name="notes" rows={3} placeholder="Existing website, brand assets, must-haves, or a good time to talk." className={`${inputStyle} resize-y`} data-testid="input-project-notes" /></label>
      </div>
      <div className="mt-7 flex flex-col-reverse justify-end gap-3 border-t border-[#edf2f1] pt-5 sm:flex-row"><Button href="/projects" variant="outline">Save for later</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Publishing brief…' : 'Publish project'} {!create.isPending && <ArrowRight size={16} />}</Button></div>
    </form>
  </div>;
}
const inputStyle = 'min-h-11 w-full rounded-xl border border-[#d6e4e4] bg-[#fbfdfc] px-3.5 py-2.5 text-sm text-[#294d5b] outline-none transition placeholder:text-[#9aabb0] focus:border-[#60aab0] focus:ring-2 focus:ring-[#60aab0]/15';
function Field({ label, name, placeholder, type = 'text', required, minLength, min, value, defaultValue, onChange, hint, multiline }: {
  label: string; name?: string; placeholder?: string; type?: string; required?: boolean; minLength?: number; min?: string; value?: string; defaultValue?: string; onChange?: (value: string) => void; hint?: string; multiline?: boolean;
}) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#385a67]">{label}</span>{multiline ? <textarea name={name} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={2} className={`${inputStyle} resize-y`} data-testid={`input-${name || label.toLowerCase().replaceAll(' ', '-')}`} /> : <input name={name} type={type} value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={onChange ? e => onChange(e.target.value) : undefined} placeholder={placeholder} required={required} minLength={minLength} min={min} className={inputStyle} data-testid={`input-${name || label.toLowerCase().replaceAll(' ', '-')}`} />}{hint && <span className="mt-1.5 block text-xs text-[#7b9198]">{hint}</span>}</label>;
}

function ProjectDetails() {
  const { id: idString } = useParams<{ id: string }>();
  const id = Number(idString);
  const { data: project, isLoading, isError, refetch } = useGetProject(id);
  const { data: proposals, isLoading: proposalsLoading } = useListProjectProposals(id);
  const { data: me } = useGetCurrentUser();
  const submitProposal = useCreateProposal(); const accept = useAcceptProposal(); const update = useUpdateProject();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false); const [notice, setNotice] = useState('');
  if (isLoading) return <><PageHeading title="Project brief" /><SkeletonRows /></>;
  if (isError || !project) return <><PageHeading title="Project brief" /><ErrorState retry={() => refetch()} /></>;
  const own = me?.id === project.businessId;
  const canApply = me?.role === 'student' && project.status === 'open' && !own;
  const alreadyInterested = !!proposals?.some((p: Proposal) => p.studentId === me?.id);
  function apply() {
    if (!me || me.role !== 'student' || alreadyInterested) return;
    submitProposal.mutate({ projectId: id, data: { message: 'Interested in this business type and available within the posted budget.', quote: project.maxBudget, timelineDays: 14, portfolioLinks: me.portfolioLinks || [] } }, { onSuccess: () => { setNotice('Your interest is saved. The business owner can now view your profile.'); client.invalidateQueries({ queryKey: getListProjectProposalsQueryKey(id) }); client.invalidateQueries({ queryKey: getGetProjectQueryKey(id) }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }, onError: () => setNotice('We couldn’t save your interest. You may already have responded to this brief.') });
  }
  function saveBrief(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const minBudget = Number(f.get('minBudget')); const maxBudget = Number(f.get('maxBudget'));
    if (!Number.isFinite(minBudget) || !Number.isFinite(maxBudget) || maxBudget < minBudget) { setNotice('The maximum budget must be at least the minimum budget.'); return; }
    update.mutate({ projectId: id, data: {
      title: String(f.get('title')), category: String(f.get('category')), about: String(f.get('about')),
      requiredPages: String(f.get('requiredPages') || '').split(',').map(s => s.trim()).filter(Boolean),
      requiredFeatures: String(f.get('requiredFeatures') || '').split(',').map(s => s.trim()).filter(Boolean),
      minBudget, maxBudget, deadline: String(f.get('deadline') || '') || null,
      referenceLinks: String(f.get('referenceLinks') || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
      notes: String(f.get('notes') || ''),
    } }, { onSuccess: () => { setEditing(false); setNotice('Your brief has been updated.'); client.invalidateQueries({ queryKey: getGetProjectQueryKey(id) }); client.invalidateQueries({ queryKey: getListProjectsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }, onError: () => setNotice('The brief could not be updated. Please check the details and try again.') });
  }
  return <div className="page-enter">
    <Link href="/projects" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#66808a]" data-testid="link-back-projects"><ArrowLeft size={16} /> Back to projects</Link>
    {notice && <div className="mb-5"><AlertMessage>{notice}</AlertMessage></div>}
    <div className="grid gap-6 xl:grid-cols-[1fr_350px]">
      <div>
        {editing && <form onSubmit={saveBrief} className="mb-6 rounded-2xl border border-[#dce9e8] bg-white p-5 md:p-7">
          <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold text-[#244958]">Edit your brief</h2><p className="mt-1 text-sm text-[#71868e]">Changes will be visible to interested students.</p></div><Button type="button" variant="quiet" onClick={() => setEditing(false)}>Cancel</Button></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project title" name="title" defaultValue={project.title} required minLength={4} />
            <label className="block"><span className="mb-2 block text-sm font-bold text-[#385a67]">Project category</span><select name="category" defaultValue={project.category} className={inputStyle} required>{['Business website','Landing page','Online store','Portfolio','Brand & design','Other'].map(x => <option key={x}>{x}</option>)}</select></label>
            <label className="block md:col-span-2"><span className="mb-2 block text-sm font-bold text-[#385a67]">Project description</span><textarea name="about" defaultValue={project.about} required minLength={10} rows={4} className={inputStyle + ' resize-y'} /></label>
            <Field label="Pages needed (comma-separated)" name="requiredPages" defaultValue={project.requiredPages?.join(', ') || ''} />
            <Field label="Features (comma-separated)" name="requiredFeatures" defaultValue={project.requiredFeatures?.join(', ') || ''} />
            <Field label="Minimum budget" name="minBudget" type="number" min="0" defaultValue={String(project.minBudget)} required />
            <Field label="Maximum budget" name="maxBudget" type="number" min="1" defaultValue={String(project.maxBudget)} required />
            <Field label="Ideal finish date" name="deadline" type="date" defaultValue={project.deadline || ''} />
            <Field label="Reference links (one per line)" name="referenceLinks" defaultValue={project.referenceLinks?.join('\n') || ''} multiline />
            <label className="block md:col-span-2"><span className="mb-2 block text-sm font-bold text-[#385a67]">Additional notes</span><textarea name="notes" defaultValue={project.notes || ''} rows={3} className={inputStyle + ' resize-y'} /></label>
          </div>
          <div className="mt-5 flex justify-end"><Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save brief changes'}</Button></div>
        </form>}
        <section className="rounded-2xl border border-[#dce9e8] bg-white p-6 md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-[#e9f4f2] px-3 py-1.5 text-xs font-bold text-[#35767a]">{project.category}</span><div className="flex items-center gap-2"><StatusPill status={project.status} />{own && project.status === 'open' && <Button variant="outline" className="min-h-8 px-3 text-xs" onClick={() => setEditing(!editing)}>{editing ? 'Close editor' : 'Edit brief'}</Button>}</div></div><h1 className="font-display mt-5 text-3xl font-extrabold tracking-[-.055em] text-[#193f50] md:text-4xl">{project.title}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6b8289]"><span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#e8f3f1] text-xs font-bold text-[#357b79]">{initials(project.businessName)}</span> Posted by <Link href={`/profile/${project.businessId}`} className="font-bold text-[#32747a]" data-testid="link-business-profile">{project.businessName}</Link></span><span>Posted {formatDate(project.createdAt)}</span></div>
          <div className="my-7 h-px bg-[#edf2f1]" /><h2 className="font-display text-lg font-extrabold text-[#294d5a]">About this project</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#607982]">{project.about}</p>
          <div className="mt-7 grid gap-6 sm:grid-cols-2"><div><h3 className="font-display text-sm font-extrabold text-[#315562]">Pages to include</h3><div className="mt-3 flex flex-wrap gap-2">{project.requiredPages?.length ? project.requiredPages.map(page => <span key={page} className="rounded-lg bg-[#eff6f4] px-3 py-1.5 text-xs font-semibold text-[#52717a]">{page}</span>) : <span className="text-sm text-[#84969b]">To be discussed</span>}</div></div><div><h3 className="font-display text-sm font-extrabold text-[#315562]">Features and tools</h3><div className="mt-3 flex flex-wrap gap-2">{project.requiredFeatures?.length ? project.requiredFeatures.map(f => <span key={f} className="rounded-lg bg-[#eff6f4] px-3 py-1.5 text-xs font-semibold text-[#52717a]">{f}</span>) : <span className="text-sm text-[#84969b]">To be discussed</span>}</div></div></div>
          {project.notes && <div className="mt-7 rounded-xl bg-[#f6f9f8] p-4"><h3 className="text-sm font-bold text-[#315562]">A few more details</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#667e86]">{project.notes}</p></div>}
          {!!project.referenceLinks?.length && <div className="mt-6"><h3 className="font-display text-sm font-extrabold text-[#315562]">References</h3><div className="mt-3 flex flex-wrap gap-2">{project.referenceLinks.map((href, i) => <a key={href} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#dce9e8] px-3 py-2 text-xs font-bold text-[#38747d] hover:bg-[#f2f8f6]" data-testid={`link-reference-${i}`}>Reference {i + 1}<ExternalLink size={13} /></a>)}</div></div>}
        </section>
        {(own || me?.role === 'admin') && <section className="mt-6 rounded-2xl border border-[#dce9e8] bg-white p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-lg font-extrabold text-[#244958]">Proposals</h2><p className="mt-1 text-sm text-[#71868e]">Meet the people interested in your brief.</p></div><span className="rounded-full bg-[#e9f4f2] px-3 py-1 text-xs font-bold text-[#35767a]">{project.proposalCount}</span></div>
          {proposalsLoading ? <SkeletonRows /> : !proposals?.length ? <EmptyState title="No proposals yet" text="Good matches take time. You’ll find every proposal here as soon as it arrives." /> : <div className="space-y-4">{proposals.map((p: Proposal) => <ProposalCard key={p.id} proposal={p} onAccept={() => accept.mutate({ proposalId: p.id }, { onSuccess: () => { setNotice(`${p.studentName} is now your project partner.`); client.invalidateQueries({ queryKey: getGetProjectQueryKey(id) }); client.invalidateQueries({ queryKey: getGetWorkspaceQueryKey(id) }); client.invalidateQueries({ queryKey: getListProjectProposalsQueryKey(id) }); }, onError: () => setNotice('This proposal could not be accepted. Please refresh and try again.') })} accepting={accept.isPending} own={own} />)}</div>}
        </section>}
      </div>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-[#dce9e8] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#789096]">Project budget</p><p className="font-display mt-2 text-3xl font-extrabold tracking-tight text-[#226f72]"><Money amount={project.minBudget} />–<Money amount={project.maxBudget} /></p><div className="mt-5 space-y-3 border-t border-[#edf2f1] pt-4 text-sm text-[#607a83]"><div className="flex justify-between"><span>Target date</span><strong className="text-[#345662]">{formatDate(project.deadline)}</strong></div><div className="flex justify-between"><span>Proposals</span><strong className="text-[#345662]">{project.proposalCount}</strong></div></div>
          {canApply && <Button onClick={apply} className="mt-5 w-full" disabled={submitProposal.isPending || alreadyInterested}>{submitProposal.isPending ? 'Saving interest…' : alreadyInterested ? 'Interest recorded' : 'I’m interested & available for this budget'} <Check size={16} /></Button>}
          {canApply && <p className="mt-2 text-xs leading-5 text-[#789096]">One click tells this business you’re interested in this type of work and can work within its posted budget.</p>}
          {!me && <Button href="/sign-up" className="mt-5 w-full">Join to express interest <ArrowRight size={16} /></Button>}
          {own && project.status === 'open' && <Button onClick={() => update.mutate({ projectId: id, data: { status: 'cancelled' } }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetProjectQueryKey(id) }) })} variant="outline" className="mt-5 w-full" disabled={update.isPending}>Close this project</Button>}
          {project.status === 'active' && <Button href={`/projects/${id}/workspace`} className="mt-5 w-full">Open workspace <ArrowRight size={16} /></Button>}
        </section>

        <div className="rounded-2xl bg-[#e5f1ef] p-5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-[#287d78]" size={20} /><div><h3 className="font-display font-extrabold text-[#315662]">Work with clarity</h3><p className="mt-1.5 text-sm leading-6 text-[#668087]">Agree on deliverables, due dates, and feedback before the work gets underway.</p></div></div></div>
      </aside>
    </div>
  </div>;
}

function ProposalCard({ proposal, onAccept, accepting, own }: { proposal: Proposal; onAccept: () => void; accepting: boolean; own: boolean }) {
  return <article className="rounded-xl border border-[#e1ebea] p-4 md:p-5" data-testid={`card-proposal-${proposal.id}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#dcefeb] font-bold text-[#287778]">{initials(proposal.studentName)}</span><div><Link href={`/profile/${proposal.studentId}`} className="font-display font-extrabold text-[#2a4e5b] hover:text-[#177c91]" data-testid={`link-proposal-profile-${proposal.id}`}>{proposal.studentName}</Link><span className="mt-1 flex items-center gap-1 text-xs text-[#728790]"><Star size={13} className="fill-[#daa84d] text-[#daa84d]" /> {proposal.studentRating.toFixed(1)} rating</span></div></div><StatusPill status={proposal.status} /></div><p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#5e7881]">{proposal.message}</p><div className="mt-4 flex flex-wrap gap-2">{proposal.studentSkills?.map(s => <span key={s} className="rounded-full bg-[#f0f6f4] px-2.5 py-1 text-xs font-semibold text-[#59747c]">{s}</span>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf2f1] pt-4"><div className="flex gap-5 text-sm"><span><small className="block text-xs text-[#80949a]">Quote</small><strong className="mt-1 block text-[#287679]"><Money amount={proposal.quote} /></strong></span><span><small className="block text-xs text-[#80949a]">Timeline</small><strong className="mt-1 block text-[#345662]">{proposal.timelineDays} days</strong></span></div>{proposal.portfolioLinks?.[0] && <a href={proposal.portfolioLinks[0]} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#347984]">Portfolio <ExternalLink className="ml-1 inline" size={12} /></a>}{own && proposal.status === 'pending' && <Button onClick={onAccept} disabled={accepting} className="min-h-9 px-3 text-xs">{accepting ? 'Accepting…' : 'Accept proposal'} <Check size={14} /></Button>}</div></article>;
}

function WorkspacePage() {
  const { id: rawId } = useParams<{ id: string }>(); const id = Number(rawId);
  const { data: workspace, isLoading, isError, refetch } = useGetWorkspace(id);
  const { data: messages, refetch: refetchMessages } = useListMessages(id);
  const { data: me } = useGetCurrentUser(); const client = useQueryClient();
  const send = useSendMessage(); const milestone = useUpdateMilestone(); const submit = useSubmitProject();
  const revision = useRequestRevision(); const approve = useApproveProject(); const openDispute = useOpenDispute();
  const [text, setText] = useState(''); const [url, setUrl] = useState(''); const [note, setNote] = useState(''); const [feedback, setFeedback] = useState(''); const [dispute, setDispute] = useState(''); const [showSubmit, setShowSubmit] = useState(false); const [notice, setNotice] = useState('');
  if (isLoading) return <><PageHeading title="Project workspace" /><SkeletonRows /></>;
  if (isError || !workspace) return <><PageHeading title="Project workspace" /><ErrorState retry={() => refetch()} /></>;
  const isOwner = me?.id === workspace.project.businessId;
  const onMutate = (ok: string) => { setNotice(ok); client.invalidateQueries({ queryKey: getGetWorkspaceQueryKey(id) }); client.invalidateQueries({ queryKey: getGetProjectQueryKey(id) }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); };
  function sendMessage(e: FormEvent) { e.preventDefault(); if (!text.trim()) return; send.mutate({ projectId: id, data: { text: text.trim() } }, { onSuccess: () => { setText(''); client.invalidateQueries({ queryKey: getListMessagesQueryKey(id) }); client.invalidateQueries({ queryKey: getGetWorkspaceQueryKey(id) }); }, onError: () => setNotice('Message not sent. Please try again.') }); }
  function submitWork(e: FormEvent) { e.preventDefault(); submit.mutate({ projectId: id, data: { url, note, kind: 'final' } }, { onSuccess: () => { onMutate('Your work has been shared for review.'); setShowSubmit(false); }, onError: () => setNotice('We couldn’t submit that update. Check the link and try again.') }); }
  return <div className="page-enter"><Link href={`/projects/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#66808a]" data-testid="link-back-project"><ArrowLeft size={16} /> Project brief</Link>
    {notice && <div className="mb-5"><AlertMessage>{notice}</AlertMessage></div>}
    <PageHeading eyebrow="Your shared project space" title={workspace.project.title} text={`A clear place to keep ${workspace.project.businessName} and ${workspace.proposal.studentName} in sync.`} action={<StatusPill status={workspace.project.status} />} />
    <div className="grid gap-6 xl:grid-cols-[1fr_350px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-[#dce9e8] bg-white p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold text-[#244958]">Project milestones</h2><p className="mt-1 text-sm text-[#71868e]">Small steps make good work easier to finish.</p></div><span className="text-sm font-bold text-[#50817f]">{workspace.milestones.filter(m => m.completed).length}/{workspace.milestones.length} done</span></div>
          {!workspace.milestones.length ? <EmptyState title="Milestones are being planned" text="You and your project partner can agree on the next steps in messages." /> : <div className="mt-5 space-y-3">{workspace.milestones.map(m => <label key={m.id} className="flex items-center gap-3 rounded-xl bg-[#f6f9f8] p-3.5" data-testid={`milestone-${m.id}`}><input type="checkbox" checked={m.completed} disabled={!isOwner || milestone.isPending} onChange={e => milestone.mutate({ projectId: id, milestoneId: m.id, data: { completed: e.target.checked } }, { onSuccess: () => onMutate('Milestone updated.'), onError: () => setNotice('We couldn’t update this milestone.') })} className="size-4 accent-[#198d8d]" data-testid={`checkbox-milestone-${m.id}`} /><span className={`flex-1 text-sm font-semibold ${m.completed ? 'text-[#7b9294] line-through' : 'text-[#476570]'}`}>{m.title}</span><span className="text-xs text-[#879a9e]">{formatDate(m.dueDate)}</span></label>)}</div>}
        </section>
        <section className="rounded-2xl border border-[#dce9e8] bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-extrabold text-[#244958]">Project updates</h2><p className="mt-1 text-sm text-[#71868e]">Preview links and final work shared with the team.</p></div>{!isOwner && <Button onClick={() => setShowSubmit(!showSubmit)} variant="outline" className="min-h-9 px-3 text-xs"><Plus size={14} /> Share work</Button>}</div>
          {showSubmit && <form onSubmit={submitWork} className="mt-4 rounded-xl border border-[#dce9e8] bg-[#f8fbfa] p-4"><h3 className="font-bold text-[#345662]">Share a submission</h3><Field label="Preview link" value={url} onChange={setUrl} placeholder="https://your-preview-site.com" required /><label className="mt-3 block"><span className="mb-2 block text-sm font-bold text-[#385a67]">Note for the owner</span><textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className={inputStyle} placeholder="What should they look at?" data-testid="input-submission-note" /></label><Button type="submit" className="mt-3" disabled={submit.isPending}>{submit.isPending ? 'Sharing…' : 'Submit for review'} <ArrowRight size={15} /></Button></form>}
          {!workspace.submissions.length ? <EmptyState title="No shared work yet" text="Preview links and delivery notes will show here when the student shares progress." /> : <div className="mt-4 space-y-3">{workspace.submissions.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f6f9f8] p-4" data-testid={`submission-${s.id}`}><div><span className="rounded-full bg-[#e3f1ee] px-2.5 py-1 text-[11px] font-bold capitalize text-[#367976]">{s.kind} work</span><p className="mt-2 text-sm text-[#637d85]">{s.note || 'Shared for review'}</p><span className="mt-2 block text-xs text-[#889a9e]">{formatDate(s.createdAt)}</span></div><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#d5e3e2] bg-white px-3 py-2 text-xs font-bold text-[#327984]" data-testid={`link-submission-${s.id}`}>Open preview <ExternalLink size={13} /></a></div>)}</div>}
          {isOwner && workspace.project.status === 'submitted' && <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => approve.mutate({ projectId: id }, { onSuccess: () => onMutate('Project approved. Thanks for giving clear feedback.'), onError: () => setNotice('We couldn’t approve the work. Please refresh and try again.') })} disabled={approve.isPending}>{approve.isPending ? 'Approving…' : 'Approve project'} <Check size={15} /></Button><Button onClick={() => { const f = window.prompt('What would you like changed?'); if (f && f.trim().length >= 3) revision.mutate({ projectId: id, data: { message: f } }, { onSuccess: () => onMutate('Revision request sent.'), onError: () => setNotice('We couldn’t send that revision request.') }); }} variant="outline" disabled={revision.isPending}>Request a revision</Button></div>}
        </section>
        <section className="rounded-2xl border border-[#dce9e8] bg-white p-5 md:p-6"><div><h2 className="font-display text-lg font-extrabold text-[#244958]">Messages</h2><p className="mt-1 text-sm text-[#71868e]">Keep decisions and updates together.</p></div>
          {!messages?.length ? <EmptyState title="Start the conversation" text="Ask a question, share an update, or agree on the next step." /> : <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">{messages.map(m => <div key={m.id} className={`flex gap-3 ${m.senderId === me?.id ? 'flex-row-reverse' : ''}`} data-testid={`message-${m.id}`}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e0eeeb] text-xs font-bold text-[#397a79]">{initials(m.senderName)}</span><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${m.senderId === me?.id ? 'bg-[#e2f1ee]' : 'bg-[#f2f6f5]'}`}><p className="text-xs font-bold text-[#53727a]">{m.senderName}</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#4d6871]">{m.text}</p><p className="mt-2 text-[10px] text-[#86989d]">{formatDate(m.createdAt)}</p></div></div>)}</div>}
          <form onSubmit={sendMessage} className="mt-5 flex gap-2 border-t border-[#edf2f1] pt-4"><input value={text} onChange={e => setText(e.target.value)} placeholder="Write a thoughtful update…" className={`${inputStyle} flex-1`} data-testid="input-message" /><Button type="submit" disabled={!text.trim() || send.isPending} className="shrink-0 px-3" aria-label="Send message">{send.isPending ? 'Sending…' : <Send size={16} />}</Button></form>
        </section>
      </div>
      <aside className="space-y-5"><section className="rounded-2xl border border-[#dce9e8] bg-white p-5"><h2 className="font-display font-extrabold text-[#244958]">Your project partner</h2><div className="mt-4 space-y-4">{[workspace.project.businessName, workspace.proposal.studentName].map((name, i) => <div key={name} className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#e2efec] font-bold text-[#377b78]">{initials(name)}</span><span className="flex-1"><span className="block text-sm font-bold text-[#3c5b66]">{name}</span><span className="mt-1 block text-xs text-[#85979c]">{i === 0 ? 'Business owner' : 'Student creator'}</span></span></div>)}</div></section>
        {workspace.canReview && <ReviewForm projectId={id} otherId={isOwner ? workspace.proposal.studentId : workspace.project.businessId} onComplete={() => setNotice('Thank you. Your review has been shared.')} />}
        <form onSubmit={e => { e.preventDefault(); if (dispute.trim().length < 10) return; openDispute.mutate({ projectId: id, data: { reason: dispute } }, { onSuccess: () => { onMutate('Your concern has been sent for review.'); setDispute(''); }, onError: () => setNotice('We couldn’t open a support case. Please try again.') }); }} className="rounded-2xl border border-[#eaded5] bg-[#fffaf6] p-5"><div className="flex items-center gap-2 text-[#8a5d48]"><LockKeyhole size={18} /><h2 className="font-display font-extrabold">Need a hand?</h2></div><p className="mt-2 text-sm leading-6 text-[#8b766b]">If a project gets stuck, tell our team what happened.</p><textarea value={dispute} onChange={e => setDispute(e.target.value)} minLength={10} rows={3} placeholder="Describe your concern in a few sentences." className={`${inputStyle} mt-3 border-[#eaded5] bg-white`} data-testid="input-dispute-reason" /><Button type="submit" variant="outline" disabled={openDispute.isPending || dispute.trim().length < 10} className="mt-3 min-h-9 w-full border-[#eaded5] text-[#825c48]">{openDispute.isPending ? 'Sending…' : 'Contact support'}</Button></form>
      </aside>
    </div>
  </div>;
}

function ReviewForm({ projectId, otherId, onComplete }: { projectId: number; otherId: string; onComplete: () => void }) {
  const create = useCreateReview(); const client = useQueryClient(); const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [error, setError] = useState('');
  return <form onSubmit={e => { e.preventDefault(); create.mutate({ projectId, data: { rating, comment } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListUserReviewsQueryKey(otherId) }); onComplete(); setComment(''); }, onError: () => setError('We couldn’t post your review. Please try again.') }); }} className="rounded-2xl border border-[#dce9e8] bg-white p-5"><h2 className="font-display font-extrabold text-[#244958]">Leave a review</h2><div className="mt-3 flex gap-1" role="radiogroup" aria-label="Choose rating">{[1,2,3,4,5].map(n => <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)} className="rounded-md p-1" data-testid={`button-rating-${n}`}><Star size={20} className={n <= rating ? 'fill-[#daa84d] text-[#daa84d]' : 'text-[#cbd8d8]'} /></button>)}</div><textarea required minLength={3} value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Share what it was like to work together." className={`${inputStyle} mt-3`} data-testid="input-review-comment" />{error && <p className="mt-2 text-xs text-[#a24b3e]">{error}</p>}<Button type="submit" className="mt-3 w-full" disabled={create.isPending}>{create.isPending ? 'Sharing…' : 'Share review'}</Button></form>;
}

function Onboarding() {
  const save = useSaveCurrentProfile(); const client = useQueryClient(); const [, setLocation] = useLocation();
  const { user, isLoaded: clerkUserLoaded } = useUser();
  const { data: me, isLoading } = useGetCurrentUser(); const [role, setRole] = useState<'business' | 'student'>('student'); const [error, setError] = useState('');
  useEffect(() => { if (me?.role === 'business' || me?.role === 'student') setRole(me.role); }, [me?.role]);
  if (isLoading || !clerkUserLoaded) return <div className="mx-auto max-w-2xl"><SkeletonRows /></div>;
  return <div className="mx-auto max-w-3xl page-enter"><div className="mb-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#dff1ed] text-[#277b79]"><Sparkles size={22} /></span><p className="mt-5 text-xs font-extrabold uppercase tracking-[.17em] text-[#238485]">First, a little about you</p><h1 className="font-display mt-2 text-3xl font-extrabold tracking-[-.05em] text-[#193f50] md:text-4xl">Let’s set up your profile.</h1><p className="mt-3 text-[#6a828a]">A few details help you find the right people and projects.</p></div>
    {me?.role && <div className="mb-4 rounded-xl bg-[#edf6f4] p-4 text-sm text-[#506d76]"><span className="font-bold">Account email:</span> {user?.primaryEmailAddress?.emailAddress || me.email || 'Email not available'}</div>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2">{([{ key: 'student', title: 'I’m a student creator', body: 'I’m here to find paid, real-world work.', Icon: Sparkles }, { key: 'business', title: 'I run a small business', body: 'I’m here to hire for a website project.', Icon: BriefcaseBusiness }] as const).map(({ key, title, body, Icon }) => <button key={key} disabled={!!me?.role} onClick={() => setRole(key)} className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-80 ${role === key ? 'border-[#4ca9a5] bg-[#edf7f4] ring-2 ring-[#4ca9a5]/15' : 'border-[#dce9e8] bg-white hover:border-[#b9d4d3]'}`} data-testid={`button-role-${key}`}><Icon className={role === key ? 'text-[#218280]' : 'text-[#7c989e]'} size={22} /><h2 className="font-display mt-4 font-extrabold text-[#2b505d]">{title}</h2><p className="mt-1 text-sm text-[#71868e]">{body}</p></button>)}</div>
    <form onSubmit={e => { e.preventDefault(); setError(''); const f = new FormData(e.currentTarget); const email = user?.primaryEmailAddress?.emailAddress || me?.email || ''; if (!email) { setError('We could not read the email on your account. Sign out and try again.'); return; } save.mutate({ data: { role, name: String(f.get('name')), email, bio: String(f.get('bio') || ''), category: String(f.get('category') || ''), location: String(f.get('location') || ''), availability: String(f.get('availability') || ''), skills: String(f.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean), portfolioLinks: String(f.get('portfolioLinks') || '').split('\n').map(s => s.trim()).filter(Boolean) } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLocation('/dashboard'); }, onError: () => setError('We couldn’t save the profile. Please review your name and try again.') }); }} className="rounded-2xl border border-[#dce9e8] bg-white p-5 md:p-8">
      {error && <div className="mb-4"><AlertMessage>{error}</AlertMessage></div>}
      <div className="grid gap-5 md:grid-cols-2"><Field label="Your name" name="name" defaultValue={me?.name} required placeholder="Name you go by" /><Field label={role === 'business' ? 'Business type' : 'Area of focus'} name="category" defaultValue={me?.category || ''} placeholder={role === 'business' ? 'Neighborhood bakery' : 'Web design and development'} /><Field label="City or region" name="location" defaultValue={me?.location || ''} placeholder="Portland, Oregon" /><Field label="Availability" name="availability" defaultValue={me?.availability || ''} placeholder="Taking on projects this month" /><label className="block md:col-span-2"><span className="mb-2 block text-sm font-bold text-[#385a67]">A little about you</span><textarea name="bio" defaultValue={me?.bio || ''} rows={4} placeholder={role === 'business' ? 'Tell students what your business does and what matters in a good collaboration.' : 'Share what you enjoy building and the kind of projects you’re looking for.'} className={`${inputStyle} resize-y`} data-testid="input-profile-bio" /></label><label className="block md:col-span-2"><span className="mb-2 block text-sm font-bold text-[#385a67]">Skills, separated by commas</span><input name="skills" defaultValue={me?.skills?.join(', ') || ''} placeholder="Web design, HTML, copywriting" className={inputStyle} data-testid="input-profile-skills" /></label><label className="block md:col-span-2"><span className="mb-2 block text-sm font-bold text-[#385a67]">Portfolio or website links</span><textarea name="portfolioLinks" defaultValue={me?.portfolioLinks?.join('\n') || ''} rows={3} placeholder="One link per line." className={inputStyle} data-testid="input-profile-links" /></label></div>
      <div className="mt-7 flex justify-end border-t border-[#edf2f1] pt-5"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving profile…' : me?.role ? 'Save profile changes' : 'Save and continue'} <ArrowRight size={16} /></Button></div>
    </form>
  </div>;
}
function PublicProfilePage() {
  const { userId = '' } = useParams<{ userId: string }>();
  const { data: me } = useGetCurrentUser();
  const { data: profile, isLoading, isError, refetch } = useGetPublicProfile(userId);
  const { data: reviews, isLoading: reviewsLoading } = useListUserReviews(userId);
  if (isLoading) return <div className="mx-auto max-w-4xl"><PageHeading title="Creator profile" /><SkeletonRows /></div>;
  if (isError || !profile) return <div className="mx-auto max-w-4xl"><PageHeading title="Creator profile" /><ErrorState retry={() => refetch()} /></div>;
  return <div className="page-enter mx-auto max-w-5xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[#66808a]" data-testid="link-back-dashboard"><ArrowLeft size={16} /> Back to workspace</Link>{me?.id === profile.id && <Button href="/onboarding" variant="outline"><FileText size={15} /> Edit profile</Button>}</div>
    <section className="overflow-hidden rounded-[1.75rem] border border-[#dce9e8] bg-white">
      <div className="h-32 bg-[radial-gradient(ellipse_at_80%_20%,rgba(170,224,215,.9),transparent_40%),linear-gradient(110deg,#e7f3f1,#dcebea)] md:h-44" />
      <div className="px-5 pb-7 md:px-9"><div className="-mt-11 flex flex-wrap items-end justify-between gap-4"><div className="flex items-end gap-4"><span className="grid size-[88px] place-items-center rounded-[1.5rem] border-4 border-white bg-[#277f83] font-display text-2xl font-extrabold text-white shadow-sm">{initials(profile.name)}</span><div className="pb-1"><span className="rounded-full bg-[#e7f4f0] px-2.5 py-1 text-[11px] font-bold capitalize text-[#367b78]">{profile.role === 'student' ? 'Student creator' : 'Small business'}</span><h1 className="font-display mt-2 text-2xl font-extrabold tracking-[-.05em] text-[#193f50] md:text-3xl" data-testid="text-profile-name">{profile.name}</h1></div></div>{profile.role === 'student' && <div className="flex gap-5 pb-1"><div><strong className="font-display block text-xl font-extrabold text-[#326e70]">{profile.completedProjects}</strong><span className="text-xs text-[#7b8e94]">projects</span></div><div><strong className="font-display flex items-center gap-1 text-xl font-extrabold text-[#326e70]"><Star size={16} className="fill-[#daa84d] text-[#daa84d]" />{profile.rating.toFixed(1)}</strong><span className="text-xs text-[#7b8e94]">rating</span></div></div>}</div>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#70858d]"><span className="inline-flex items-center gap-1.5"><Compass size={15} />{profile.category || 'Web and digital'}</span>{profile.location && <span>{profile.location}</span>}{profile.availability && <span className="rounded-full bg-[#edf7f2] px-2.5 py-1 text-xs font-bold text-[#357765]">{profile.availability}</span>}</div>
        {me?.id === profile.id && <p className="mt-4 text-sm text-[#607982]"><span className="font-bold text-[#345662]">Account email:</span> {me.email || 'Email not available'}</p>}
        <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-[#607982]">{profile.bio || 'A WebEarn member building good things with local businesses.'}</p>
        {!!profile.skills?.length && <div className="mt-5 flex flex-wrap gap-2">{profile.skills.map(s => <span key={s} className="rounded-full bg-[#edf5f3] px-3 py-1.5 text-xs font-semibold text-[#50717a]">{s}</span>)}</div>}
        {!!profile.portfolioLinks?.length && <div className="mt-6 border-t border-[#edf2f1] pt-5"><h2 className="font-display font-extrabold text-[#315562]">Portfolio &amp; websites</h2><div className="mt-3 flex flex-wrap gap-2">{profile.portfolioLinks.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#d9e7e5] px-3 py-2 text-sm font-bold text-[#347984] hover:bg-[#f4f9f7]" data-testid={`link-portfolio-${i}`}>View work <ExternalLink size={14} /></a>)}</div></div>}
      </div>
    </section>
    <section className="mt-6 rounded-2xl border border-[#dce9e8] bg-white p-5 md:p-7"><div className="flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#258485]">Good work remembered</p><h2 className="font-display mt-2 text-xl font-extrabold text-[#244958]">Reviews</h2></div><span className="text-sm text-[#768c93]">{reviews?.length || 0} shared experiences</span></div>
      {reviewsLoading ? <div className="mt-5 h-20 animate-pulse rounded-xl bg-[#eff5f4]" /> : !reviews?.length ? <EmptyState title="A little room for your first review" text="Once a WebEarn collaboration is complete, partners can share what working together was like." /> : <div className="mt-4 divide-y divide-[#edf2f1]">{reviews.map(r => <article key={r.id} className="py-5 first:pt-2" data-testid={`review-${r.id}`}><div className="flex items-center justify-between gap-4"><Link href={`/profile/${r.reviewerId}`} className="font-bold text-[#3d5d68]" data-testid={`link-reviewer-${r.id}`}>{r.reviewerName}</Link><span className="inline-flex items-center gap-1 text-sm font-bold text-[#976c26]"><Star size={14} className="fill-[#daa84d] text-[#daa84d]" />{r.rating}.0</span></div><p className="mt-2 text-sm leading-6 text-[#637c84]">{r.comment}</p><span className="mt-2 block text-xs text-[#8a9ba0]">{formatDate(r.createdAt)}</span></article>)}</div>}
    </section>
  </div>;
}

function AdminNav() {
  const [loc] = useLocation();
  const links = [['/admin', 'Overview'], ['/admin/users', 'Users'], ['/admin/projects', 'Projects'], ['/admin/disputes', 'Disputes'], ['/admin/payments', 'Payments']];
  return <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#dce9e8] bg-white p-1.5">{links.map(([href, label]) => <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${loc === href ? 'bg-[#e6f2ef] text-[#24777a]' : 'text-[#70858d] hover:bg-[#f4f8f7]'}`} data-testid={`admin-nav-${label.toLowerCase()}`}>{label}</Link>)}</nav>;
}
function AdminPage() {
  const [location] = useLocation();
  const overview = useGetAdminOverview(); const users = useListAdminUsers(); const projects = useListAdminProjects();
  const disputes = useListDisputes(); const payments = useListAdminPayments(); const resolve = useResolveDispute(); const client = useQueryClient();
  const [error, setError] = useState('');
  const retryAll = () => { overview.refetch(); users.refetch(); projects.refetch(); disputes.refetch(); payments.refetch(); };
  if ([overview.isLoading, users.isLoading, projects.isLoading, disputes.isLoading, payments.isLoading].some(Boolean)) return <><PageHeading eyebrow="Admin console" title="Marketplace overview" /><SkeletonRows /></>;
  const loadError = overview.isError || users.isError || projects.isError || disputes.isError || payments.isError;
  const route = location.replace(/\/$/, '');
  const navTitle: Record<string, string> = { '/admin': 'Marketplace overview', '/admin/users': 'People on WebEarn', '/admin/projects': 'Project moderation', '/admin/disputes': 'Dispute resolution', '/admin/payments': 'Payment activity' };
  const disputeRows = disputes.data || [];
  const adminStats: Array<[string, number, typeof Users]> = [
    ['Members', overview.data?.users || 0, Users], ['Projects', overview.data?.projects || 0, BriefcaseBusiness],
    ['Open briefs', overview.data?.openProjects || 0, Globe2], ['Open disputes', overview.data?.activeDisputes || 0, MessageCircle],
    ['Payments held', overview.data?.heldPayments || 0, Banknote],
  ];
  return <div className="page-enter"><PageHeading eyebrow="Admin console" title={navTitle[route] || navTitle['/admin']} text="A clear view of marketplace health and the people who make it work." />
    <AdminNav />
    {loadError && <ErrorState retry={retryAll} />}
    {error && <div className="mb-5"><AlertMessage>{error}</AlertMessage></div>}
    {route === '/admin' && overview.data && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{adminStats.map(([label, val, Icon]) => <div key={label} className="rounded-2xl border border-[#dce9e8] bg-white p-5"><span className="grid size-10 place-items-center rounded-xl bg-[#e7f3f0] text-[#287d79]"><Icon size={19} /></span><p className="mt-4 text-sm font-semibold text-[#68818a]">{label}</p><strong className="font-display mt-1 block text-3xl font-extrabold text-[#264b58]">{val}</strong></div>)}</div><div className="mt-6 grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-[#dce9e8] bg-white p-5"><h2 className="font-display font-extrabold text-[#244958]">Recently posted briefs</h2>{!projects.data?.length ? <EmptyState title="No projects to review" text="New briefs will appear here." /> : projects.data.slice(0,5).map(p => <div key={p.id} className="flex items-center gap-3 border-b border-[#edf2f1] py-3 last:border-0"><span className="min-w-0 flex-1 truncate text-sm font-bold text-[#45616b]">{p.title}</span><StatusPill status={p.status} /><Link href={`/projects/${p.id}`} className="text-xs font-bold text-[#2f7b84]" data-testid={`admin-view-project-${p.id}`}>Review</Link></div>)}</section><section className="rounded-2xl border border-[#dce9e8] bg-white p-5"><h2 className="font-display font-extrabold text-[#244958]">Support queue</h2>{!disputeRows.length ? <EmptyState title="All clear for now" text="Open disputes requiring attention will be listed here." /> : disputeRows.filter(d => d.status === 'open').slice(0,5).map(d => <div key={d.id} className="flex items-center gap-3 border-b border-[#edf2f1] py-3 last:border-0"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#45616b]">{d.projectTitle}</span><span className="text-xs text-[#84969a]">{d.reason}</span></span><StatusPill status={d.status} /></div>)}</section></div></>}
    {route === '/admin/users' && <AdminList title="Registered members" description={`${users.data?.length || 0} accounts on the marketplace.`} isEmpty={!users.data?.length} emptyTitle="No members found" emptyText="New accounts will be listed here." ><div className="divide-y divide-[#edf2f1]">{users.data?.map(user => <div key={user.id} className="flex flex-wrap items-center gap-4 py-4" data-testid={`row-user-${user.id}`}><span className="grid size-10 place-items-center rounded-full bg-[#e2efec] text-sm font-bold text-[#347875]">{initials(user.name)}</span><div className="min-w-[170px] flex-1"><Link href={`/profile/${user.id}`} className="font-bold text-[#355663] hover:text-[#177c91]">{user.name}</Link><span className="mt-1 block text-xs text-[#809197]">{user.email}</span></div><span className="rounded-full bg-[#edf5f3] px-3 py-1 text-xs font-bold capitalize text-[#4a7378]">{user.role || 'incomplete'}</span><span className="text-xs text-[#809197]">{user.completedProjects} completed</span></div>)}</div></AdminList>}
    {route === '/admin/projects' && <AdminList title="All projects" description={`${projects.data?.length || 0} briefs across every status.`} isEmpty={!projects.data?.length} emptyTitle="No projects yet" emptyText="Project briefs will appear here." ><div className="divide-y divide-[#edf2f1]">{projects.data?.map(project => <div key={project.id} className="flex flex-wrap items-center gap-4 py-4" data-testid={`row-admin-project-${project.id}`}><span className="min-w-[180px] flex-1"><Link href={`/projects/${project.id}`} className="font-bold text-[#355663] hover:text-[#177c91]">{project.title}</Link><span className="mt-1 block text-xs text-[#809197]">{project.businessName} · {project.category}</span></span><span className="text-sm font-bold text-[#3c7777]"><Money amount={project.minBudget} />–<Money amount={project.maxBudget} /></span><StatusPill status={project.status} /><Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#347984]">Open <ArrowUpRight size={13} /></Link></div>)}</div></AdminList>}
    {route === '/admin/disputes' && <AdminList title="Support cases" description="Review context and record a clear resolution." isEmpty={!disputeRows.length} emptyTitle="No cases to review" emptyText="Open support cases will be collected here." ><div className="space-y-3">{disputeRows.map(d => <article key={d.id} className="rounded-xl border border-[#e1ebea] p-4" data-testid={`row-dispute-${d.id}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href={`/projects/${d.projectId}`} className="font-display font-extrabold text-[#345562] hover:text-[#177c91]">{d.projectTitle}</Link><p className="mt-1 text-xs text-[#87979c]">Opened by {d.openedBy} · {formatDate(d.createdAt)}</p></div><StatusPill status={d.status} /></div><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#607982]">{d.reason}</p>{d.resolution && <p className="mt-2 rounded-lg bg-[#f1f7f5] p-3 text-sm text-[#56777a]">Resolution: {d.resolution}</p>}{d.status === 'open' && <div className="mt-4 flex flex-wrap gap-2">{([['release_to_student','Release to student'],['refund_business','Refund business'],['dismiss','Dismiss case']] as const).map(([resolution, label]) => <button key={resolution} onClick={() => { const note = window.prompt('Add a brief resolution note (optional).') || ''; resolve.mutate({ disputeId: d.id, data: { resolution, note } }, { onSuccess: () => { setError(''); client.invalidateQueries({ queryKey: getListDisputesQueryKey() }); client.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }); }, onError: () => setError('The resolution could not be saved. Please retry.') }); }} disabled={resolve.isPending} className={`rounded-lg px-3 py-2 text-xs font-bold ${resolution === 'dismiss' ? 'border border-[#dce9e8] text-[#627b84]' : 'bg-[#e7f3ef] text-[#377568] hover:bg-[#d7ebe4]'}`} data-testid={`button-resolve-${resolution}-${d.id}`}>{label}</button>)}</div>}</article>)}</div></AdminList>}
    {route === '/admin/payments' && <AdminList title="Payments" description="Track funds held, released, or returned across projects." isEmpty={!payments.data?.length} emptyTitle="No payment activity yet" emptyText="Payments will be listed as projects move through the marketplace." ><div className="divide-y divide-[#edf2f1]">{payments.data?.map(payment => <div key={payment.id} className="flex flex-wrap items-center gap-4 py-4" data-testid={`row-payment-${payment.id}`}><span className="grid size-10 place-items-center rounded-xl bg-[#e7f3f0] text-[#37817a]"><Banknote size={19} /></span><span className="min-w-[180px] flex-1"><Link href={`/projects/${payment.projectId}`} className="font-bold text-[#355663] hover:text-[#177c91]">{payment.projectTitle}</Link><span className="mt-1 block text-xs text-[#809197]">Updated {formatDate(payment.updatedAt)}</span></span><strong className="font-display text-lg text-[#315d61]"><Money amount={payment.amount} /></strong><StatusPill status={payment.status} /></div>)}</div></AdminList>}
  </div>;
}
function AdminList({ title, description, children, isEmpty, emptyTitle, emptyText }: { title: string; description: string; children: ReactNode; isEmpty: boolean; emptyTitle: string; emptyText: string }) {
  return <section className="rounded-2xl border border-[#dce9e8] bg-white p-5 md:p-7"><div className="border-b border-[#edf2f1] pb-4"><h2 className="font-display text-lg font-extrabold text-[#244958]">{title}</h2><p className="mt-1 text-sm text-[#71868e]">{description}</p></div>{isEmpty ? <EmptyState title={emptyTitle} text={emptyText} /> : children}</section>;
}

function Guarded({ children }: { children: ReactNode }) {
  return <><Show when="signed-in"><ProfileGate>{children}</ProfileGate></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}
function PublicAccess({ children }: { children: ReactNode }) {
  return <><Show when="signed-in"><ProfileGate>{children}</ProfileGate></Show><Show when="signed-out"><PublicNav /><main className="mx-auto max-w-[1360px] px-5 py-8 md:px-10">{children}</main><Footer /></Show></>;
}
function ProfileGate({ children }: { children: ReactNode }) {
  const { data: me, isLoading, isError, refetch } = useGetCurrentUser();
  const [location] = useLocation();
  if (isLoading) return <div className="min-h-[60vh] p-7"><SkeletonRows /></div>;
  if (isError || !me) return <main className="mx-auto max-w-3xl p-7"><PageHeading title="Your account is taking a moment" text="We couldn’t load your account details." /><ErrorState retry={() => refetch()} /></main>;
  if (!me.role && location !== '/onboarding') return <Redirect to="/onboarding" />;
  return <PrivateShell>{children}</PrivateShell>;
}
function HomeRedirect() {
  return <><Show when="signed-in"><SignedInLanding /></Show><Show when="signed-out"><Landing /></Show></>;
}
function SignedInLanding() {
  const { data: me, isLoading, isError, refetch } = useGetCurrentUser();
  if (isLoading) return <div className="min-h-[70vh] p-7"><SkeletonRows /></div>;
  if (isError || !me) return <main className="mx-auto max-w-3xl p-7"><PageHeading title="Welcome back" /><ErrorState retry={() => refetch()} /></main>;
  return <Redirect to={me.role ? '/dashboard' : '/onboarding'} />;
}
function ProtectedPage({ children }: { children: ReactNode }) { return <Guarded><ErrorBoundary>{children}</ErrorBoundary></Guarded>; }
function ClerkSignIn() { return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>; }
function ClerkSignUp() { return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>; }
function AuthFrame({ children }: { children: ReactNode }) { return <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_80%_15%,rgba(174,222,215,.55),transparent_38%),#f2f8f6]"><PublicNav /><main className="mx-auto flex max-w-[1100px] flex-col items-center gap-8 px-4 pb-12 pt-4 md:flex-row md:items-center md:justify-between md:px-10 md:pt-12"><div className="hidden max-w-md md:block"><span className="text-xs font-extrabold uppercase tracking-[.18em] text-[#248283]">Welcome to WebEarn</span><h1 className="font-display mt-4 text-5xl font-extrabold leading-[1.05] tracking-[-.06em] text-[#173f50]">Real people.<br /><span className="text-[#198d8d]">Good work.</span></h1><p className="mt-5 text-lg leading-8 text-[#5d7780]">A practical place for small businesses to get online and for student creators to build their next opportunity.</p><div className="mt-8 flex items-center gap-3 rounded-2xl border border-[#d9e8e6] bg-white/75 p-4"><ShieldCheck className="text-[#25857d]" size={22} /><p className="text-sm leading-6 text-[#58737c]">Clear project expectations make better collaborations for everyone.</p></div></div><div className="w-full max-w-[460px]">{children}</div></main></div>; }

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/sign-in/*?" component={ClerkSignIn} />
    <Route path="/sign-up/*?" component={ClerkSignUp} />
    <Route path="/onboarding"><ProtectedPage><Onboarding /></ProtectedPage></Route>
    <Route path="/dashboard"><ProtectedPage><Dashboard /></ProtectedPage></Route>
    <Route path="/projects"><PublicAccess><ProjectsPage /></PublicAccess></Route>
    <Route path="/projects/new"><ProtectedPage><ProjectForm /></ProtectedPage></Route>
    <Route path="/projects/:id/workspace"><ProtectedPage><WorkspacePage /></ProtectedPage></Route>
    <Route path="/projects/:id"><PublicAccess><ProjectDetails /></PublicAccess></Route>
    <Route path="/profile/:userId"><PublicAccess><PublicProfilePage /></PublicAccess></Route>
    <Route path="/admin"><ProtectedPage><AdminPage /></ProtectedPage></Route>
    <Route path="/admin/users"><ProtectedPage><AdminPage /></ProtectedPage></Route>
    <Route path="/admin/projects"><ProtectedPage><AdminPage /></ProtectedPage></Route>
    <Route path="/admin/disputes"><ProtectedPage><AdminPage /></ProtectedPage></Route>
    <Route path="/admin/payments"><ProtectedPage><AdminPage /></ProtectedPage></Route>
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to continue your work on WebEarn.' } }, signUp: { start: { title: 'Join WebEarn', subtitle: 'Create an account and find your next good match.' } } }}
    routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><TooltipProvider><ClerkCacheReset /><WouterRouter base={basePath}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>
  </ClerkProvider>;
}
function App() { return <ClerkProviderWithRoutes />; }
export default App;
