import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  FileSpreadsheet,
  MoonStar,
  Paperclip,
  Plus,
  Sparkles,
  SunMedium,
  X,
} from 'lucide-react';
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

type UploadApiPayload = {
  success?: boolean;
  filePath?: string;
  originalName?: string;
  error?: string;
};

type AttachedFile = {
  name: string;
  path: string;
};

const initialSessionId = 'session-1';
const chatEndpoint = 'http://localhost:3001/api/chat';
const uploadEndpoint = 'http://localhost:3001/api/upload';

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

function LoadingDots({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-4 py-3 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '120ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '240ms' }} />
      <span className="ml-2 text-xs font-medium tracking-wide">Thinking...</span>
    </div>
  );
}

function SessionItem({
  session,
  active,
  onSelect,
  darkMode,
}: {
  session: SessionSummary;
  active: boolean;
  onSelect: () => void;
  darkMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-2xl px-3 py-3 text-left transition ${
        active
          ? 'bg-zinc-900 text-white'
          : darkMode
            ? 'text-zinc-200 hover:bg-zinc-900/70'
            : 'text-zinc-700 hover:bg-zinc-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2 w-2 rounded-full transition ${
            active ? 'bg-zinc-100' : darkMode ? 'bg-zinc-500 group-hover:bg-zinc-300' : 'bg-zinc-300 group-hover:bg-zinc-400'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium tracking-tight">{session.title}</div>
          <div className={`mt-1 truncate text-xs leading-5 ${active ? 'text-zinc-300' : darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {session.preview}
          </div>
        </div>
      </div>
    </button>
  );
}

function MarkdownContent({ text, darkMode }: { text: string; darkMode: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className={`font-semibold ${darkMode ? 'text-zinc-50' : 'text-zinc-950'}`}>{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-inherit">{children}</em>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`underline underline-offset-4 transition ${
              darkMode
                ? 'text-zinc-50 decoration-zinc-500 hover:decoration-zinc-300'
                : 'text-zinc-950 decoration-zinc-300 hover:decoration-zinc-500'
            }`}
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote
            className={`my-3 border-l-2 pl-4 ${darkMode ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-600'}`}
          >
            {children}
          </blockquote>
        ),
        code: ({ inline, className, children }) => {
          if (inline) {
            return (
              <code
                className={`rounded-md px-1.5 py-0.5 font-mono text-[0.86em] ${
                  darkMode ? 'bg-zinc-800 text-zinc-50' : 'bg-zinc-200/80 text-zinc-900'
                }`}
              >
                {children}
              </code>
            );
          }

          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre
            className={`my-4 overflow-x-auto rounded-2xl border px-4 py-4 text-[13px] leading-6 shadow-sm ${
              darkMode ? 'border-zinc-800 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-zinc-950 text-zinc-100'
            }`}
          >
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div
            className={`my-4 overflow-x-auto rounded-2xl border shadow-sm ${
              darkMode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'
            }`}
          >
            <table className="w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className={darkMode ? 'bg-zinc-900 text-zinc-200' : 'bg-zinc-100/90 text-zinc-700'}>{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className={darkMode ? 'divide-y divide-zinc-800 bg-zinc-950' : 'divide-y divide-zinc-200 bg-white'}>{children}</tbody>
        ),
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => (
          <th
            className={`border-b px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] ${
              darkMode ? 'border-zinc-800 text-zinc-300' : 'border-zinc-200 text-zinc-600'
            }`}
          >
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className={`border-b px-4 py-3 align-top ${darkMode ? 'border-zinc-900 text-zinc-200' : 'border-zinc-100 text-zinc-800'}`}>
            {children}
          </td>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function AgentMessageBubble({ message, darkMode }: { message: ChatMessage; darkMode: boolean }) {
  const isError = message.tone === 'error';

  if (isError) {
    return (
      <div
        className={`max-w-[82%] rounded-3xl rounded-bl-md border px-4 py-3 text-sm leading-7 shadow-[0_1px_0_rgba(255,255,255,0.8)] ${
          darkMode ? 'border-amber-900/60 bg-amber-950/50 text-amber-100' : 'border-amber-200/80 bg-amber-50/80 text-amber-900'
        }`}
      >
        <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
          System notice
        </div>
        <MarkdownContent text={message.text} darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div
      className={`max-w-[82%] rounded-3xl rounded-bl-md border px-4 py-3 text-sm leading-7 shadow-[0_1px_0_rgba(255,255,255,0.8)] ${
        darkMode ? 'border-zinc-800/80 bg-zinc-950/60 text-zinc-100' : 'border-zinc-200/70 bg-zinc-100/70 text-zinc-800'
      }`}
    >
      <MarkdownContent text={message.text} darkMode={darkMode} />
    </div>
  );
}

function UploadIcon({ isUploading }: { isUploading: boolean }) {
  return isUploading ? (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
  ) : (
    <Paperclip className="h-4 w-4" />
  );
}

export default function App() {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [draft, setDraft] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const messageStoreRef = useRef<Record<string, ChatMessage[]>>({
    [initialSessionId]: [],
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isPending, sessionId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [sessionId]);

  useEffect(() => {
    const handleDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) {
        return;
      }

      dragCounterRef.current += 1;
      setIsDraggingFile(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) {
        return;
      }

      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDraggingFile(false);
      }
    };

    const handleDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
      }
    };

    const handleDrop = () => {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

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
    setAttachedFile(null);
  }

  async function handleSendMessage(text: string) {
    const trimmedText = text.trim();
    if (!trimmedText || isPending) {
      return;
    }

    const outgoingAttachment = attachedFile;
    setAttachedFile(null);

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      text: trimmedText,
    };

    const currentMessages = messageStoreRef.current[sessionId] ?? messages;
    const optimisticMessages = [...currentMessages, userMessage];

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
          message: trimmedText,
          attachment: outgoingAttachment ? { name: outgoingAttachment.name, path: outgoingAttachment.path } : null,
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

      const agentMessage: ChatMessage = {
        id: createMessageId(),
        role: 'agent',
        text: payload?.response ?? 'No response received.',
      };

      syncSessionMessages(sessionId, [...optimisticMessages, agentMessage]);
    } catch {
      const agentMessage: ChatMessage = {
        id: createMessageId(),
        role: 'agent',
        text: 'Network connection error.',
        tone: 'error',
      };

      syncSessionMessages(sessionId, [...optimisticMessages, agentMessage]);
    } finally {
      setIsPending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleFileUpload(file: File) {
    if (isUploading) {
      return;
    }

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();

    if (!allowedExtensions.some((extension) => fileName.endsWith(extension))) {
      const errorMessage: ChatMessage = {
        id: createMessageId(),
        role: 'agent',
        text: 'Please upload a .xlsx, .xls, or .csv file.',
        tone: 'error',
      };
      syncSessionMessages(sessionId, [...(messageStoreRef.current[sessionId] ?? messages), errorMessage]);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as UploadApiPayload | null;

      if (!response.ok || !payload?.success || !payload.filePath) {
        throw new Error(payload?.error ?? 'Upload failed.');
      }

      setAttachedFile({
        name: payload.originalName ?? file.name,
        path: payload.filePath,
      });
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: createMessageId(),
        role: 'agent',
        text: error instanceof Error ? error.message : 'Upload failed.',
        tone: 'error',
      };

      syncSessionMessages(sessionId, [...(messageStoreRef.current[sessionId] ?? messages), errorMessage]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function detachFile() {
    setAttachedFile(null);
  }

  const darkMode = isDarkMode;
  const mainBackground = darkMode
    ? 'bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.72),_rgba(9,9,11,1)_50%)]'
    : 'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(247,247,245,1)_45%)]';

  return (
    <main className={`min-h-screen transition-colors ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-[#f7f7f5] text-zinc-900'}`}>
      <div className="grid min-h-screen lg:grid-cols-[288px_minmax(0,1fr)]">
        <aside
          className={`flex w-full shrink-0 flex-col border-r px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-[288px] ${
            darkMode ? 'border-zinc-800 bg-zinc-950/90' : 'border-zinc-200 bg-zinc-50/90'
          }`}
        >
          <div className="flex items-center justify-between px-1 pb-4 pt-1">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-zinc-500">Workspace</p>
              <h1 className="mt-2 text-sm font-semibold tracking-tight">SAGENT-QL</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium transition ${
                darkMode
                  ? 'border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-zinc-700'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <SunMedium className="h-3.5 w-3.5" /> : <MoonStar className="h-3.5 w-3.5" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>

          <button
            type="button"
            onClick={createNewConversation}
            className={`mb-4 flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium shadow-[0_1px_0_rgba(255,255,255,0.7)] transition ${
              darkMode
                ? 'border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800'
                : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50'
            }`}
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
                darkMode={darkMode}
              />
            ))}
          </div>

          <div className="mt-auto px-1 pb-1 pt-4 text-xs leading-5 text-zinc-500">
            Sessions persist locally through SQLite memory.
          </div>
        </aside>

        <section className={`relative flex min-h-screen min-w-0 flex-col overflow-hidden transition-colors ${mainBackground}`}>
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 pb-40 pt-6 sm:px-6 lg:px-8 lg:pt-8">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                <div className={`mb-4 flex items-center justify-between border-b pb-4 ${darkMode ? 'border-zinc-800/80' : 'border-zinc-200/70'}`}>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-zinc-500">Conversation</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight">
                      {sessions.find((session) => session.id === sessionId)?.title ?? 'Session'}
                    </h2>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${darkMode ? 'border-zinc-800 bg-zinc-900 text-zinc-300' : 'border-zinc-200 bg-white text-zinc-500'}`}>
                    <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                    {isPending ? 'Working' : 'Ready'}
                  </div>
                </div>

                {messages.length === 0 && !isPending ? (
                  <div className={`rounded-3xl border border-dashed px-6 py-10 text-center text-sm leading-6 shadow-[0_1px_0_rgba(255,255,255,0.9)] ${darkMode ? 'border-zinc-800 bg-zinc-950/50 text-zinc-400' : 'border-zinc-200 bg-white/60 text-zinc-500'}`}>
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
                      <AgentMessageBubble message={message} darkMode={darkMode} />
                    </div>
                  )
                )}

                {isPending ? (
                  <div className="flex justify-start">
                    <div className={`rounded-3xl rounded-bl-md border shadow-[0_1px_0_rgba(255,255,255,0.8)] ${darkMode ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200/70 bg-zinc-100/70'}`}>
                      <LoadingDots darkMode={darkMode} />
                    </div>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {isDraggingFile ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/10 backdrop-blur-[2px]">
                <div className={`rounded-full border px-6 py-3 text-sm font-medium shadow-lg ${darkMode ? 'border-zinc-700 bg-zinc-950/80 text-zinc-100' : 'border-zinc-200 bg-white/90 text-zinc-700'}`}>
                  Drop your spreadsheet here
                </div>
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 sm:px-6 lg:px-8 lg:pb-6">
              <div className="mx-auto flex w-full max-w-4xl justify-center">
                <form
                  className={`pointer-events-auto flex w-full flex-col gap-2 rounded-3xl border px-4 py-3 shadow-[0_18px_50px_rgba(24,24,27,0.08)] backdrop-blur-md transition ${
                    darkMode
                      ? 'border-zinc-800 bg-zinc-950/88 text-zinc-100'
                      : 'border-zinc-200/80 bg-white/85 text-zinc-900'
                  }`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSendMessage(draft);
                  }}
                >
                  {attachedFile ? (
                    <div className={`flex items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${darkMode ? 'border-zinc-800 bg-zinc-900 text-zinc-200' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}`}>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                      </span>
                      <span className="max-w-[220px] truncate">{attachedFile.name}</span>
                      <button
                        type="button"
                        onClick={detachFile}
                        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        aria-label="Detach file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-end gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleFileUpload(file);
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                        isUploading
                          ? darkMode
                            ? 'border-zinc-700 bg-zinc-900 text-zinc-400'
                            : 'border-zinc-200 bg-zinc-100 text-zinc-400'
                          : darkMode
                            ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100'
                      }`}
                      aria-label="Attach spreadsheet"
                    >
                      <UploadIcon isUploading={isUploading} />
                    </button>

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
                      className={`max-h-32 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-zinc-400 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}
                    />

                    <button
                      type="submit"
                      disabled={!draft.trim() || isPending}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                        draft.trim() && !isPending
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                          : darkMode
                            ? 'border-zinc-800 bg-zinc-900 text-zinc-500'
                            : 'border-zinc-200 bg-zinc-100 text-zinc-400'
                      }`}
                      aria-label="Send message"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
