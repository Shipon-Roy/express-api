"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type User = { id: number; name: string; age: number };
type Theme = "light" | "dark";
type UserAgentCount = { userAgent: string; count: number };
type RequestLog = {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  headers: { "user-agent": string };
};
type Analytics = {
  totalRequests: number;
  totalUsers: number;
  users: User[];
  rateLimitBlocked: number;
  userAgents: UserAgentCount[];
  blockedByUserAgent: UserAgentCount[];
  recentRequests: RequestLog[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  if (typeof navigator !== "undefined") {
    headers.set("x-client-user-agent", navigator.userAgent);
  }
  const response = await fetch(url, {
    ...init,
    headers,
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status !== 204 && !contentType.includes("application/json")) {
    throw new Error(`Dashboard API returned a non-JSON response (HTTP ${response.status}).`);
  }
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(result?.message ?? "The request could not be completed.");
  }
  return result as T;
}

function Icon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className,
  };
  const paths: Record<string, ReactNode> = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11" /><path d="m9 12 2 2 4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></>,
  };
  return <svg {...common}>{paths[name] ?? paths.grid}</svg>;
}

const initialAnalytics: Analytics = {
  totalRequests: 0,
  totalUsers: 0,
  users: [],
  rateLimitBlocked: 0,
  userAgents: [],
  blockedByUserAgent: [],
  recentRequests: [],
};

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

async function verifyAdminKey(key: string) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`Dashboard authentication returned a non-JSON response (HTTP ${response.status}).`);
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? "Could not verify admin access.");
}

