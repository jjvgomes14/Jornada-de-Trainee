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

// ✅ IMPORTS QUE ESTAVAM FALTANDO / NECESSÁRIOS
import PresencasSection from "../components/sections/PresencasSection";
import FaltasSection from "../components/sections/FaltasSection";

const STORAGE_ACTIVE_SECTION = "dashboardActiveSection";

export default function Dashboard() {
  const { user, logout, markPasswordChanged } = useAuth();
  const navigate = useNavigate();
  const role = useMemo(() => normalizeRole(user?.role), [user]);
  const mustChange = !!user?.mustChangePassword;

  // ⚠️ navItems é usado dentro do sections (HomeSection recebe navItems)
  // então precisamos declarar sections e navItems com cuidado.
  // Aqui mantive sua estrutura, só garantindo que as seções existam e imports também.

  const sections = useMemo(
    () => [
      {
        id: "home",
        label: "Home",
        roles: ["admin", "professor", "aluno"],
        render: () => (
          <HomeSection navItems={navItems} onSelectSection={setActiveSection} />
        ),
      },
      {
        id: "listagem",
        label: "Listagem",
        roles: ["admin", "professor", "aluno"],
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
        roles: ["professor", "aluno"],
        render: () => <CalendarioSection role={role} />,
      },
      {
        id: "notas",
        label: "Notas",
        roles: ["professor", "aluno"],
        render: () => <NotasSection role={role} />,
      },

      // ✅ PROFESSOR LANÇA PRESENÇA/FALTA AQUI
      {
        id: "presencas",
        label: "Presenças",
        roles: ["professor"],
        render: () => <PresencasSection />,
      },

      // ✅ ALUNO VÊ AS FALTAS AQUI
      {
        id: "faltas",
        label: "Faltas",
        roles: ["aluno"],
        render: () => <FaltasSection />,
      },

      {
        id: "notificacoes",
        label: "Notificações",
        roles: ["aluno"],
        render: () => <NotificacoesSection />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, user]
  );

  const navItems = useMemo(
    () => sections.filter((s) => s.roles.includes(role)),
    [sections, role]
  );

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
