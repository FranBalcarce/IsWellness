import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function Dashboard({ user, setAlumnoCtx }) {
  const nav = useNavigate();
  const [alumnos, setAlumnos] = useState([]);
  const [showDlg, setShowDlg] = useState(false);
  const [nuevo, setNuevo] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      if (user.role === "coach") {
        const list = await api.alumnos.list(user.id);
        setAlumnos(Array.isArray(list) ? list : []);
      } else {
        setAlumnoCtx({ id: user.id, name: user.name, email: user.email });
        nav(`/alumno/${user.id}/rutinas`);
      }
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar los alumnos.");
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
    if (!nuevo.name.trim() || !nuevo.email.trim()) {
      alert("Completá nombre y email.");
      return;
    }

    try {
      setLoading(true);

      await api.alumnos.create({
        name: nuevo.name.trim(),
        email: nuevo.email.trim().toLowerCase(),
        coachId: user.id,
      });

      alert("Alumno creado correctamente.");
      setShowDlg(false);
      setNuevo({ name: "", email: "" });
      await load();
    } catch (e) {
      console.error(e);

      if (e.code === "EMAIL_EXISTS") {
        alert("Ese email ya está registrado.");
        return;
      }

      if (String(e.message || "").includes("unauthorized-continue-uri")) {
        alert(
          "El dominio no está autorizado en Firebase. Revisá los dominios autorizados.",
        );
        return;
      }

      alert("No se pudo crear el alumno: " + (e.message || "Error"));
    } finally {
      setLoading(false);
    }
  };

  const eliminarAlumno = async (uid) => {
    try {
      const confirmar = window.confirm("¿Querés eliminar este alumno?");
      if (!confirmar) return;

      setLoading(true);
      await api.alumnos.remove(uid);
      alert("Alumno eliminado correctamente.");
      await load();
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar el alumno.");
    } finally {
      setLoading(false);
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

        <button
          className="btn primary"
          onClick={() => setShowDlg(true)}
          disabled={loading}
        >
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

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <button
                    className="btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarAlumno(a.uid || a.id);
                    }}
                    disabled={loading}
                  >
                    Eliminar
                  </button>

                  <div className="student-avatar">
                    {a.name?.slice(0, 1)?.toUpperCase() || "A"}
                  </div>
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>

          <div className="dialog-footer">
            <button
              className="btn"
              onClick={() => {
                if (loading) return;
                setShowDlg(false);
              }}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              className="btn primary"
              onClick={addAlumno}
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
