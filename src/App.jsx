import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AlumnoPanel from "./pages/AlumnoPanel.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { api } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [alumnoCtx, setAlumnoCtx] = useState(null);
  const location = useLocation();
  const nav = useNavigate();

  const isLogin = location.pathname.startsWith("/login");

  useEffect(() => {
    const raw = sessionStorage.getItem("demo-user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (user) sessionStorage.setItem("demo-user", JSON.stringify(user));
    else sessionStorage.removeItem("demo-user");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const p = location.pathname;
    const comingFromLandingOrLogin = p === "/" || p.startsWith("/login");

    if (user.role === "coach") {
      if (comingFromLandingOrLogin) {
        setAlumnoCtx(null);
        nav("/dashboard", { replace: true });
      }
    } else {
      if (comingFromLandingOrLogin) {
        setAlumnoCtx({ id: user.id, name: user.name, email: user.email });
        nav(`/alumno/${user.id}/rutinas`, { replace: true });
      }
    }
  }, [user, location.pathname, nav]);

  const onLogout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn("Logout Firebase:", e);
    }
    setUser(null);
    setAlumnoCtx(null);
    sessionStorage.removeItem("demo-user");
    nav("/login", { replace: true });
  };

  const showSidebar = useMemo(
    () => !!user && !location.pathname.startsWith("/login"),
    [user, location.pathname],
  );

  if (isLogin) {
    return (
      <div className="login-shell">
        <Routes>
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route
            path="*"
            element={
              <Navigate to={user ? "/dashboard" : "/login"} replace={true} />
            }
          />
        </Routes>
      </div>
    );
  }

  return (
    <div className="container">
      {showSidebar && (
        <Sidebar user={user} alumnoCtx={alumnoCtx} onLogout={onLogout} />
      )}

      <div className="main-layout">
        <div className="topbar">
          <div className="row">
            <strong className="topbar-role">
              {user ? (user.role === "coach" ? "Entrenador" : "Alumno") : ""}
            </strong>
            {alumnoCtx ? <span className="pill">{alumnoCtx.name}</span> : null}
          </div>

          {user && (
            <button className="btn btn-soft" onClick={onLogout}>
              Salir
            </button>
          )}
        </div>

        <div className="content">
          <Routes>
            <Route
              path="/"
              element={<Navigate to={user ? "/dashboard" : "/login"} />}
            />

            <Route
              path="/dashboard"
              element={
                user ? (
                  <Dashboard
                    user={user}
                    alumnoCtx={alumnoCtx}
                    setAlumnoCtx={setAlumnoCtx}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route
              path="/alumno/:id/*"
              element={
                user ? (
                  <AlumnoPanel
                    user={user}
                    alumnoCtx={alumnoCtx}
                    setAlumnoCtx={setAlumnoCtx}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route
              path="*"
              element={
                <div className="card">
                  Página no encontrada. <Link to="/">Ir al inicio</Link>
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

// import {
//   Routes,
//   Route,
//   Navigate,
//   Link,
//   useLocation,
//   useNavigate,
// } from "react-router-dom";
// import { useEffect, useMemo, useState } from "react";

// import Login from "./pages/Login.jsx";
// import Dashboard from "./pages/Dashboard.jsx";
// import AlumnoPanel from "./pages/AlumnoPanel.jsx";
// import Sidebar from "./components/Sidebar.jsx";

// export default function App() {
//   const [user, setUser] = useState(null); // { id, role, name, email }
//   const [alumnoCtx, setAlumnoCtx] = useState(null); // alumno seleccionado para coach
//   const location = useLocation();
//   const nav = useNavigate();

//   // Restaurar sesión
//   useEffect(() => {
//     const raw = sessionStorage.getItem("demo-user");
//     if (raw) {
//       try {
//         setUser(JSON.parse(raw));
//       } catch {}
//     }
//   }, []);

//   // Persistir sesión
//   useEffect(() => {
//     if (user) sessionStorage.setItem("demo-user", JSON.stringify(user));
//     else sessionStorage.removeItem("demo-user");
//   }, [user]);

//   // Redirigir solo cuando tiene sentido (desde / o /login)
//   useEffect(() => {
//     if (!user) return;
//     const p = location.pathname;
//     const comingFromLandingOrLogin = p === "/" || p.startsWith("/login");

//     if (user.role === "coach") {
//       if (comingFromLandingOrLogin) {
//         setAlumnoCtx(null); // coach elige alumno luego
//         nav("/dashboard", { replace: true });
//       }
//     } else {
//       // alumno: ir directo a su panel (por defecto a rutinas)
//       if (comingFromLandingOrLogin) {
//         setAlumnoCtx({ id: user.id, name: user.name, email: user.email });
//         nav(`/alumno/${user.id}/rutinas`, { replace: true });
//       }
//     }
//   }, [user, location.pathname, nav]);

//   const onLogout = () => {
//     setUser(null);
//     setAlumnoCtx(null);
//     nav("/login", { replace: true });
//   };

//   const showSidebar = useMemo(
//     () => !!user && !location.pathname.startsWith("/login"),
//     [user, location]
//   );

//   return (
//     <div className="container">
//       {showSidebar && (
//         <Sidebar user={user} alumnoCtx={alumnoCtx} onLogout={onLogout} />
//       )}

//       <div>
//         <div className="topbar">
//           <div className="row">
//             <strong>
//               {user ? (user.role === "coach" ? "Entrenador" : "Alumno") : ""}
//             </strong>
//             {alumnoCtx ? <span className="pill">{alumnoCtx.name}</span> : null}
//           </div>
//           {user && (
//             <button className="btn" onClick={onLogout}>
//               Salir
//             </button>
//           )}
//         </div>

//         <div className="content">
//           <Routes>
//             <Route
//               path="/"
//               element={<Navigate to={user ? "/dashboard" : "/login"} />}
//             />

//             <Route path="/login" element={<Login onLogin={setUser} />} />

//             <Route
//               path="/dashboard"
//               element={
//                 user ? (
//                   <Dashboard
//                     user={user}
//                     alumnoCtx={alumnoCtx}
//                     setAlumnoCtx={setAlumnoCtx}
//                   />
//                 ) : (
//                   <Navigate to="/login" />
//                 )
//               }
//             />

//             <Route
//               path="/alumno/:id/*"
//               element={
//                 user ? (
//                   <AlumnoPanel
//                     user={user}
//                     alumnoCtx={alumnoCtx}
//                     setAlumnoCtx={setAlumnoCtx}
//                   />
//                 ) : (
//                   <Navigate to="/login" />
//                 )
//               }
//             />

//             <Route
//               path="*"
//               element={
//                 <div className="card">
//                   Página no encontrada. <Link to="/">Ir al inicio</Link>
//                 </div>
//               }
//             />
//           </Routes>
//         </div>
//       </div>
//     </div>
//   );
// }
