import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function push(type, message, ttlMs = 3500) {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    const toast = { id, type, message };
    setToasts((prev) => [toast, ...prev]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttlMs);
  }

  function success(msg) {
    push("success", msg);
  }

  function error(msg) {
    push("error", msg);
  }

  function info(msg) {
    push("info", msg);
  }

  const value = useMemo(() => ({ success, error, info }), []);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} setToasts={setToasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastViewport({ toasts, setToasts }) {
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: 16,
        display: "grid",
        gap: 8,
        zIndex: 99999,
        width: "min(420px, calc(100vw - 32px))",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card p-2"
          style={{
            borderLeft: t.type === "success" ? "6px solid #16a34a"
              : t.type === "error" ? "6px solid #dc2626"
              : "6px solid #2563eb",
          }}
        >
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>
                {t.type === "success" ? "Sucesso"
                  : t.type === "error" ? "Erro"
                  : "Info"}
              </div>
              <div className="text-muted">{t.message}</div>
            </div>

            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
