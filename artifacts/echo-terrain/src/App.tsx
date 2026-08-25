import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ArrowUpRight, BookOpen, Check, ChevronRight, Compass, Copy, FileText, History, Menu, Orbit, RotateCcw, Save, Sparkles, Trash2, X } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const STORAGE_KEY = 'echo-terrain-journal-v1';

type Coordinates = {
  turbulence: number;
  brightness: number;
  density: number;
  velocity: number;
  synergy: number;
};

type Entry = {
  id: string;
  createdAt: string;
  text: string;
  title: string;
  coords: Coordinates;
  insight: string;
};

const metricConfig: { key: keyof Coordinates; label: string; caption: string; color: string }[] = [
  { key: 'turbulence', label: 'Turbulence', caption: 'inner weather', color: '#ee8c68' },
  { key: 'brightness', label: 'Brightness', caption: 'available light', color: '#d9ed63' },
  { key: 'density', label: 'Density', caption: 'thought mass', color: '#80cbc0' },
  { key: 'velocity', label: 'Velocity', caption: 'thought speed', color: '#c5a2e5' },
  { key: 'synergy', label: 'Synergy', caption: 'parts in accord', color: '#f3c889' },
];

const defaultCoords: Coordinates = { turbulence: 0, brightness: 0, density: 0, velocity: 0, synergy: 0 };

function hashText(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function analyzeEntry(text: string): Coordinates {
  const hash = hashText(text);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const punctuation = (text.match(/[!?]/g) || []).length;
  const sentences = Math.max(1, (text.match(/[.!?]/g) || []).length);
  return {
    turbulence: Math.min(98, 18 + ((hash >>> 2) % 57) + punctuation * 4),
    brightness: Math.min(98, 26 + ((hash >>> 8) % 54) + (words.length > 75 ? 8 : 0)),
    density: Math.min(98, 20 + ((hash >>> 14) % 46) + Math.min(22, words.length / 5)),
    velocity: Math.min(98, 14 + ((hash >>> 20) % 61) + Math.min(18, sentences * 2)),
    synergy: Math.min(98, 23 + ((hash >>> 26) % 56) + (words.length % 7)),
  };
}

function makeInsight(coords: Coordinates) {
  const sorted = [...metricConfig].sort((a, b) => coords[b.key] - coords[a.key]);
  const lead = sorted[0];
  const second = sorted[1];
  const insights: Record<keyof Coordinates, string> = {
    turbulence: 'A live weather system. Your thoughts are moving quickly, but motion is not the same as danger.',
    brightness: 'A clear seam in the cloud cover. Something small is giving the whole field more visibility.',
    density: 'Heavy mineral country. There is a lot here worth staying with; let the day have its full weight.',
    velocity: 'Fast-moving currents detected. Give the next thought somewhere gentle to land.',
    synergy: 'Several inner regions are speaking to one another. The pattern is more coherent than it first appeared.',
  };
  return `${insights[lead.key]} ${lead.label} is leading at ${Math.round(coords[lead.key])}, with ${second.label.toLowerCase()} close behind.`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date));
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(date));
}

function titleFromText(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return words.length ? `${words.join(' ')}${text.trim().split(/\s+/).length > 6 ? '…' : ''}` : 'Unnamed transmission';
}

function seededEntries(): Entry[] {
  return [];
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-echo-terrain">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(70_79%_62%/.45)] bg-[hsl(241_35%_16%)]">
        <span className="absolute h-5 w-5 rounded-full border border-[hsl(70_79%_62%/.9)]" />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-[hsl(70_79%_62%)]" />
        <span className="absolute h-8 w-px rotate-45 bg-[hsl(70_79%_62%/.35)]" />
      </div>
      <div>
        <p className="font-display text-lg leading-none text-[hsl(39_45%_97%)]">The Echo Terrain</p>
        <p className="mt-1 font-mono-ui text-[9px] uppercase tracking-[.2em] text-[hsl(70_79%_62%/.7)]">personal cartography</p>
      </div>
    </div>
  );
}

