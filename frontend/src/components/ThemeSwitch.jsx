import { useEffect, useState } from "react";

const STORAGE_THEME = "uiTheme"; // "light" | "dark"

export default function ThemeSwitch() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_THEME) || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-bs-theme", theme);
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  return (
    <button
      className="btn btn-sm btn-outline-primary"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      title="Alternar tema"
    >
      {theme === "dark" ? "🌙 Escuro" : "☀️ Claro"}
    </button>
  );
}
