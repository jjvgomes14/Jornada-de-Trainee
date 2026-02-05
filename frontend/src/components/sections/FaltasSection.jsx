import { useEffect, useState } from "react";
import { api } from "../../api/client";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function minusDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function FaltasSection() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [de, setDe] = useState(minusDaysISO(60));
  const [ate, setAte] = useState(todayISO());

  async function carregar() {
    setLoading(true);
    try {
      const qs = `?de=${encodeURIComponent(de)}&ate=${encodeURIComponent(ate)}`;
      const res = await api.get(`/Presencas/minhas-faltas${qs}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="m-0">Minhas Faltas</h4>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Mostra apenas faltas registradas pelo professor (Presente = não).
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-end">
          <div>
            <label className="form-label m-0">De</label>
            <input
              type="date"
              className="form-control"
              value={de}
              onChange={(e) => setDe(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label m-0">Até</label>
            <input
              type="date"
              className="form-control"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={carregar} disabled={loading}>
            Aplicar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted">Carregando...</div>
      ) : !data ? (
        <div className="alert alert-warning m-0">Não foi possível carregar suas faltas.</div>
      ) : (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <div className="card p-2">
              <div className="text-muted" style={{ fontSize: 12 }}>Total de faltas</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{data.totalFaltas ?? 0}</div>
            </div>

            <div className="card p-2">
              <div className="text-muted" style={{ fontSize: 12 }}>Aluno</div>
              <div style={{ fontWeight: 600 }}>{data?.aluno?.nome}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Turma: {data?.aluno?.turma} • RA: {data?.aluno?.ra}
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div className="card p-3">
                <h6 className="m-0 mb-2">Faltas por disciplina</h6>
                {Array.isArray(data.faltasPorDisciplina) && data.faltasPorDisciplina.length > 0 ? (
                  <ul className="list-group list-group-flush">
                    {data.faltasPorDisciplina.map((x, idx) => (
                      <li key={idx} className="list-group-item d-flex justify-content-between">
                        <span>{x.disciplina || "(Sem disciplina)"}</span>
                        <span className="fw-semibold">{x.faltas}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted">Nenhuma falta nesse período.</div>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-8">
              <div className="card p-3">
                <h6 className="m-0 mb-2">Detalhamento</h6>

                {!Array.isArray(data.faltas) || data.faltas.length === 0 ? (
                  <div className="alert alert-success m-0">Você não tem faltas nesse período 🎉</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Disciplina</th>
                          <th>Professor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.faltas.map((f, idx) => {
                          const dt = f.dataAula ? String(f.dataAula).slice(0, 10) : "";
                          return (
                            <tr key={idx}>
                              <td>{dt}</td>
                              <td>{f.disciplina}</td>
                              <td>{f.professor}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
