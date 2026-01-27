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
  const { user, logout, markPasswordChanged } = useAuth();
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(user?.role), [user]);
  const mustChange = !!user?.mustChangePassword;

  // Mapa único das seções (tudo implementado)
  const sections = useMemo(
    () => [
      {
        id: "home",
        label: "Home",
        roles: ["admin", "professor", "aluno"],
        render: () => <HomeSection user={user} />,
      },
      {
        id: "listagem",
        label: "Listagem",
        roles: ["admin", "professor"],
        render: () => <ListagemSection />,
      },
      {
        id: "cadastro",
        label: "Cadastro",
        roles: ["admin"],
        render: () => <CadastroSection />,
      },
      {
        id: "graficos",
        label: "Gráficos",
        roles: ["admin", "professor", "aluno"],
        render: () => <GraficosSection role={role} />,
      },
      {
        id: "calendario",
        label: "Calendário",
        roles: ["admin", "professor", "aluno"],
        render: () => <CalendarioSection role={role} />,
      },
      {
        id: "notas",
        label: "Notas",
        roles: ["admin", "professor", "aluno"],
        render: () => <NotasSection role={role} />,
      },
      {
        id: "notificacoes",
        label: "Notificações",
        roles: ["aluno"],
        render: () => <NotificacoesSection />,
      },
    ],
    [role, user]
  );

  const navItems = useMemo(() => sections.filter((s) => s.roles.includes(role)), [sections, role]);

  const [activeSection, setActiveSection] = useState(() => {
    const saved = localStorage.getItem(STORAGE_ACTIVE_SECTION);
    if (saved) return saved;
    return "home";
  });

  useEffect(() => {
    const allowedIds = new Set(navItems.map((x) => x.id));
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

  const current = sections.find((s) => s.id === activeSection);
  const hasPermission = current?.roles?.includes(role);

  return (
    <div className="container py-3" style={{ position: "relative" }}>
      {/* Modal obrigatório: primeiro acesso */}
      <ChangePasswordModal
        open={mustChange}
        username={user?.username}
        onSuccess={() => {
          markPasswordChanged();
          setActiveSection("home");
        }}
      />

      {/* Enquanto mustChangePassword estiver ativo, trava o app */}
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
          <div className="alert alert-warning">Você não tem permissão para acessar esta seção.</div>
        ) : (
          current.render()
        )}
      </div>
    </div>
  );
}
