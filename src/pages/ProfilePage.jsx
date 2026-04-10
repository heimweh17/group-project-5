import { useEffect, useState } from "react";
import { useCallback } from "react";
import { Link } from "react-router-dom";
function FriendsList({ friends, friendRequests, onAccept, onRemove }) {
  return (
    <section className="panel">
      <div className="section-head">
        <h3>Friends</h3>
      </div>
      <div>
        <strong>Friends:</strong>
        {friends?.length ? (
          <ul>
            {friends.map((f) => (
              <li key={f._id}>
                {f.username} ({f.email})
                <button style={{marginLeft: 8}} onClick={() => onRemove(f._id)}>Remove</button>
                <Link className="btn btn-small btn-muted" style={{marginLeft: 8}} to={`/messages?userId=${f._id}`}>
                  Message
                </Link>
              </li>
            ))}
          </ul>
        ) : <span>No friends yet.</span>}
      </div>
      <div style={{marginTop: 12}}>
        <strong>Friend Requests:</strong>
        {friendRequests?.length ? (
          <ul>
            {friendRequests.map((f) => (
              <li key={f._id}>
                {f.username} ({f.email})
                <button style={{marginLeft: 8}} onClick={() => onAccept(f._id)}>Accept</button>
              </li>
            ))}
          </ul>
        ) : <span>No pending requests.</span>}
      </div>
    </section>
  );
}
import {
  AnsweredCasesList,
  DifficultyBars,
  MetricCard,
  PerformanceDots,
  ProgressChart,
  RecentCommentsList,
  RecentPerformanceList,
} from "../components/ProfileBlocks";
import { api } from "../lib/api";

