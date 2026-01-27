import ThemeSwitch from "./ThemeSwitch";

export default function Navbar({ user, navItems, activeSection, setActiveSection, onLogout }) {
  return (
    <div className="topbar mb-3">
      <div className="container py-2">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary">EduConnect</span>
            <span className="text-muted">
              <b>{user?.username}</b> · <b>{user?.role}</b>
            </span>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <ThemeSwitch />
            <button className="btn btn-sm btn-outline-danger" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mt-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`btn btn-sm ${activeSection === item.id ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
