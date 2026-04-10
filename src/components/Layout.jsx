import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          ScamShield Hub
        </Link>
        <nav className="nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/cases">Case Feed</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          {user ? <NavLink to="/messages">Messages</NavLink> : null}
          {user ? <NavLink to="/profile">Profile</NavLink> : <NavLink to="/auth">Login</NavLink>}
          {user?.role === "admin" ? <NavLink to="/admin">Admin</NavLink> : null}
        </nav>
        <div className="topbar-right">
          {user ? (
            <>
              <span className="chip">{user.username}</span>
              <button className="link-button" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/auth" className="chip">
              Register
            </Link>
          )}
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} ScamShield Hub</p>
      </footer>
    </div>
  );
}

export default Layout;
