import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ThreadList({ threads, selectedUserId, onSelect }) {
  if (!threads.length) {
    return (
      <div className="panel dm-thread-list">
        <h3>Messages</h3>
        <p className="supporting-copy">Add friends first, then start a direct message.</p>
      </div>
    );
  }

  return (
    <div className="panel dm-thread-list">
      <h3>Messages</h3>
      <div className="dm-thread-items">
        {threads.map((thread) => {
          const participantId = thread.participant?._id;
          const isActive = participantId === selectedUserId;
          return (
            <button
              key={participantId}
              type="button"
              className={`dm-thread-item ${isActive ? "active" : ""}`}
              onClick={() => onSelect(participantId)}
            >
              <div className="dm-thread-head">
                <strong>{thread.participant?.username || "Unknown user"}</strong>
                {thread.unreadCount ? <span className="pill">{thread.unreadCount} new</span> : null}
              </div>
              <p>{thread.lastMessage?.body || "No messages yet"}</p>
              <small>{thread.lastMessage?.createdAt ? formatTime(thread.lastMessage.createdAt) : ""}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Conversation({ participant, messages, myUserId }) {
  return (
    <div className="dm-messages">
      {messages.length === 0 ? (
        <p className="supporting-copy">No messages yet with {participant?.username}. Say hello.</p>
      ) : (
        messages.map((message) => {
          const mine = message.senderId?.toString() === myUserId;
          return (
            <article key={message.id} className={`dm-bubble ${mine ? "mine" : "theirs"}`}>
              <p>{message.body}</p>
              <small>{formatTime(message.createdAt)}</small>
            </article>
          );
        })
      )}
    </div>
  );
}

function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get("userId") || "";

  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [participant, setParticipant] = useState(null);
  const [me, setMe] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const activeThread = useMemo(
    () => threads.find((t) => t.participant?._id === selectedUserId) || null,
    [threads, selectedUserId],
  );

  const loadInbox = useCallback(async () => {
    const [inboxResult, meResult] = await Promise.all([api("/messages/inbox"), api("/auth/me")]);
    setThreads(inboxResult.threads || []);
    setMe(meResult.user || null);
  }, []);

  const loadConversation = useCallback(async (userId) => {
    if (!userId) {
      setMessages([]);
      setParticipant(null);
      return;
    }

    const result = await api(`/messages/conversation/${userId}`);
    setMessages(result.messages || []);
    setParticipant(result.participant || null);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadInbox()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedUserId && threads.length > 0) {
      setSearchParams({ userId: threads[0].participant._id });
      return;
    }

    loadConversation(selectedUserId).catch((err) => setError(err.message));
  }, [selectedUserId, threads, loadConversation, setSearchParams]);

  async function handleSend(e) {
    e.preventDefault();
    if (!selectedUserId || !draft.trim()) return;

    setSending(true);
    setError("");

    try {
      await api(`/messages/${selectedUserId}`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      setDraft("");
      await Promise.all([loadConversation(selectedUserId), loadInbox()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleSelect(userId) {
    setSearchParams({ userId });
    setError("");
  }

  if (loading) {
    return <p>Loading messages...</p>;
  }

  return (
    <section className="dm-shell">
      <header className="page-title-row">
        <div>
          <h2>Direct Messages</h2>
          <p className="supporting-copy">Private friend-to-friend chat.</p>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="dm-grid">
        <ThreadList threads={threads} selectedUserId={selectedUserId} onSelect={handleSelect} />

        <div className="panel dm-chat-panel">
          <div className="dm-chat-head">
            <h3>{participant?.username || activeThread?.participant?.username || "Select a friend"}</h3>
          </div>

          {selectedUserId ? (
            <>
              <Conversation participant={participant || activeThread?.participant} messages={messages} myUserId={me?.id} />
              <form className="dm-compose" onSubmit={handleSend}>
                <textarea
                  placeholder="Write a message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={1000}
                />
                <button className="btn btn-primary" type="submit" disabled={sending || !draft.trim()}>
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          ) : (
            <p className="supporting-copy">Pick a friend from the thread list to begin chatting.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default MessagesPage;
