import {
  NavLink,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import Rutinas from "../sections/Rutinas.jsx";
import Planes from "../sections/Planes.jsx";
import Pagos from "../sections/Pagos.jsx";
import Progreso from "../sections/Progreso.jsx";
import Mensajes from "../sections/Mensajes.jsx";
import { api } from "../api";
import ConfirmDeleteButton from "../components/ConfirmDeleteButton.jsx";

export default function AlumnoPanel({ user, alumnoCtx, setAlumnoCtx }) {
  const { id } = useParams();
  const alumnoId = String(id);
  const nav = useNavigate();
  const loc = useLocation();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const base = `/alumno/${alumnoId}`;
    if (loc.pathname === base) nav(`${base}/rutinas`, { replace: true });
  }, [alumnoId, loc.pathname, nav]);

  useEffect(() => {
    let cancel = false;

    async function ensureAlumnoCtx() {
      setErr("");

      if (alumnoCtx && String(alumnoCtx.id) === alumnoId) return;

      if (user?.role === "alumno") {
        if (!cancel) {
          setAlumnoCtx({ id: user.id, name: user.name, email: user.email });
        }
        return;
      }

      setLoading(true);
      try {
        const alumno = await api.alumnos.get(alumnoId);
        if (!cancel) {
          if (alumno) setAlumnoCtx(alumno);
          else setErr("El alumno no existe o fue eliminado.");
        }
      } catch {
        if (!cancel) setErr("No se pudo cargar el alumno.");
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    ensureAlumnoCtx();

    return () => {
      cancel = true;
    };
  }, [alumnoId, user, alumnoCtx, setAlumnoCtx]);

  if (loading) return <div className="card">Cargando alumno…</div>;
  if (err)
    return (
      <div className="card" style={{ color: "#b00020" }}>
        {err}
      </div>
    );

  if (!alumnoCtx || String(alumnoCtx.id) !== alumnoId)
    return <div className="card">Cargando alumno…</div>;

  const TabLink = ({ to, children }) => (
    <NavLink
      to={to}
      className={({ isActive }) => `btn ${isActive ? "active" : ""}`}
    >
      {children}
    </NavLink>
  );

  const handleDeleteAlumno = async () => {
    if (user?.role !== "coach") return;

    if (
      !confirm(
        "¿Eliminar este alumno y todos sus datos (rutinas, planes, pagos, progreso y mensajes)?",
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      const aid = String(alumnoCtx.id);

      try {
        const [rs, ps, pgs, prgs, ms] = await Promise.all([
          api.rutinas?.listByAlumno
            ? api.rutinas.listByAlumno(aid)
            : Promise.resolve([]),
          api.planes?.listByAlumno
            ? api.planes.listByAlumno(aid)
            : Promise.resolve([]),
          api.pagos?.listByAlumno
            ? api.pagos.listByAlumno(aid)
            : Promise.resolve([]),
          api.progresos?.listByAlumno
            ? api.progresos.listByAlumno(aid)
            : Promise.resolve([]),
          api.mensajes?.listByAlumno
            ? api.mensajes.listByAlumno(aid)
            : Promise.resolve([]),
        ]);

        await Promise.all([
          ...(rs || []).map((r) => api.rutinas.remove(r.id)),
          ...(ps || []).map((p) => api.planes.remove(p.id)),
          ...(pgs || []).map((pago) => api.pagos.remove(pago.id)),
          ...(prgs || []).map((prog) => api.progresos.remove(prog.id)),
          ...(ms || []).map((m) => api.mensajes.remove(m.id)),
        ]);
      } catch (e) {
        console.error("Error borrando datos asociados:", e);
      }

      if (api.alumnos?.remove) {
        await api.alumnos.remove(aid);
      }

      alert("Alumno eliminado correctamente.");
      setAlumnoCtx(null);
      nav("/dashboard", { replace: true });
    } catch (e) {
      console.error(e);
      alert(
        "No se pudo eliminar el alumno. Revisá la consola para más detalles.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div
        className="card"
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div className="student-name">{alumnoCtx.name}</div>
          <div className="student-email">{alumnoCtx.email}</div>
        </div>

        {user?.role === "coach" && (
          <ConfirmDeleteButton
            label={deleting ? "Eliminando..." : "Eliminar alumno"}
            confirmText="¿Seguro que querés eliminar definitivamente este alumno y todos sus datos?"
            onConfirm={handleDeleteAlumno}
            disabled={deleting}
          />
        )}
      </div>

      <div className="tabs-row">
        <TabLink to={`/alumno/${alumnoId}/rutinas`}>Rutinas</TabLink>
        <TabLink to={`/alumno/${alumnoId}/planes`}>Nutrición</TabLink>
        <TabLink to={`/alumno/${alumnoId}/pagos`}>Pagos</TabLink>
        <TabLink to={`/alumno/${alumnoId}/progreso`}>Progreso</TabLink>
        <TabLink to={`/alumno/${alumnoId}/mensajes`}>Mensajes</TabLink>
      </div>

      <Routes>
        <Route
          path="rutinas"
          element={
            <Rutinas
              alumnoId={alumnoCtx.id}
              isAlumno={user.role === "alumno"}
            />
          }
        />
        <Route path="planes" element={<Planes alumnoId={alumnoCtx.id} />} />
        <Route path="pagos" element={<Pagos alumnoId={alumnoCtx.id} />} />
        <Route path="progreso" element={<Progreso alumnoId={alumnoCtx.id} />} />
        <Route
          path="mensajes"
          element={<Mensajes alumnoId={alumnoCtx.id} userName={user.name} />}
        />
      </Routes>
    </div>
  );
}
