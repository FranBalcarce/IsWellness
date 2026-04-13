import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Chart from "chart.js/auto";

export default function Progreso({ alumnoId }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fecha: "", peso: "", cintura: "" });
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const load = async () => {
    const data = await api.progresos.listByAlumno(alumnoId);
    data.sort((a, b) => a.fecha.localeCompare(b.fecha));
    setList(data);
    draw(data);
  };
  useEffect(() => {
    load();
  }, [alumnoId]);

  const draw = (data) => {
    const ctx = canvasRef.current;
    if (!ctx) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.fecha),
        datasets: [
          { label: "Peso (kg)", data: data.map((d) => d.peso), tension: 0.35 },
        ],
      },
      options: { plugins: { legend: { display: false } } },
    });
  };

  const save = async () => {
    const peso = parseFloat(form.peso),
      cintura = parseFloat(form.cintura);
    if (!form.fecha || !peso || !cintura)
      return alert("Completá todos los campos.");
    await api.progresos.create({ alumnoId, fecha: form.fecha, peso, cintura });
    setOpen(false);
    setForm({ fecha: "", peso: "", cintura: "" });
    await load();
  };

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="title">Progreso</h2>
        <button className="btn" onClick={() => setOpen(true)}>
          + Nueva medición
        </button>
      </div>

      <div className="card">
        <canvas ref={canvasRef} height="120"></canvas>
      </div>

      <div className="card">
        {list.map((m) => (
          <div
            className="row"
            key={m.id}
            style={{ justifyContent: "space-between" }}
          >
            <div>{m.fecha}</div>
            <div>
              {m.peso} kg • {m.cintura} cm
            </div>
          </div>
        ))}
      </div>

      {open && (
        <dialog open>
          <div className="dialog-body grid" style={{ gap: 10 }}>
            <h3 className="title" style={{ marginTop: 0 }}>
              Nueva medición
            </h3>
            <div>
              <label>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.peso}
                onChange={(e) =>
                  setForm((f) => ({ ...f, peso: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Cintura (cm)</label>
              <input
                type="number"
                step="0.1"
                value={form.cintura}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cintura: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="dialog-footer">
            <button className="btn" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn primary" onClick={save}>
              Guardar
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