function SideNav({ entries, activeSection, onNavigate, mobileOpen, onClose }: {
  entries: Entry[];
  activeSection: string;
  onNavigate: (id: string) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-[hsl(241_35%_19%/.36)] md:hidden" onClick={onClose} aria-label="Close navigation" data-testid="button-close-navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-start justify-between">
          <BrandMark />
          <button className="rounded-lg p-2 text-[hsl(39_45%_97%/.6)] hover:bg-[hsl(242_28%_27%)] md:hidden" onClick={onClose} aria-label="Close navigation" data-testid="button-dismiss-navigation"><X size={17} /></button>
        </div>
        <div className="mt-12">
          <p className="px-3 font-mono-ui text-[10px] uppercase tracking-[.22em] text-[hsl(39_45%_97%/.42)]">Navigate</p>
          <nav className="mt-3 space-y-1" aria-label="Main navigation">
            <button className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${activeSection === 'journal' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(39_45%_97%/.66)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(39_45%_97%)]'}`} onClick={() => { onNavigate('journal'); onClose(); }} data-testid="button-nav-journal">
              <FileText size={17} strokeWidth={1.7} /><span>New entry</span><ChevronRight className="ml-auto opacity-40 transition-transform group-hover:translate-x-0.5" size={14} />
            </button>
            <button className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${activeSection === 'history' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(39_45%_97%/.66)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(39_45%_97%)]'}`} onClick={() => { onNavigate('history'); onClose(); }} data-testid="button-nav-history">
              <History size={17} strokeWidth={1.7} /><span>Expedition history</span><span className="ml-auto font-mono-ui text-[10px] opacity-50">{entries.length.toString().padStart(2, '0')}</span>
            </button>
            <button className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[hsl(39_45%_97%/.66)] transition-colors hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(39_45%_97%)]" onClick={() => { onNavigate('prophecy'); onClose(); }} data-testid="button-nav-prophecy">
              <Orbit size={17} strokeWidth={1.7} /><span>Cycle prophecy</span><span className="ml-auto font-mono-ui text-[9px] uppercase tracking-wider opacity-40">new</span>
            </button>
          </nav>
        </div>
        <div className="mt-auto rounded-2xl border border-[hsl(39_45%_97%/.13)] bg-[hsl(242_28%_27%/.5)] p-4">
          <div className="flex items-center gap-2 text-[hsl(var(--sidebar-primary))]"><Compass size={15} /><span className="font-mono-ui text-[10px] uppercase tracking-[.16em]">Field note</span></div>
          <p className="mt-3 font-display text-[17px] leading-snug text-[hsl(39_45%_97%/.9)]">There is no wrong weather on a private planet.</p>
          <div className="mt-4 h-px bg-[hsl(39_45%_97%/.12)]" />
          <p className="mt-3 font-mono-ui text-[9px] uppercase tracking-[.13em] text-[hsl(39_45%_97%/.4)]">stored in this browser only</p>
        </div>
      </aside>
    </>
  );
}

