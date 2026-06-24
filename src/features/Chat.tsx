import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../api/types';
import { useSendChat } from '../hooks/queries';
import { useProfileStore } from '../state/profileStore';

const GREETING =
  'Olá! Sou seu assistente de paisagismo produtivo. Posso ajudar com dúvidas sobre plantio, diagnóstico de problemas, cuidados com plantas, paisagismo e como aproveitar ao máximo seu espaço. Como posso ajudar?';

const QUICK_QS = [
  'Minha alface está amarelando',
  'O que plantar no inverno?',
  'Como fazer compostagem?',
  'Plantas para pouco sol',
  'Como controlar pulgões?',
  'Quando regar o tomate?',
];

/** Chat tab ("IA Chat") — mock assistant; each send is a mutation. */
export function Chat() {
  const profile = useProfileStore((s) => s.profile);
  const mutation = useSendChat();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [draft, setDraft] = useState('');
  // Turn history forwarded to the API — excludes the greeting.
  const history = useRef<ChatMessage[]>([]);
  const chatWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatWrap.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, mutation.isPending]);

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !profile) return;
    setDraft('');
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages((m) => [...m, userMsg]);
    history.current.push(userMsg);

    mutation.mutate(
      { history: history.current, profile },
      {
        onSuccess: (reply) => {
          const aiMsg: ChatMessage = { role: 'assistant', content: reply };
          setMessages((m) => [...m, aiMsg]);
          history.current.push(aiMsg);
          if (history.current.length > 20) history.current = history.current.slice(-20);
        },
        onError: () => {
          setMessages((m) => [...m, { role: 'assistant', content: 'Erro de conexão.' }]);
        },
      },
    );
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText(draft);
    }
  }

  function autoResize(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
  }

  return (
    <div className="card" style={{ paddingBottom: 10 }}>
      <div className="card-title">Assistente PlantAI</div>
      <div className="card-sub">
        Tire dúvidas sobre plantas, pragas, solo, manutenção e muito mais
      </div>

      <div className="quick-qs">
        {QUICK_QS.map((q) => (
          <button key={q} className="qq" onClick={() => sendText(q)} disabled={mutation.isPending}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-wrap" ref={chatWrap}>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="chat-msg user" key={i}>
              {m.content}
            </div>
          ) : (
            <div className="chat-msg ai" key={i}>
              <div className="msg-lbl">PlantAI</div>
              <span style={{ whiteSpace: 'pre-line' }}>{m.content}</span>
            </div>
          ),
        )}
      </div>

      <div className={mutation.isPending ? 'chat-typing show' : 'chat-typing'}>
        <div className="typing-dots">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          rows={1}
          placeholder="Pergunte sobre plantas, pragas, cuidados..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onInput={autoResize}
        />
        <button
          className="chat-send"
          aria-label="Enviar mensagem"
          onClick={() => sendText(draft)}
          disabled={mutation.isPending}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
