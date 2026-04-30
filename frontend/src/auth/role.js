export function normalizeRole(roleRaw) {
  const r = String(roleRaw || "").trim().toLowerCase();

  if (r === "admin" || r === "administrador" || r === "administrator") return "admin";
  if (r === "professor" || r === "teacher") return "professor";
  if (r === "aluno" || r === "student") return "aluno";

  if (r.includes("admin")) return "admin";
  if (r.includes("prof")) return "professor";
  if (r.includes("alun") || r.includes("stud")) return "aluno";

  return r;
}