function Terrain({ coords, timelapse, title }: { coords: Coordinates; timelapse: number; title: string }) {
  const active = Object.values(coords).some(Boolean);
  const points = [
    [178, 74], [251, 105], [274, 184], [246, 266], [174, 306], [103, 279], [73, 204], [92, 124],
  ];
  const contourPaths = [
    'M92 124 C129 103 174 108 203 132 C234 157 239 209 222 244 C204 279 152 288 118 264 C82 239 74 179 92 124Z',
    'M111 143 C143 125 177 130 200 150 C220 168 222 207 208 232 C190 259 153 267 126 250 C98 233 93 167 111 143Z',
    'M132 162 C152 151 179 155 193 171 C207 188 204 215 190 229 C173 246 148 244 131 230 C115 216 115 174 132 162Z',
    'M150 181 C164 175 181 180 186 193 C191 206 182 220 169 223 C154 226 143 213 145 199 C145 190 147 185 150 181Z',
  ];
  const scaled = points.map(([x, y]) => `${178 + (x - 178) * (0.82 + timelapse * .045)},${190 + (y - 190) * (0.82 + timelapse * .045)}`).join(' ');
  return (
    <div className="terrain-card overflow-hidden rounded-[1.35rem] bg-[hsl(241_35%_19%)] text-[hsl(39_45%_97%)]">
      <div className="flex items-start justify-between border-b border-[hsl(39_45%_97%/.12)] px-5 py-4 sm:px-7">
        <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] pulse-soft" /><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(70_79%_62%/.84)]">live terrain render</p></div><h2 className="mt-2 font-display text-2xl">{active ? 'The shape of today' : 'A planet awaiting weather'}</h2></div>
        <span className="font-mono-ui text-[10px] text-[hsl(39_45%_97%/.38)]">ET—{active ? '07' : '00'}</span>
      </div>
      <div className="relative aspect-[1.22/1] min-h-[320px] overflow-hidden bg-[radial-gradient(circle_at_52%_47%,_hsl(175_44%_33%/.62),_hsl(241_35%_19%)_67%)]">
        <svg viewBox="0 0 360 380" className={`h-full w-full transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-70'}`} role="img" aria-label={active ? `Terrain map for ${title}` : 'Empty terrain map'}>
          <defs>
            <filter id="softTerrain"><feGaussianBlur stdDeviation="5" /></filter>
            <radialGradient id="planetGlow"><stop stopColor="#d9ed63" stopOpacity=".28" /><stop offset="1" stopColor="#80cbc0" stopOpacity="0" /></radialGradient>
            <linearGradient id="landFill" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#6fbdb2" stopOpacity=".85" /><stop offset=".55" stopColor="#2c7975" stopOpacity=".88" /><stop offset="1" stopColor="#1d4b58" stopOpacity=".9" /></linearGradient>
          </defs>
          <circle cx="184" cy="193" r="145" fill="url(#planetGlow)" filter="url(#softTerrain)" />
          <g className="terrain-grid">{[52, 88, 124, 160, 196, 232, 268, 304].map((value) => <line key={`v-${value}`} x1={value} y1="46" x2={value + 100} y2="335" />)}{[78, 114, 150, 186, 222, 258, 294].map((value) => <line key={`h-${value}`} x1="35" y1={value} x2="325" y2={value - 25} />)}<path d="M40 121 Q175 77 324 121 M30 207 Q177 161 330 202 M52 286 Q180 248 309 273" /></g>
          {active ? <><polygon points={scaled} fill="url(#landFill)" stroke="#d9ed63" strokeOpacity=".72" strokeWidth="1.5" /><g opacity={.35 + timelapse * .1}>{contourPaths.slice(0, timelapse).map((path) => <path key={path} d={path} className="topo-line" />)}</g><circle cx="169" cy="201" r="5" fill="#d9ed63" /><circle cx="169" cy="201" r="11" fill="none" stroke="#d9ed63" strokeOpacity=".42"><animate attributeName="r" values="8;18;8" dur="3s" repeatCount="indefinite" /></circle><path d="M169 201 L199 175" stroke="#d9ed63" strokeWidth="1" strokeDasharray="3 4" /><text x="204" y="173" fill="#d9ed63" fontSize="8" fontFamily="DM Mono">YOU ARE HERE</text></> : <><circle cx="178" cy="190" r="57" fill="none" stroke="#d9ed63" strokeOpacity=".22" strokeDasharray="2 7" /><circle cx="178" cy="190" r="4" className="star" /><text x="146" y="244" fill="#f7f2e7" fillOpacity=".6" fontSize="9" fontFamily="DM Mono" letterSpacing="1">WRITE TO BEGIN</text></>}
          <g>{[[62, 80], [283, 90], [294, 308], [74, 302], [322, 182], [45, 233]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.2 : 1.8} className="star" opacity={.38 + i * .1} />)}</g>
        </svg>
        <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between font-mono-ui text-[9px] uppercase tracking-[.14em] text-[hsl(39_45%_97%/.42)]"><span>longitude 14.08</span><span>latitude 42.71</span></div>
      </div>
      <div className="flex items-center justify-between border-t border-[hsl(39_45%_97%/.12)] px-5 py-3.5 sm:px-7"><span className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-[hsl(39_45%_97%/.48)]">topography / {timelapse} contours</span><span className="flex items-center gap-1.5 text-[10px] text-[hsl(70_79%_62%/.72)]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /> local coordinates</span></div>
    </div>
  );
}