export default function Home() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const savedTheme = localStorage.getItem("pocketschool-theme");
      const preferredTheme = savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = preferredTheme;
      setTheme(preferredTheme);
    });
  }, []);

  const loadDashboard = useCallback(async (key: string) => {
    setError("");
    try {
      const requestOptions = { headers: { "x-dashboard-key": key } };
      const analyticsData = await fetchJson<Analytics>("/api/analytics", requestOptions);
      setUsers(analyticsData.users);
      setAnalytics(analyticsData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        loadDashboard(adminKey),
        new Promise((resolve) => setTimeout(resolve, 700)),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      const savedKey = sessionStorage.getItem("pocketschool-admin-key");
      if (!savedKey) {
        setAuthReady(true);
        return;
      }

      try {
        await verifyAdminKey(savedKey);
        if (!active) return;
        setAdminKey(savedKey);
        setAuthenticated(true);
        await loadDashboard(savedKey);
      } catch {
        sessionStorage.removeItem("pocketschool-admin-key");
      } finally {
        if (active) setAuthReady(true);
      }
    });

    return () => { active = false; };
  }, [loadDashboard]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const key = String(new FormData(event.currentTarget).get("admin-key") ?? "");
    setAuthBusy(true);
    setAuthError("");
    try {
      await verifyAdminKey(key);
      sessionStorage.setItem("pocketschool-admin-key", key);
      setAdminKey(key);
      setAuthenticated(true);
      await loadDashboard(key);
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setAuthBusy(false);
      setAuthReady(true);
    }
  };

  const signOut = () => {
    sessionStorage.removeItem("pocketschool-admin-key");
    setAdminKey("");
    setAuthenticated(false);
    setUsers([]);
    setAnalytics(initialAnalytics);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("pocketschool-theme", nextTheme);
    setTheme(nextTheme);
  };

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((user) =>
      user.name.toLowerCase().includes(normalizedQuery) ||
      String(user.id).includes(normalizedQuery) ||
      String(user.age).includes(normalizedQuery),
    );
  }, [query, users]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setError("");
    setDialogOpen(true);
  };

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      age: Number(formData.get("age")),
    };
    setSaving(true);
    setError("");
    try {
      await fetchJson<User>(
        editingUser ? `/api/users/${editingUser.id}` : "/api/users",
        {
          method: editingUser ? "PUT" : "POST",
          body: JSON.stringify(payload),
          headers: { "x-dashboard-key": adminKey },
        },
      );
      setDialogOpen(false);
      await loadDashboard(adminKey);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this user.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user: User) => {
    if (!window.confirm(`Delete ${user.name}? This action cannot be undone.`)) return;
    setError("");
    try {
      await fetchJson<null>(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { "x-dashboard-key": adminKey },
      });
      await loadDashboard(adminKey);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete this user.");
    }
  };

  const topAgents = analytics.userAgents.slice(0, 5);
  const peakAgentCount = Math.max(1, ...topAgents.map((agent) => agent.count));

  if (!authReady) {
    return <main className="login-page"><div className="login-loading">Checking admin access...</div></main>;
  }

  if (!authenticated) {
    return (
      <main className="login-page">
        <button className="theme-toggle login-theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
        </button>
        <section className="login-card">
          <a className="brand login-brand" href="#overview">
            <span className="brand-mark"><span /></span>
            <span>Pocket<span className="brand-light">School</span></span>
          </a>
          <div className="login-icon"><Icon name="shield" size={22} /></div>
          <h1>Welcome back</h1>
          <p>Enter your admin access key to manage your school dashboard.</p>
          {authError && <div className="alert login-alert" role="alert">{authError}</div>}
          <form onSubmit={signIn}>
            <label className="field-label" htmlFor="admin-key">Admin access key</label>
            <input className="form-input" id="admin-key" name="admin-key" type="password" autoComplete="current-password" required autoFocus placeholder="Enter your dashboard key" />
            <button className="button button-primary login-submit" type="submit" disabled={authBusy}>
              {authBusy ? "Verifying..." : "Continue"}
            </button>
          </form>
          <div className="login-note"><Icon name="shield" size={14} /> Your key is kept in this browser session only.</div>
        </section>
      </main>
    );
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="PocketSchool home">
          <span className="brand-mark"><span /></span>
          <span>Pocket<span className="brand-light">School</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item" href="#overview"><Icon name="grid" /> Overview</a>
          <a className="nav-item active" href="#users"><Icon name="users" /> User management</a>
          <a className="nav-item" href="#activity"><Icon name="activity" /> Activity logs</a>
          <a className="nav-item" href="#security"><Icon name="shield" /> Rate limit</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Icon name="activity" size={18} /></div>
            <strong>Everything in sync</strong>
            <p>Your dashboard is connected to the Express API.</p>
            <button type="button" onClick={() => void refreshDashboard()} disabled={refreshing} aria-busy={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh data"} <Icon className={refreshing ? "spin-icon" : ""} name="refresh" size={15} />
            </button>
          </div>
          <div className="profile">
            <div className="avatar avatar-purple">S</div>
            <div className="profile-copy"><strong>School Admin</strong><span>Administrator</span></div>
            <button className="logout-button" onClick={signOut} type="button">Sign out</button>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={15} /><strong>Dashboard</strong></div>
          <div className="topbar-actions">
            <span className="live-status"><span /> Live data</span>
            <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
            </button>
            <button className="icon-button notification-button" type="button" aria-label="Notifications">
              <span className="notification-dot" /><Icon name="activity" size={19} />
            </button>
            <div className="avatar avatar-purple top-avatar">S</div>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              <div className="eyebrow">YOUR SCHOOL AT A GLANCE</div>
              <h1>Dashboard</h1>
              <p>Manage your users and keep track of API activity.</p>
            </div>
            <button className="button button-secondary refresh-button" type="button" onClick={() => void refreshDashboard()} disabled={refreshing} aria-busy={refreshing}>
              <Icon className={refreshing ? "spin-icon" : ""} name="refresh" size={17} /> {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </section>

          {error && (
            <div className="alert" role="alert">
              <span>{error}</span>
              <button type="button" className="alert-close" onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={16} /></button>
            </div>
          )}

          <section className="stats-grid" aria-label="Dashboard summary">
            <article className="stat-card">
              <div className="stat-top"><span>Total users</span><span className="stat-icon icon-violet"><Icon name="users" size={19} /></span></div>
              <div className="stat-value">{loading ? "—" : analytics.totalUsers}</div>
              <div className="stat-note"><span className="note-dot violet-dot" /> Registered in your school</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Total requests</span><span className="stat-icon icon-blue"><Icon name="activity" size={19} /></span></div>
              <div className="stat-value">{loading ? "—" : analytics.totalRequests.toLocaleString()}</div>
              <div className="stat-note"><span className="note-dot blue-dot" /> Logged API activity</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Rate limit blocked</span><span className="stat-icon icon-amber"><Icon name="shield" size={19} /></span></div>
              <div className="stat-value">{loading ? "—" : analytics.rateLimitBlocked.toLocaleString()}</div>
              <div className="stat-note"><span className="note-dot amber-dot" /> Requests over the limit</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Unique user agents</span><span className="stat-icon icon-green"><Icon name="grid" size={19} /></span></div>
              <div className="stat-value">{loading ? "—" : analytics.userAgents.length}</div>
              <div className="stat-note"><span className="note-dot green-dot" /> Browsers and clients seen</div>
            </article>
          </section>

          <section className="users-panel panel" id="users">
            <div className="panel-heading">
              <div>
                <div className="section-title-row"><h2>User management</h2><span className="count-pill">{users.length}</span></div>
                <p>View and manage the people in your school workspace.</p>
              </div>
              <button type="button" className="button button-primary" onClick={openCreateDialog}>
                <Icon name="plus" size={18} /> Add user
              </button>
            </div>
            <div className="table-toolbar">
              <label className="search-box">
                <Icon name="search" size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." aria-label="Search users" />
                {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><Icon name="close" size={15} /></button>}
              </label>
              <span className="table-result">{filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>USER</th><th>USER ID</th><th>AGE</th><th>ACCOUNT</th><th className="actions-heading">ACTIONS</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td className="empty-state" colSpan={5}>Loading users...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td className="empty-state" colSpan={5}>{query ? "No users match your search." : "No users yet. Add your first user to get started."}</td></tr>
                  ) : filteredUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td><div className="user-cell"><div className={`avatar avatar-${index % 4}`}>{initials(user.name)}</div><div><strong>{user.name}</strong><span>School member</span></div></div></td>
                      <td><span className="user-id">USR-{String(user.id).padStart(4, "0")}</span></td>
                      <td>{user.age} years</td>
                      <td><span className="status-pill"><span /> Registered</span></td>
                      <td><div className="row-actions">
                        <button className="icon-button" type="button" aria-label={`Edit ${user.name}`} title="Edit user" onClick={() => openEditDialog(user)}><Icon name="edit" size={17} /></button>
                        <button className="icon-button delete-action" type="button" aria-label={`Delete ${user.name}`} title="Delete user" onClick={() => void removeUser(user)}><Icon name="trash" size={17} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users</span><span className="footer-live"><span /> Updated live</span></div>
          </section>

          <section className="lower-grid">
            <article className="panel chart-panel" id="activity">
              <div className="panel-heading compact-heading">
                <div><h2>Traffic by user agent</h2><p>Most frequent clients recorded by your API.</p></div>
                <span className="period-label">All time <Icon name="chevron" size={14} /></span>
              </div>
              <div className="agent-chart">
                {topAgents.length === 0 ? <div className="chart-empty">No user-agent activity recorded yet.</div> : topAgents.map((agent, index) => (
                  <div className="agent-row" key={agent.userAgent} title={agent.userAgent}>
                    <div className="agent-label"><span className={`agent-dot agent-color-${index}`} /><span>{agent.userAgent}</span><strong>{agent.count.toLocaleString()}</strong></div>
                    <div className="bar-track"><div className={`bar-fill bar-color-${index}`} style={{ width: `${Math.max(4, (agent.count / peakAgentCount) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </article>
            <article className="panel blocked-panel" id="security">
              <div className="panel-heading compact-heading">
                <div><h2>Rate limit activity</h2><p>Blocked requests by user agent.</p></div>
                <span className="blocked-total"><Icon name="shield" size={16} /> {analytics.rateLimitBlocked}</span>
              </div>
              <div className="blocked-list">
                {analytics.blockedByUserAgent.length === 0 ? <div className="chart-empty">No rate-limited requests recorded.</div> : analytics.blockedByUserAgent.slice(0, 5).map((entry) => (
                  <div className="blocked-row" key={entry.userAgent}>
                    <div className="blocked-agent"><span className="blocked-indicator" /><span title={entry.userAgent}>{entry.userAgent}</span></div>
                    <strong>{entry.count.toLocaleString()} <span>{entry.count === 1 ? "block" : "blocks"}</span></strong>
                  </div>
                ))}
              </div>
              <div className="security-foot"><Icon name="shield" size={15} /> Monitoring requests exceeding your API limit</div>
            </article>
          </section>

          <section className="panel requests-panel">
            <div className="panel-heading compact-heading">
              <div><h2>Recent API activity</h2><p>Latest requests captured by the audit logger.</p></div>
              <span className="period-label"><Icon name="clock" size={15} /> Latest 10</span>
            </div>
            <div className="table-scroll">
              <table className="request-table">
                <thead><tr><th>TIME</th><th>METHOD</th><th>ENDPOINT</th><th>IP ADDRESS</th><th>USER AGENT</th></tr></thead>
                <tbody>
                  {analytics.recentRequests.length === 0 ? <tr><td colSpan={5} className="empty-state">No API activity recorded yet.</td></tr> : analytics.recentRequests.map((item, index) => (
                    <tr key={`${item.timestamp}-${index}`}>
                      <td className="request-time">{formatTime(item.timestamp)}</td>
                      <td><span className={`method method-${item.method.toLowerCase()}`}>{item.method}</span></td>
                      <td><code className="endpoint">{item.url.split("?")[0]}</code></td>
                      <td className="ip-address">{item.ip}</td>
                      <td className="request-agent" title={item.headers?.["user-agent"]}>{item.headers?.["user-agent"] || "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="page-footer"><span>© 2026 PocketSchool</span><span>Admin dashboard <span className="footer-separator">·</span> Express API connected</span></footer>
        </div>
      </main>

      {dialogOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
          <section className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="dialog-heading">
              <div><div className="dialog-icon"><Icon name={editingUser ? "edit" : "users"} size={19} /></div><h2 id="dialog-title">{editingUser ? "Edit user" : "Add a user"}</h2><p>{editingUser ? "Update this member's information." : "Add a new member to your school."}</p></div>
              <button className="icon-button" type="button" aria-label="Close dialog" onClick={() => setDialogOpen(false)}><Icon name="close" /></button>
            </div>
            <form onSubmit={saveUser}>
              <label className="field-label" htmlFor="user-name">Full name</label>
              <input className="form-input" id="user-name" name="name" required maxLength={80} defaultValue={editingUser?.name ?? ""} placeholder="e.g. Alex Morgan" autoFocus />
              <label className="field-label age-label" htmlFor="user-age">Age</label>
              <input className="form-input" id="user-age" name="age" type="number" min={1} max={120} required defaultValue={editingUser?.age ?? ""} placeholder="Enter age" />
              <div className="dialog-actions">
                <button className="button button-secondary" type="button" onClick={() => setDialogOpen(false)}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving..." : editingUser ? "Save changes" : "Add user"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
