import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

function MemberPicker({ group, onClose, onMembersChanged }) {
  const [username, setUsername] = useState("");
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const result = await api(`/leaderboard/groups/${group.id}/members`);
      setMembers(result.members ?? []);
    } catch (err) {
      setError(err.message);
    }
  }, [group.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addByUsername = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    setError("");
    setAdding(true);
    try {
      const { user } = await api(`/leaderboard/users/by-username/${encodeURIComponent(trimmed)}`);

      if (members.some((m) => m.id.toString() === user.id.toString())) {
        setError(`${user.username} is already in this group`);
        return;
      }

      await api(`/leaderboard/groups/${group.id}/join`, {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      });

      setUsername("");
      await loadMembers();
      onMembersChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const removeUser = async (userId) => {
    setError("");
    try {
      await api(`/leaderboard/groups/${group.id}/members/${userId}`, {
        method: "DELETE",
      });
      await loadMembers();
      onMembersChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0 }}>Manage "{group.name}"</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            placeholder="Enter username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addByUsername()}
            autoFocus
          />
          <button
            style={styles.addBtn}
            onClick={addByUsername}
            disabled={adding || !username.trim()}
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>

        <h4 style={styles.sectionTitle}>Current Members ({members.length})</h4>

        {members.length === 0 ? (
          <p style={styles.hint}>No members yet. Enter a username above to add one.</p>
        ) : (
          <ul style={styles.list}>
            {members.map((m) => (
              <li key={m.id} style={styles.listItem}>
                <span>{m.username}</span>
                <button style={styles.removeBtn} onClick={() => removeUser(m.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modal: {
    background: "#fff", borderRadius: 8, padding: 24, width: 400,
    maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8,
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  closeBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer" },
  inputRow: { display: "flex", gap: 8 },
  input: {
    flex: 1, padding: "8px 12px", border: "1px solid #ddd",
    borderRadius: 6, fontSize: 14,
  },
  addBtn: {
    padding: "8px 16px", background: "#2563eb", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
  },
  removeBtn: {
    padding: "4px 12px", background: "#ef4444", color: "#fff",
    border: "none", borderRadius: 4, cursor: "pointer",
  },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 },
  listItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 0", borderBottom: "1px solid #f0f0f0",
  },
  sectionTitle: { margin: "8px 0 4px", borderTop: "1px solid #eee", paddingTop: 12 },
  hint: { color: "#888", fontSize: 13, margin: 0 },
  error: { color: "#ef4444", fontSize: 13, margin: 0 },
};

function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [pickerGroup, setPickerGroup] = useState(null);

  const loadLeaderboard = useCallback((groupId = null) => {
    const url = groupId ? `/leaderboard?group=${groupId}` : "/leaderboard";
    api(url)
      .then((result) => setRows(result?.leaderboard ?? []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadLeaderboard();
    api("/leaderboard/groups")
      .then((result) => setGroups(result?.groups ?? []))
      .catch((err) => setError(err.message));
  }, [loadLeaderboard]);

  const createGroup = async () => {
    const name = prompt("Enter group name");
    if (!name) return;
    setError("");
    try {
      const result = await api("/leaderboard/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (!result?.group) throw new Error("Invalid response from server");
      setGroups((prev) => [...prev, result.group]);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectGroup = (groupId) => {
    setActiveGroup(groupId);
    setError("");
    loadLeaderboard(groupId);
  };

  return (
    <section className="panel">
      <h2>Leaderboard</h2>

      <button onClick={createGroup}>Create Group</button>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
        <button
          onClick={() => selectGroup(null)}
          style={{ fontWeight: activeGroup === null ? "bold" : "normal" }}
        >
          Global
        </button>
        {groups.map((g) => (
          <span key={g.id} style={{ display: "inline-flex", gap: 4 }}>
            <button
              onClick={() => selectGroup(g.id)}
              style={{ fontWeight: activeGroup === g.id ? "bold" : "normal" }}
            >
              {g.name}
            </button>
            <button
              onClick={() => setPickerGroup(g)}
              title="Manage members"
              style={{ fontSize: 12, padding: "2px 6px" }}
            >
              ⚙
            </button>
          </span>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Score</th>
            <th>Level</th>
            <th>Accuracy</th>
            <th>Votes</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "#888", padding: 24 }}>
                {activeGroup ? "No members in this group yet. Click ⚙ to add some." : "No results"}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.rank}</td>
                <td>{row.username}</td>
                <td>{row.reputationScore}</td>
                <td>{row.level}</td>
                <td>{row.accuracyRate}%</td>
                <td>{row.totalVotes}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pickerGroup && (
        <MemberPicker
          group={pickerGroup}
          onClose={() => setPickerGroup(null)}
          onMembersChanged={() => loadLeaderboard(activeGroup)}
        />
      )}
    </section>
  );
}

export default LeaderboardPage;