function MetricStrip({ coords }: { coords: Coordinates }) {
  return (
    <section className="reveal-delay-2 reveal grid grid-cols-2 gap-px overflow-hidden rounded-[1.15rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card-border))] sm:grid-cols-5" aria-label="Emotional coordinates">
      {metricConfig.map((metric, index) => <div className="bg-[hsl(var(--card))] p-4 sm:p-5" key={metric.key} data-testid={`metric-${metric.key}`}>
        <div className="flex items-center justify-between"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: metric.color }} /><span className="font-mono-ui text-[11px] text-[hsl(var(--muted-foreground))]">0{index + 1}</span></div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{metric.label}</p>
        <p className="mt-1 font-display text-3xl text-[hsl(var(--foreground))]">{Math.round(coords[metric.key])}<span className="ml-1 text-sm text-[hsl(var(--muted-foreground))]">/100</span></p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${coords[metric.key]}%`, backgroundColor: metric.color }} /></div>
        <p className="mt-2 font-mono-ui text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{metric.caption}</p>
      </div>)}
    </section>
  );
}

function JournalComposer({ text, setText, onSave, saving, onClear, savedAt }: { text: string; setText: (value: string) => void; onSave: () => void; saving: boolean; onClear: () => void; savedAt: string | null }) {
  return (
    <section id="journal" className="reveal rounded-[1.35rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] sm:p-7">
      <div className="flex items-start justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">01 / field journal</p><h1 className="mt-3 max-w-md font-display text-[clamp(2.2rem,4vw,3.8rem)] leading-[.98] tracking-[-.03em] text-[hsl(var(--foreground))]">What is the weather inside you?</h1></div><span className="hidden rounded-full border border-[hsl(var(--border))] px-3 py-1 font-mono-ui text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] sm:block">local / private</span></div>
      <p className="mt-5 max-w-lg text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Put down the unedited version. Echo Terrain will translate your words into a place you can return to.</p>
      <label htmlFor="entry-text" className="sr-only">Write your field journal entry</label>
      <textarea id="entry-text" value={text} onChange={(event) => setText(event.target.value)} placeholder="The day began with..." className="write-area mt-7 min-h-[190px] w-full resize-y rounded-xl border border-[hsl(var(--border))] bg-[hsl(38_42%_93%/.48)] p-4 text-[15px] leading-7 text-[hsl(var(--foreground))] transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--card))] focus:outline-none dark:bg-[hsl(241_35%_11%/.3)]" data-testid="input-journal-entry" />
      <div className="mt-3 flex items-center justify-between"><span className="font-mono-ui text-[10px] text-[hsl(var(--muted-foreground))]">{text.length} characters</span>{text.length > 0 && <button onClick={onClear} className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--destructive))]" data-testid="button-clear-entry"><RotateCcw size={13} /> clear draft</button>}</div>
      <div className="mt-6 flex flex-col gap-3 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">{savedAt ? <><Check size={14} className="text-[hsl(var(--primary))]" /><span data-testid="status-entry-saved">Archived locally at {savedAt}</span></> : <><Save size={14} /><span>Nothing leaves this browser</span></>}</div><button disabled={!text.trim() || saving} onClick={onSave} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_hsl(175_44%_33%/.24)] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-analyze-save">{saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--primary-foreground)/.35)] border-t-[hsl(var(--primary-foreground))]" /> mapping terrain...</> : <><Sparkles size={16} /> analyze & archive</>}</button></div>
    </section>
  );
}

function ExplorerLog({ entry }: { entry: Entry | null }) {
  return (
    <section className="reveal-delay-3 reveal rounded-[1.35rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] sm:p-7">
      <div className="flex items-start justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">02 / explorer's log</p><h2 className="mt-3 font-display text-2xl text-[hsl(var(--foreground))]">A note from the instruments</h2></div><BookOpen size={19} strokeWidth={1.5} className="text-[hsl(var(--muted-foreground))]" /></div>
      {entry ? <div className="mt-7"><div className="rounded-lg border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--muted)/.5)] px-4 py-3"><p className="font-mono-ui text-[9px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))]">{formatLongDate(entry.createdAt)}</p><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--foreground))]" data-testid="text-explorer-insight">{entry.insight}</p></div><div className="mt-6 flex items-center justify-between"><div><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">current expedition</p><p className="mt-1 max-w-[220px] truncate font-display text-base" data-testid="text-current-entry-title">{entry.title}</p></div><button className="rounded-lg border border-[hsl(var(--border))] p-2.5 text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]" onClick={() => navigator.clipboard?.writeText(entry.insight)} aria-label="Copy explorer note" data-testid="button-copy-insight"><Copy size={15} /></button></div></div> : <div className="mt-7 rounded-xl border border-dashed border-[hsl(var(--border))] p-6"><p className="font-display text-lg text-[hsl(var(--foreground))]">Your instruments are quiet.</p><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Archive a thought and a reading will appear here — not a diagnosis, just a different way to look.</p></div>}
    </section>
  );
}

function HistoryPanel({ entries, selectedId, onSelect, onDelete }: { entries: Entry[]; selectedId: string | null; onSelect: (entry: Entry) => void; onDelete: (id: string) => void }) {
  return (
    <section id="history" className="rounded-[1.35rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] sm:p-7">
      <div className="flex items-end justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">03 / expedition history</p><h2 className="mt-3 font-display text-2xl text-[hsl(var(--foreground))]">Past weather systems</h2></div><span className="font-mono-ui text-[10px] text-[hsl(var(--muted-foreground))]">{entries.length.toString().padStart(2, '0')} readings</span></div>
      {entries.length ? <div className="mt-6 grid gap-2">{entries.map((entry) => <div key={entry.id} className={`group flex items-center gap-3 rounded-xl border p-3 transition-all ${selectedId === entry.id ? 'border-[hsl(var(--primary)/.55)] bg-[hsl(var(--primary)/.06)]' : 'border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.5)]'}`} data-testid={`row-history-${entry.id}`}><button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onSelect(entry)} data-testid={`button-select-history-${entry.id}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--sidebar))] font-mono-ui text-[10px] text-[hsl(var(--accent))]">{formatDate(entry.createdAt).split(' ')[1]}</div><div className="min-w-0"><p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">{entry.title}</p><p className="mt-1 font-mono-ui text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{formatLongDate(entry.createdAt)} · {Math.round(entry.coords.synergy)} synergy</p></div></button><button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] opacity-60 transition-all hover:bg-[hsl(var(--destructive)/.1)] hover:text-[hsl(var(--destructive))] md:opacity-0 md:group-hover:opacity-100" onClick={() => onDelete(entry.id)} aria-label={`Delete ${entry.title}`} data-testid={`button-delete-history-${entry.id}`}><Trash2 size={14} /></button><ChevronRight size={15} className={`mr-1 text-[hsl(var(--muted-foreground))] transition-transform ${selectedId === entry.id ? 'text-[hsl(var(--primary))]' : 'opacity-30 group-hover:translate-x-0.5'}`} /></div>)}</div> : <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-[hsl(var(--border))] px-6 py-12 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--primary))]"><History size={20} strokeWidth={1.5} /></div><p className="mt-4 font-display text-lg">No expeditions yet</p><p className="mt-1 max-w-xs text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Your first archived entry will give this atlas its first landmark.</p></div>}
    </section>
  );
}

