import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ChatRole = 'user' | 'agent';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  tone?: 'normal' | 'error';
};

type SessionSummary = {
  id: string;
  title: string;
  preview: string;
};

type ChatApiPayload = {
  response?: string;
  error?: string;
};

const initialSessionId = 'session-1';
const chatEndpoint = 'http://localhost:3001/api/chat';

const initialSessions: SessionSummary[] = [
  {
    id: initialSessionId,
    title: 'Session 1',
    preview: 'Ready when you are.',
  },
];

function createSessionId() {
  return `session-${Date.now()}`;
}

function createMessageId() {
  return crypto.randomUUID();
}

function getSessionTitle(index: number) {
  return `Session ${index + 1}`;
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 text-zinc-500">
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400/80"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400/80"
        style={{ animationDelay: '120ms' }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400/80"
        style={{ animationDelay: '240ms' }}
      />
      <span className="ml-2 text-xs font-medium tracking-wide text-zinc-400">Thinking...</span>
    </div>
  );
}

function SessionItem({
  session,
  active,
  onSelect,
}: {
  session: SessionSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-2xl px-3 py-3 text-left transition ${
        active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2 w-2 rounded-full transition ${
            active ? 'bg-zinc-100' : 'bg-zinc-300 group-hover:bg-zinc-400'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium tracking-tight">{session.title}</div>
          <div className={`mt-1 truncate text-xs leading-5 ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {session.preview}
          </div>
        </div>
      </div>
    </button>
  );
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-zinc-950">{children}</strong>,
        em: ({ children }) => <em className="italic text-inherit">{children}</em>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-zinc-300 pl-4 text-zinc-600">{children}</blockquote>
        ),
        code: ({ inline, className, children }) => {
          if (inline) {
            return (
              <code className="rounded-md bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[0.86em] text-zinc-900">
                {children}
              </code>
            );
          }

          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="my-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-950 px-4 py-4 text-[13px] leading-6 text-zinc-100 shadow-sm">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-zinc-100/90 text-zinc-700">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-zinc-200 bg-white">{children}</tbody>,
        tr: ({ children }) => <tr className="border-zinc-200">{children}</tr>,
        th: ({ children }) => (
          <th className="border-b border-zinc-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
            {children}
          </th>
        ),
        td: ({ children }) => <td className="border-b border-zinc-100 px-4 py-3 align-top text-zinc-800">{children}</td>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function AgentMessageBubble({ message }: { message: ChatMessage }) {
  const isError = message.tone === 'error';

  if (isError) {
    return (
      <div className="max-w-[82%] rounded-3xl rounded-bl-md border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm leading-7 text-amber-900 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
          System notice
        </div>
        <div className="leading-7 text-amber-900">
          <MarkdownContent text={message.text} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[82%] rounded-3xl rounded-bl-md border border-zinc-200/70 bg-zinc-100/70 px-4 py-3 text-sm leading-7 text-zinc-800 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
      <MarkdownContent text={message.text} />
    </div>
  );
}

export default function App() {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [draft, setDraft] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const messageStoreRef = useRef<Record<string, ChatMessage[]>>({
    [initialSessionId]: [],
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isPending, sessionId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [sessionId]);

  function syncSessionMessages(activeSessionId: string, nextMessages: ChatMessage[]) {
    messageStoreRef.current[activeSessionId] = nextMessages;
    setMessages(nextMessages);
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              preview: nextMessages.at(-1)?.text ?? 'Ready when you are.',
            }
          : session
      )
    );
  }

  function openSession(targetSessionId: string) {
    setSessionId(targetSessionId);
    setMessages(messageStoreRef.current[targetSessionId] ?? []);
  }

  function createNewConversation() {
    const newSessionId = createSessionId();
    messageStoreRef.current[newSessionId] = [];

    setSessions((current) => [
      ...current,
      {
        id: newSessionId,
        title: getSessionTitle(current.length),
        preview: 'Ready when you are.',
      },
    ]);

    setSessionId(newSessionId);
    setMessages([]);
    setDraft('');
  }

  async function handleSendMessage(text: string) {
    const trimmedText = text.trim();
    if (!trimmedText || isPending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      text: trimmedText,
    };

    const optimisticMessages = [...messages, userMessage];

    syncSessionMessages(sessionId, optimisticMessages);
    setDraft('');
    setIsPending(true);

    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messages: [
            {
              role: 'user',
              parts: [{ text: trimmedText }],
            },
          ],
        }),
      });

      const payload = (await response.json().catch(() => null)) as ChatApiPayload | null;

      if (payload?.error) {
        const errorMessage: ChatMessage = {
          id: createMessageId(),
          role: 'agent',
          text: payload.error,
          tone: 'error',
        };

        syncSessionMessages(sessionId, [...optimisticMessages, errorMessage]);
        return;
      }

      const agentText = payload?.response ?? 'No response received.';
      const agentMessage: ChatMessage = {
        id: createMessageId(),
        role: 'agent',
        text: agentText,
      };

      syncSessionMessages(sessionId, [...optimisticMessages, agentMessage]);
    } catch (error) {
      const agentMessage: ChatMessage = {
        id: createMessageId(),
        role: 'agent',
        text: error instanceof Error ? error.message : 'Network connection error.',
        tone: 'error',
      };

      syncSessionMessages(sessionId, [...optimisticMessages, agentMessage]);
    } finally {
      setIsPending(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-900">
      <div className="flex min-h-screen">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/90 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between px-1 pb-4 pt-1">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-zinc-500">
                Workspace
              </p>
              <h1 className="mt-2 text-sm font-semibold tracking-tight text-zinc-900">SAGENT-QL</h1>
            </div>
            <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500">
              Local
            </span>
          </div>

          <button
            type="button"
            onClick={createNewConversation}
            className="mb-4 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-800 shadow-[0_1px_0_rgba(255,255,255,0.7)] transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white">
              <Plus className="h-3.5 w-3.5" />
            </span>
            New Conversation
          </button>

          <div className="space-y-1 overflow-y-auto pr-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                active={session.id === sessionId}
                onSelect={() => openSession(session.id)}
              />
            ))}
          </div>

          <div className="mt-auto px-1 pb-1 pt-4 text-xs leading-5 text-zinc-500">
            Sessions persist locally through SQLite memory.
          </div>
        </aside>

        <section className="relative flex min-h-screen flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(247,247,245,1)_45%)]">
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 pb-36 pt-8 sm:px-6 lg:px-8">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                <div className="mb-4 flex items-center justify-between border-b border-zinc-200/70 pb-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-zinc-500">
                      Conversation
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900">
                      {sessions.find((session) => session.id === sessionId)?.title ?? 'Session'}
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-500 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                    {isPending ? 'Working' : 'Ready'}
                  </div>
                </div>

                {messages.length === 0 && !isPending ? (
                  <div className="rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center text-sm leading-6 text-zinc-500 shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                    Start with a question, a SQL prompt, or a spreadsheet path.
                  </div>
                ) : null}

                {messages.map((message) =>
                  message.role === 'user' ? (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[82%] rounded-3xl rounded-br-md bg-zinc-900 px-4 py-3 text-sm leading-7 text-white shadow-sm">
                        {message.text}
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="flex justify-start">
                      <AgentMessageBubble message={message} />
                    </div>
                  )
                )}

                {isPending ? (
                  <div className="flex justify-start">
                    <div className="rounded-3xl rounded-bl-md border border-zinc-200/70 bg-zinc-100/70 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                      <LoadingDots />
                    </div>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 sm:px-6 lg:px-8 lg:pb-6">
              <div className="mx-auto flex w-full max-w-3xl justify-center">
                <form
                  className="pointer-events-auto flex w-full items-end gap-3 rounded-full border border-zinc-200/80 bg-white/85 px-4 py-3 shadow-[0_18px_50px_rgba(24,24,27,0.08)] backdrop-blur-md"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSendMessage(draft);
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendMessage(draft);
                      }
                    }}
                    placeholder="Ask about sales, scan a file, or request a local query..."
                    className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || isPending}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                      draft.trim() && !isPending
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                        : 'border-zinc-200 bg-zinc-100 text-zinc-400'
                    }`}
                    aria-label="Send message"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
