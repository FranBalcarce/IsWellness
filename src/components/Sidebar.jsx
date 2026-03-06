import { NavLink } from "react-router-dom";

export default function Sidebar({ alumnoCtx }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-badge">FITNESS CRM</span>
        <div className="brand-title">IsWellness</div>
        <div className="brand-subtitle">
          Panel de entrenamiento y seguimiento
        </div>
      </div>

      <div className="nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Dashboard
        </NavLink>

        {alumnoCtx && (
          <>
            <NavLink
              to={`/alumno/${alumnoCtx.id}/rutinas`}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Rutinas
            </NavLink>
            <NavLink
              to={`/alumno/${alumnoCtx.id}/planes`}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Nutrición
            </NavLink>
            <NavLink
              to={`/alumno/${alumnoCtx.id}/pagos`}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Pagos
            </NavLink>
            <NavLink
              to={`/alumno/${alumnoCtx.id}/progreso`}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Progreso
            </NavLink>
            <NavLink
              to={`/alumno/${alumnoCtx.id}/mensajes`}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Mensajes
            </NavLink>
          </>
        )}
      </div>
    </aside>
  );
}