function Prophecy({ entry, revealed, onReveal }: { entry: Entry | null; revealed: boolean; onReveal: () => void }) {
  const prophecy = entry ? `The next passage opens through ${entry.coords.brightness > entry.coords.turbulence ? 'a clearing' : 'the turning weather'}. Keep one small promise to yourself before the day changes shape. It will become a marker.` : 'Archive a reading to reveal the next movement in your cycle.';
  return (
    <section id="prophecy" className="relative overflow-hidden rounded-[1.35rem] bg-[hsl(175_44%_33%)] p-6 text-[hsl(39_45%_97%)] sm:p-8"><div className="absolute -right-12 -top-20 h-60 w-60 rounded-full border border-[hsl(70_79%_62%/.2)]" /><div className="absolute -right-2 -top-10 h-40 w-40 rounded-full border border-[hsl(70_79%_62%/.16)]" /><div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(70_79%_62%)]">04 / planetary cycle</p><h2 className="mt-3 max-w-md font-display text-3xl leading-tight">A small prophecy for the next orbit</h2><p className={`mt-4 max-w-lg text-sm leading-relaxed text-[hsl(39_45%_97%/.7)] transition-all duration-500 ${revealed ? 'opacity-100' : 'opacity-65'}`} data-testid="text-cycle-prophecy">{revealed ? prophecy : 'The atlas keeps its future folded until you are ready to look.'}</p></div><button onClick={onReveal} disabled={!entry} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-5 py-3 text-sm font-semibold text-[hsl(var(--accent-foreground))] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-reveal-prophecy">{revealed ? 'read again' : 'reveal prophecy'} <ArrowUpRight size={15} /></button></div><div className="relative mt-8 flex items-center gap-4 border-t border-[hsl(39_45%_97%/.18)] pt-4 font-mono-ui text-[9px] uppercase tracking-[.16em] text-[hsl(39_45%_97%/.45)]"><span>cycle 01</span><span className="h-px w-8 bg-[hsl(70_79%_62%/.7)]" /><span>{entry ? `${formatDate(entry.createdAt)} reading` : 'awaiting first reading'}</span></div></section>
  );
}

