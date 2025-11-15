import { useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const user = await api.auth.login(email.trim(), password);
      onLogin(user);
    } catch (e) {
      setErr(e.message || "Error de login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        maxWidth: 520,
        width: "100%",
        padding: 32,
      }}
    >
      <h2 className="title">Ingresar</h2>
      <form onSubmit={doLogin} className="grid" style={{ gap: 12 }}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {err && <div style={{ color: "#b00020" }}>{err}</div>}
        <button className="btn primary" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

// import { useState } from "react";
// import { api } from "../api";

// export default function Login({ onLogin }) {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [err, setErr] = useState("");
//   const [loading, setLoading] = useState(false);

//   const doLogin = async (e) => {
//     e.preventDefault();
//     setErr("");
//     setLoading(true);
//     try {
//       const user = await api.auth.login(email.trim(), password);
//       onLogin(user);
//     } catch (e) {
//       setErr(e.message || "Error de login");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
//       <h2 className="title">Ingresar</h2>
//       <form onSubmit={doLogin} className="grid" style={{ gap: 12 }}>
//         <div>
//           <label>Email</label>
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//             autoFocus
//           />
//         </div>
//         <div>
//           <label>Contraseña</label>
//           <input
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//           />
//         </div>
//         {err && <div style={{ color: "#b00020" }}>{err}</div>}
//         <button className="btn primary" disabled={loading}>
//           {loading ? "Ingresando..." : "Ingresar"}
//         </button>
//       </form>
//     </div>
//   );
// }
