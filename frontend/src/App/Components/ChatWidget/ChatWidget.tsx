import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AGENT_SUGGESTIONS, AGENT_TOOL_LABELS } from '../../Constants/optionConstants';
import { AGENT_CHAT_RESET, AGENT_MESSAGE_SENT } from '../../Redux/Actions/AgentConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import { cx } from '../../Utils/cx';
import { Button, ButtonLink, Icon, Text, TextField } from '../CustomUI';
import styles from './ChatWidget.module.scss';

/*
 * The AI assistant chat (floating button, bottom right).
 *
 * It only dispatches AGENT_MESSAGE_SENT; AgentSaga calls the Python ai-agent
 * service, which runs an LLM + tools + RAG. The user's JWT is attached, so when
 * the agent holds seats it does so AS the logged-in user, and only the user
 * can then click Pay.
 */
export function ChatWidget() {
  const dispatch = useDispatch();
  const { messages, loading } = useSelector((state: RootState) => state.agent);
  const user = useSelector((state: RootState) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    setInput('');
    dispatch({ type: AGENT_MESSAGE_SENT, payload: { text: message } });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      <Button
        variant="brand"
        shape="pill"
        className={styles.fab}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="AI assistant"
      >
        {open ? <Icon name="close" size={18} /> : <>✨ Ask AI</>}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.section
            className={styles.panel}
            aria-label="AI booking assistant"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <header className={styles.header}>
              <div>
                <Text variant="h3">Booking assistant</Text>
                <Text variant="caption" tone="muted">
                  AI, can make mistakes
                </Text>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: AGENT_CHAT_RESET })}
                disabled={loading || messages.length === 0}
              >
                New chat
              </Button>
            </header>

            <div className={styles.body}>
              {messages.length === 0 && (
                <div className={styles.empty}>
                  <Text variant="small" tone="secondary">
                    Hi! I can find events, explain policies, suggest seats and hold them for you.
                  </Text>
                  {AGENT_SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" fullWidth alignStart onClick={() => send(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  className={cx(styles.msg, styles[m.role], m.error && styles.error)}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className={styles.tools}>
                      {m.toolCalls.map((t, j) => (
                        <span
                          key={j}
                          className={cx(styles.tool, !t.ok && styles.toolFailed)}
                          title={JSON.stringify(t.input)}
                        >
                          {AGENT_TOOL_LABELS[t.name] ?? t.name}
                          {t.ok ? '' : ' (failed)'}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={styles.text}>{m.text}</div>
                  {m.actions?.map((a) => (
                    <ButtonLink key={a.bookingId} to={a.url} variant="primary" size="sm" className={styles.action}>
                      {a.label} →
                    </ButtonLink>
                  ))}
                </motion.div>
              ))}

              {loading && (
                <div
                  className={cx(styles.msg, styles.assistant, styles.typing)}
                  aria-live="polite"
                  aria-label="Thinking"
                >
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form className={styles.inputRow} onSubmit={onSubmit}>
              <TextField
                label="Message"
                hideLabel
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={user ? 'Ask about events, seats, refunds…' : 'Ask anything (log in to book)'}
                maxLength={2000}
                disabled={loading}
                autoComplete="off"
              />
              <Button type="submit" variant="primary" size="sm" disabled={loading || !input.trim()} aria-label="Send">
                <Icon name="send" size={16} />
              </Button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