function Home() {
  const [entries, setEntries] = useState<Entry[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seededEntries(); } catch { return seededEntries(); }
  });
  const [text, setText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timelapse, setTimelapse] = useState(3);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [prophecyRevealed, setProphecyRevealed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('journal');

  const selectedEntry = useMemo(() => entries.find((entry) => entry.id === selectedId) || entries[0] || null, [entries, selectedId]);
  const coords = selectedEntry?.coords || defaultCoords;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }, [entries]);

  const navigateTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveEntry = () => {
    if (!text.trim()) return;
    setSaving(true);
    window.setTimeout(() => {
      const coordsForEntry = analyzeEntry(text);
      const newEntry: Entry = { id: `${Date.now()}-${hashText(text)}`, createdAt: new Date().toISOString(), text: text.trim(), title: titleFromText(text), coords: coordsForEntry, insight: makeInsight(coordsForEntry) };
      setEntries((current) => [newEntry, ...current]);
      setSelectedId(newEntry.id);
      setText('');
      setSavedAt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()));
      setSaving(false);
      setProphecyRevealed(false);
    }, 650);
  };

  const deleteEntry = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="app-shell grain">
      <SideNav entries={entries} activeSection={activeSection} onNavigate={navigateTo} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="min-h-[100dvh] md:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border)/.75)] bg-[hsl(var(--background)/.88)] px-5 backdrop-blur-md sm:px-8 lg:px-12">
          <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={19} /></button><span className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Field station / <span className="text-[hsl(var(--primary))]">Sector 07</span></span></div>
          <div className="flex items-center gap-3"><span className="hidden font-mono-ui text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))] sm:block">atlas status</span><span className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-3 py-1.5 font-mono-ui text-[9px] uppercase tracking-wider text-[hsl(var(--primary))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" /> local</span></div>
        </header>
        <div className="mx-auto max-w-[1450px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">personal emotional atlas</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">A quiet place to notice where you are.</p></div><div className="font-mono-ui text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{entries.length ? `${entries.length} archived ${entries.length === 1 ? 'reading' : 'readings'}` : 'first orbit / not yet mapped'}</div></div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,.94fr)_minmax(480px,1.06fr)]"><JournalComposer text={text} setText={setText} onSave={saveEntry} saving={saving} onClear={() => { setText(''); setSavedAt(null); }} savedAt={savedAt} /><div className="reveal reveal-delay-1"><Terrain coords={coords} timelapse={timelapse} title={selectedEntry?.title || 'unmapped terrain'} /><div className="mt-4 rounded-xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-4 py-3 shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between"><label htmlFor="timelapse" className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">terrain time-lapse</label><span className="font-mono-ui text-[10px] text-[hsl(var(--primary))]" data-testid="text-timelapse-value">0{timelapse} / 05</span></div><input id="timelapse" type="range" min="1" max="5" value={timelapse} onChange={(event) => setTimelapse(Number(event.target.value))} className="mt-3 h-1 w-full cursor-pointer accent-[hsl(var(--primary))]" data-testid="input-terrain-timelapse" /><div className="mt-1 flex justify-between font-mono-ui text-[8px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><span>first impression</span><span>deep survey</span></div></div></div></div>
          <div className="mt-6"><MetricStrip coords={coords} /></div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><ExplorerLog entry={selectedEntry} /><HistoryPanel entries={entries} selectedId={selectedEntry?.id || null} onSelect={(entry) => { setSelectedId(entry.id); setActiveSection('history'); }} onDelete={deleteEntry} /></div>
          <div className="mt-6"><Prophecy entry={selectedEntry} revealed={prophecyRevealed} onReveal={() => setProphecyRevealed(true)} /></div>
          <footer className="flex flex-col gap-2 pb-4 pt-10 font-mono-ui text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between"><span>the echo terrain / made for your inner weather</span><span>no account · no cloud · no audience</span></footer>
        </div>
      </main>
    </div>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;