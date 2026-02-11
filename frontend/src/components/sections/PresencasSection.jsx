import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PresencasSection() {
  const toast = useToast();

  const STORAGE_KEY_TURMA = "presencas_professor_turmaSelecionada";
  const STORAGE_KEY_DATA = "presencas_professor_dataSelecionada";

  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState([]);
  const [lista, setLista] = useState([]);

  const [turmaSelecionada, setTurmaSelecionada] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TURMA) || "";
    } catch {
      return "";
    }
  });

  const [dataSelecionada, setDataSelecionada] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DATA) || todayISO();
    } catch {
      return todayISO();
    }
  });

  // alunoId -> null | true | false
  const [presenca, setPresenca] = useState({});

  const initializedRef = useRef(false);

  const turmas = useMemo(() => {
    const set = new Set();
    for (const a of alunos) {
      const t = String(a.turma ?? a.Turma ?? "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [alunos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TURMA, turmaSelecionada || "");
  }, [turmaSelecionada]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DATA, dataSelecionada || "");
  }, [dataSelecionada]);

  async function loadAlunos() {
    const res = await api.get("/Alunos");
    const arr = Array.isArray(res.data) ? res.data : [];
    setAlunos(arr);

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (!turmaSelecionada) {
        const t0 = Array.from(
          new Set(arr.map((x) => String(x.turma ?? "").trim()).filter(Boolean))
        )[0];
        setTurmaSelecionada(t0 || "");
      }
    }
  }

  async function loadPresencas() {
    if (!turmaSelecionada) return;

    const res = await api.get(
      `/Presencas/professor?turma=${turmaSelecionada}&dataAula=${dataSelecionada}`
    );

    const arr = Array.isArray(res.data) ? res.data : [];
    setLista(arr);

    const map = {};
    for (const item of arr) {
      const id = String(item.alunoId);
      map[id] =
        item.presente === true ? true : item.presente === false ? false : null;
    }
    setPresenca(map);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadAlunos();
        await loadPresencas();
      } catch {
        toast.error("Erro ao carregar dados de presença.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, [turmaSelecionada, dataSelecionada]);

  function setAlunoPresenca(alunoId, value) {
    setPresenca((prev) => ({
      ...prev,
      [String(alunoId)]: value,
    }));
  }

  function marcarTodos(valor) {
    setPresenca((prev) => {
      const next = { ...prev };
      for (const item of lista) {
        next[String(item.alunoId)] = valor;
      }
      return next;
    });
  }

  async function salvar() {
    const itens = lista
      .map((a) => ({
        alunoId: a.alunoId,
        presente: presenca[String(a.alunoId)],
      }))
      .filter((x) => x.presente !== null && x.presente !== undefined);

    if (itens.length === 0) {
      toast.error("Marque presença ou falta em pelo menos um aluno.");
      return;
    }

    await api.post("/Presencas/marcar-lote", {
      dataAula: dataSelecionada,
      turma: turmaSelecionada,
      itens,
    });

    toast.success("Presenças salvas com sucesso!");
    await loadPresencas();
  }

  return (
    <div className="card p-3">
      <h4>Presença</h4>

      <div className="d-flex gap-2 mb-3">
        <select
          className="form-select"
          value={turmaSelecionada}
          onChange={(e) => setTurmaSelecionada(e.target.value)}
        >
          {turmas.map((t) => (
            <option key={t} value={t}>
              Turma {t}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="form-control"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
        />

        <button className="btn btn-primary" onClick={salvar}>
          Salvar
        </button>
      </div>

      <div className="mb-2">
        <button
          className="btn btn-outline-success btn-sm me-2"
          onClick={() => marcarTodos(true)}
        >
          Marcar todos presentes
        </button>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={() => marcarTodos(false)}
        >
          Marcar todos faltaram
        </button>
      </div>

      <table className="table table-sm">
        <thead>
          <tr>
            <th>Aluno</th>
            <th style={{ width: 220 }}>Presença</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((a) => {
            const id = String(a.alunoId);
            const v = presenca[id];

            return (
              <tr key={id}>
                <td>{a.nome}</td>
                <td>
                  <div className="btn-group">
                    <button
                      className={`btn btn-sm ${
                        v === true ? "btn-success" : "btn-outline-success"
                      }`}
                      onClick={() => setAlunoPresenca(id, true)}
                    >
                      Presente
                    </button>
                    <button
                      className={`btn btn-sm ${
                        v === false ? "btn-danger" : "btn-outline-danger"
                      }`}
                      onClick={() => setAlunoPresenca(id, false)}
                    >
                      Falta
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
