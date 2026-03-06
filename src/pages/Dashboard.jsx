import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function Dashboard({ user, setAlumnoCtx }) {
  const nav = useNavigate();
  const [alumnos, setAlumnos] = useState([]);
  const [showDlg, setShowDlg] = useState(false);
  const [nuevo, setNuevo] = useState({ name: "", email: "" });

  const load = async () => {
    if (user.role === "coach") {
      const list = await api.alumnos.list(user.id);
      setAlumnos(list);
    } else {
      setAlumnoCtx({ id: user.id, name: user.name, email: user.email });
      nav(`/alumno/${user.id}/rutinas`);
    }
  };

  useEffect(() => {
    load();
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
      const created = await api.alumnos.create({
        ...nuevo,
        coachId: user.id,
      });

      await sendPasswordResetEmail(auth, created.email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      alert(`Alumno creado. Se envió el acceso a ${created.email}.`);
      setAlumnos((a) => [created, ...a]);
      setShowDlg(false);
      setNuevo({ name: "", email: "" });
    } catch (e) {
      console.error(e);

      if (e.code === "EMAIL_EXISTS") {
        return alert("Ese email ya está registrado.");
      }

      alert("No se pudo crear el alumno: " + (e.message || "Error"));
    }
  };

  if (user.role !== "coach") return <div className="card">Redirigiendo…</div>;

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "flex-end" }}
      >
        <div className="section-title">
          <h2 className="title">Alumnos</h2>
          <div className="subtitle">
            Gestioná tus alumnos y accedé rápido a su seguimiento.
          </div>
        </div>

        <button className="btn primary" onClick={() => setShowDlg(true)}>
          + Agregar alumno
        </button>
      </div>

      {alumnos.length === 0 ? (
        <div className="empty-state">
          Todavía no tenés alumnos creados. Empezá agregando uno nuevo desde el
          botón superior.
        </div>
      ) : (
        <div className="grid cards">
          {alumnos.map((a) => (
            <div className="card clickable" key={a.id} onClick={() => abrir(a)}>
              <div className="student-card-header">
                <div>
                  <div className="student-name">{a.name}</div>
                  <div className="student-email">{a.email}</div>
                </div>
                <div className="student-avatar">
                  {a.name?.slice(0, 1)?.toUpperCase() || "A"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDlg && (
        <dialog open>
          <div className="dialog-body grid" style={{ gap: 14 }}>
            <div className="section-title">
              <h3 className="title" style={{ fontSize: 24 }}>
                Nuevo alumno
              </h3>
              <div className="subtitle">
                Creá una cuenta para que pueda acceder a su panel.
              </div>
            </div>

            <div>
              <label>Nombre</label>
              <input
                value={nuevo.name}
                onChange={(e) =>
                  setNuevo((v) => ({ ...v, name: e.target.value }))
                }
                placeholder="Ej. Francisco"
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
                placeholder="Ej. alumno@gmail.com"
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
