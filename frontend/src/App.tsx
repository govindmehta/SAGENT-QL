import {
  Database,
  FileSpreadsheet,
  MessageSquareText,
  Settings2,
} from 'lucide-react';

const capabilities = [
  {
    icon: Database,
    title: 'Local SQL engine',
    description: 'Query data with a synchronous SQLite layer that stays on device.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Spreadsheet scanning',
    description: 'Parse Excel files locally and route them into the agent loop.',
  },
  {
    icon: MessageSquareText,
    title: 'Manual agent loop',
    description: 'Own chat history, tool matching, and execution without wrapper SDKs.',
  },
];

export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
              Local-first agent
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              SAGENT-QL
            </h1>
          </div>
          <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 p-3 text-cyan-300 shadow-glow">
            <Settings2 className="h-5 w-5" />
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.35fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              Vite + React 19 frontend with Tailwind CSS
            </div>
            <h2 className="max-w-2xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Build a private SQL and spreadsheet AI agent without wrapper SDKs.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              This starter gives you a decoupled frontend and backend so you can wire chat,
              tool selection, and execution directly against the raw model and local data.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Gemini SDK ready
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                SQLite + ExcelJS
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Express API bridge
              </span>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 transition hover:border-cyan-300/30 hover:bg-slate-900"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
