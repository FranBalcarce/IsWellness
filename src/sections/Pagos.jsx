import { useEffect, useState } from "react";
import { api } from "../api";

export default function Pagos({ alumnoId }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ monto: "", fecha: "", estado: "pagado" });

  const load = async () => setList(await api.pagos.listByAlumno(alumnoId));
  useEffect(() => {
    load();
  }, [alumnoId]);

  const save = async () => {
    const monto = parseFloat(form.monto);
    if (!monto || !form.fecha) return alert("Completá monto y fecha.");
    await api.pagos.create({
      alumnoId,
      monto,
      fecha: form.fecha,
      estado: form.estado,
    });
    setOpen(false);
    setForm({ monto: "", fecha: "", estado: "pagado" });
    await load();
  };

  const toggleEstado = async (p) => {
    const estado = p.estado === "pagado" ? "pendiente" : "pagado";
    await api.pagos.update(p.id, { estado });
    await load();
  };

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="title">Pagos</h2>
        <button className="btn" onClick={() => setOpen(true)}>
          + Registrar pago
        </button>
      </div>

      <div className="grid">
        {list.map((p) => (
          <div className="card" key={p.id}>
            <div
              className="row"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <strong>${p.monto.toLocaleString("es-AR")}</strong> — {p.fecha}
              </div>
              <div className="row">
                <span
                  className="pill"
                  style={{
                    background:
                      p.estado === "pagado" ? "var(--ok)" : "var(--bad)",
                  }}
                >
                  {p.estado}
                </span>
                <button className="btn" onClick={() => toggleEstado(p)}>
                  Cambiar estado
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <dialog open>
          <div className="dialog-body grid" style={{ gap: 10 }}>
            <h3 className="title" style={{ marginTop: 0 }}>
              Nuevo pago
            </h3>
            <div>
              <label>Monto</label>
              <input
                type="number"
                value={form.monto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monto: e.target.value }))
                }
              />
            </div>
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
              <label>Estado</label>
              <select
                value={form.estado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estado: e.target.value }))
                }
              >
                <option value="pagado">pagado</option>
                <option value="pendiente">pendiente</option>
              </select>
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
