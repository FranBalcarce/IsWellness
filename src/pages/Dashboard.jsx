import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function Dashboard({ user, alumnoCtx, setAlumnoCtx }) {
  const nav = useNavigate();
  const [alumnos, setAlumnos] = useState([]);
  const [showDlg, setShowDlg] = useState(false);
  const [nuevo, setNuevo] = useState({ name: "", email: "" });

  const load = async () => {
    if (user.role === "coach") {
      const list = await api.alumnos.list();
      setAlumnos(list);
    } else {
      // si es alumno, lo mandamos directo a su panel
      setAlumnoCtx({ id: user.id, name: user.name, email: user.email });
      nav(`/alumno/${user.id}/rutinas`);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrir = (a) => {
    setAlumnoCtx(a);
    nav(`/alumno/${a.id}/rutinas`);
  };

  const addAlumno = async () => {
    if (!nuevo.name || !nuevo.email) {
      alert("Completá nombre y email.");
      return;
    }
    try {
      const created = await api.alumnos.create(nuevo);
      alert(`Invitación enviada a ${created.email}.`);
      setAlumnos((a) => [created, ...a]);
      setShowDlg(false);
      setNuevo({ name: "", email: "" });
    } catch (e) {
      console.error(e);
      if (e.code === "EMAIL_EXISTS")
        return alert("Ese email ya está registrado.");
      alert("No se pudo crear el alumno: " + (e.message || "Error"));
    }
  };

  if (user.role !== "coach") return <div className="card">Redirigiendo…</div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="title">Alumnos</h2>
        <button className="btn" onClick={() => setShowDlg(true)}>
          + Agregar alumno
        </button>
      </div>

      <div className="grid cards">
        {alumnos.map((a) => (
          <div
            className="card"
            key={a.id}
            style={{ cursor: "pointer" }}
            onClick={() => abrir(a)}
          >
            <div style={{ fontWeight: 700 }}>{a.name}</div>
            <div style={{ color: "var(--muted)" }}>{a.email}</div>
          </div>
        ))}
      </div>

      {showDlg && (
        <dialog open>
          <div className="dialog-body grid" style={{ gap: 10 }}>
            <h3 className="title">Nuevo alumno</h3>
            <div>
              <label>Nombre</label>
              <input
                value={nuevo.name}
                onChange={(e) =>
                  setNuevo((v) => ({ ...v, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={nuevo.email}
                onChange={(e) =>
                  setNuevo((v) => ({ ...v, email: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="dialog-footer">
            <button className="btn" onClick={() => setShowDlg(false)}>
              Cancelar
            </button>
            <button className="btn primary" onClick={addAlumno}>
              Guardar
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