function DifficultyBadges({ badges, role }) {
  // Categorize badges
  const difficultyBadges = badges?.filter((b) => b.includes("_easy") || b.includes("_medium") || b.includes("_hard")) || [];
  const streakBadges = badges?.filter((b) => b.includes("Streak")) || [];
  const pointBadges = badges?.filter((b) => b.includes("_") && !b.includes("Streak") && !b.includes("_easy") && !b.includes("_medium") && !b.includes("_hard") && !b.includes("Leaderboard")) || [];
  const leaderboardBadges = badges?.filter((b) => b.includes("Leaderboard")) || [];
  const otherBadges = badges?.filter((b) => !b.includes("_easy") && !b.includes("_medium") && !b.includes("_hard") && !b.includes("Streak") && !b.includes("Leaderboard") && !b.includes("_")) || [];

  const getBadgeColor = (badge) => {
    // Difficulty badges
    if (badge.startsWith("Novice")) return "#3b82f6"; // blue
    if (badge.startsWith("Expert")) return "#8b5cf6"; // purple
    if (badge.startsWith("Master")) return "#f59e0b"; // amber
    
    // Streak badges
    if (badge.includes("Hot_Streak")) return "#ef4444"; // red
    if (badge.includes("Fire_Streak")) return "#ea580c"; // orange
    if (badge.includes("Legendary_Streak")) return "#facc15"; // yellow
    if (badge.includes("Unstoppable_Streak")) return "#dc2626"; // dark red
    
    // Points badges
    if (badge.includes("Century") || badge.includes("Five_Hundred") || badge.includes("Millennium") || badge.includes("Apex") || badge.includes("Godlike")) return "#06b6d4"; // cyan
    
    // Leaderboard badges
    if (badge.includes("Top_10")) return "#dc2626"; // red
    if (badge.includes("Top_25")) return "#f59e0b"; // amber
    if (badge.includes("Top_50")) return "#06b6d4"; // cyan
    if (badge.includes("Top_100")) return "#6366f1"; // indigo
    
    return "#6b7280"; // gray
  };

  const getBadgeEmoji = (badge) => {
    // Difficulty
    if (badge.includes("_easy")) return "🟢";
    if (badge.includes("_medium")) return "🟡";
    if (badge.includes("_hard")) return "🔴";
    
    // Streak
    if (badge.includes("Hot_Streak")) return "🔥";
    if (badge.includes("Fire_Streak")) return "🌪️";
    if (badge.includes("Legendary_Streak")) return "⭐";
    if (badge.includes("Unstoppable_Streak")) return "💥";
    
    // Points
    if (badge.includes("Century")) return "💯";
    if (badge.includes("Five_Hundred")) return "💰";
    if (badge.includes("Millennium")) return "💎";
    if (badge.includes("Apex")) return "🏆";
    if (badge.includes("Godlike")) return "👑";
    
    // Leaderboard
    if (badge.includes("Top_10")) return "🥇";
    if (badge.includes("Top_25")) return "🥈";
    if (badge.includes("Top_50")) return "🥉";
    if (badge.includes("Top_100")) return "🎖️";
    
    return "";
  };

  const formatBadgeName = (badge) => {
    return badge.replaceAll("_", " ");
  };

  const renderBadgeGroup = (badgeList, title) => {
    if (badgeList.length === 0) return null;
    return (
      <div key={title} style={{ marginBottom: "12px" }}>
        <p style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#6b7280", marginBottom: "6px" }}>{title}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {badgeList.map((badge) => (
            <span
              key={badge}
              className="badge-pill"
              style={{
                backgroundColor: getBadgeColor(badge),
                color: "white",
                fontSize: "12px",
                fontWeight: "600",
                padding: "6px 12px",
                borderRadius: "20px",
              }}
            >
              {getBadgeEmoji(badge)} {formatBadgeName(badge)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="badge-row">
      <span className="badge-pill role-pill">{role}</span>
      <div style={{ marginTop: "12px" }}>
        {renderBadgeGroup(difficultyBadges, "Difficulty Mastery")}
        {renderBadgeGroup(streakBadges, "Streaks")}
        {renderBadgeGroup(pointBadges, "Point Milestones")}
        {renderBadgeGroup(leaderboardBadges, "Leaderboard")}
        {renderBadgeGroup(otherBadges, "Other")}
        {badges?.length === 0 && <span>No badges yet</span>}
      </div>
    </div>
  );
}

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [error, setError] = useState("");

  const loadProfile = useCallback(() => {
    api("/users/me")
      .then((result) => {
        setProfile(result.user);
        setFriends(result.user.friends || []);
        setFriendRequests(result.user.friendRequests || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAccept = async (requesterId) => {
    await api(`/users/friends/accept/${requesterId}`, { method: "POST" });
    loadProfile();
  };
  const handleRemove = async (friendId) => {
    await api(`/users/friends/remove/${friendId}`, { method: "POST" });
    loadProfile();
  };

  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p>Loading profile...</p>;

  return (
    <section className="profile-shell">
      <div className="panel profile-hero">
        <div>
          <p className="eyebrow">Learning Profile</p>
          <h2>{profile.username}</h2>
          <p className="supporting-copy">{profile.email}</p>
          <DifficultyBadges badges={profile.badges} role={profile.role} />
        </div>
        <div className="profile-focus-card">
          <span className="metric-label">Training completion</span>
          <strong>{profile.progressPercent}%</strong>
          <ProgressChart value={profile.progressPercent} />
          <span className="metric-hint">
            {profile.completedCasesCount} completed, {profile.remainingCasesCount} left in the current bank
          </span>
        </div>
      </div>

      <FriendsList friends={friends} friendRequests={friendRequests} onAccept={handleAccept} onRemove={handleRemove} />

      <div className="metrics-grid profile-metrics-grid">
        <MetricCard label="Score" value={profile.reputationScore} hint="Total reputation from case work" />
        <MetricCard label="Level" value={profile.level} hint="Unlocked by sustained activity" />
        <MetricCard label="Accuracy" value={`${profile.accuracyRate}%`} hint={`${profile.correctVotes} correct answers`} />
        <MetricCard label="Comments" value={profile.commentsCount} hint="Community discussion contributions" />
        <MetricCard label="Confidence" value={`${profile.confidenceScore}%`} hint="Blends accuracy and repetition" />
        <MetricCard label="Cases Done" value={profile.completedCasesCount} hint={`${profile.totalVotes} total submissions`} />
      </div>

      <div className="profile-grid">
        <section className="panel">
          <div className="section-head">
            <div>
              <h3>Recent Streak</h3>
              <p className="supporting-copy">A quick read on how your last attempts went.</p>
            </div>
          </div>
          <PerformanceDots items={profile.recentPerformance} />
          <RecentPerformanceList items={profile.recentPerformance} />
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <h3>Difficulty Breakdown</h3>
              <p className="supporting-copy">Useful for spotting where your judgment weakens.</p>
            </div>
          </div>
          <DifficultyBars items={profile.difficultyBreakdown || []} />
        </section>
      </div>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Answered Cases</h3>
            <p className="supporting-copy">Jump back into any case you have already completed.</p>
          </div>
        </div>
        <AnsweredCasesList items={profile.answeredCases} />
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Recent Comments</h3>
            <p className="supporting-copy">Your latest discussion activity across cases.</p>
          </div>
        </div>
        <RecentCommentsList items={profile.recentComments} />
      </section>
    </section>
  );
}

export default ProfilePage;
