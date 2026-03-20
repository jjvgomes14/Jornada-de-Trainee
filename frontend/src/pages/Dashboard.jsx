import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { normalizeRole } from "../auth/role";

import Navbar from "../components/Navbar";
import ChangePasswordModal from "../components/ChangePasswordModal";

import HomeSection from "../components/sections/HomeSection";
import ListagemSection from "../components/sections/ListagemSection";
import CadastroSection from "../components/sections/CadastroSection";
import GraficosSection from "../components/sections/GraficosSection";
import CalendarioSection from "../components/sections/CalendarioSection";
import NotasSection from "../components/sections/NotasSection";
import NotificacoesSection from "../components/sections/NotificacoesSection";

const STORAGE_ACTIVE_SECTION = "dashboardActiveSection";

export default function Dashboard() {
  const { user, logout, markPasswordChanged, bootstrapping } = useAuth();
  const navigate = useNavigate();

  const role = useMemo(() => normalizeRole(user?.role), [user]);
  const mustChange = !!user?.mustChangePassword;

  const [activeSection, setActiveSection] = useState(() => {
    const saved = localStorage.getItem(STORAGE_ACTIVE_SECTION);
    return saved || "home";
  });

  const sections = useMemo(() => {
    const items = [
      {
        id: "home",
        label: "Home",
        roles: ["admin", "professor", "aluno"],
      },
      {
        id: "listagem",
        label: "Listagem",
        roles: ["admin", "professor", "aluno"],
      },
      {
        id: "cadastro",
        label: "Cadastro",
        roles: ["admin"],
      },
      {
        id: "graficos",
        label: "Gráficos",
        roles: ["admin", "professor", "aluno"],
      },
      {
        id: "calendario",
        label: "Calendário",
        roles: ["admin", "professor", "aluno"],
      },
      {
        id: "notas",
        label: "Notas",
        roles: ["professor", "aluno"],
      },
      {
        id: "notificacoes",
        label: "Notificações",
        roles: ["aluno"],
      },
    ];

    return items.map((item) => ({
      ...item,
      render: () => {
        if (item.id === "home") {
          return <HomeSection navItems={navItems} onSelectSection={setActiveSection} />;
        }

        if (item.id === "listagem") {
          return <ListagemSection />;
        }

        if (item.id === "cadastro") {
          return <CadastroSection />;
        }

        if (item.id === "graficos") {
          return <GraficosSection role={role} />;
        }

        if (item.id === "calendario") {
          return <CalendarioSection role={role} />;
        }

        if (item.id === "notas") {
          return <NotasSection role={role} />;
        }

        if (item.id === "notificacoes") {
          return <NotificacoesSection />;
        }

        return <div className="alert alert-warning">Seção não encontrada.</div>;
      },
    }));
  }, [role]);

  const navItems = useMemo(() => {
    return sections.filter((section) => section.roles.includes(role));
  }, [sections, role]);

  useEffect(() => {
    const allowedIds = new Set(navItems.map((item) => item.id));

    if (!allowedIds.has(activeSection)) {
      setActiveSection(navItems[0]?.id || "home");
    }
  }, [navItems, activeSection]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE_SECTION, activeSection);
  }, [activeSection]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const current = sections.find((section) => section.id === activeSection);
  const hasPermission = current?.roles?.includes(role);

  if (bootstrapping) {
    return (
      <div className="container py-3">
        <div className="card p-3">Carregando sessão...</div>
      </div>
    );
  }

  return (
    <div className="container py-3" style={{ position: "relative" }}>
      <ChangePasswordModal
        open={mustChange}
        username={user?.username}
        onSuccess={() => {
          markPasswordChanged();
          setActiveSection("home");
        }}
      />

      <div
        style={{
          filter: mustChange ? "blur(2px)" : "none",
          pointerEvents: mustChange ? "none" : "auto",
        }}
      >
        <Navbar
          user={user}
          navItems={navItems}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onLogout={handleLogout}
        />

        {!current ? (
          <div className="alert alert-warning">Seção não encontrada.</div>
        ) : !hasPermission ? (
          <div className="alert alert-warning">
            Você não tem permissão para acessar esta seção.
          </div>
        ) : (
          current.render()
        )}
      </div>
    </div>
  );
}