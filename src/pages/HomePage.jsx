import { Link } from "react-router-dom";

function HomePage() {
  return (
    <section className="landing-shell">
      <section className="hero landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Learning platform</p>
          <h1>ScamShield Hub</h1>
          <p>
            A simple platform for practicing phishing and scam detection through short interactive
            cases, instant feedback, and progress tracking.
          </p>
          <div className="hero-actions">
            <Link to="/cases" className="btn btn-primary">
              Start Training
            </Link>
            <Link to="/auth" className="btn btn-muted">
              Login / Register
            </Link>
          </div>
        </div>
        <div className="hero-showcase">
          <div className="metrics-grid landing-metrics">
            <div className="metric">
              <strong>Case-based</strong>
              <span>Practice scenarios ready to explore</span>
            </div>
            <div className="metric">
              <strong>3</strong>
              <span>Case types: email, SMS, and website</span>
            </div>
            <div className="metric">
              <strong>Profiles</strong>
              <span>Track answered cases, badges, and progress</span>
            </div>
            <div className="metric">
              <strong>Community</strong>
              <span>Comments, public profiles, friends, and messages</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Main Features</p>
            <h2>What you can do here</h2>
          </div>
        </div>
        <div className="landing-steps">
          <article className="metric metric-elevated">
            <span className="metric-label">Practice Cases</span>
            <strong>Review realistic scam examples</strong>
            <span className="metric-hint">Work through email, SMS, and website scenarios with different difficulty levels.</span>
          </article>
          <article className="metric metric-elevated">
            <span className="metric-label">Progress Tracking</span>
            <strong>See how your judgment improves</strong>
            <span className="metric-hint">Profiles show score, accuracy, completed cases, recent activity, and badges.</span>
          </article>
          <article className="metric metric-elevated">
            <span className="metric-label">Community</span>
            <strong>Compare and discuss</strong>
            <span className="metric-hint">Use leaderboards, comments, friend requests, and private messages to stay engaged.</span>
          </article>
        </div>
      </section>

      <section className="landing-section landing-feature-grid">
        <article className="panel">
          <p className="eyebrow">How It Works</p>
          <h3>Step 1: Open a case</h3>
          <p className="supporting-copy">
            Browse the case feed and choose a phishing or scam scenario to review.
          </p>
        </article>
        <article className="panel">
          <p className="eyebrow">How It Works</p>
          <h3>Step 2: Make your decision</h3>
          <p className="supporting-copy">
            Decide whether the case is a scam, safe, or something you are unsure about.
          </p>
        </article>
        <article className="panel">
          <p className="eyebrow">How It Works</p>
          <h3>Step 3: Review feedback</h3>
          <p className="supporting-copy">
            Read the explanation, review your result, and track your progress over time.
          </p>
        </article>
      </section>
    </section>
  );
}

export default HomePage;
