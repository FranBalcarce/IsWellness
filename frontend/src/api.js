import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const BASE = import.meta.env.VITE_API_BASE_URL;

function ok(r) {
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export const api = {
  auth: {
    async login(email, password) {
      const cleanEmail = String(email || "")
        .trim()
        .toLowerCase();

      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const uid = cred.user.uid;

      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error(
          `Usuario autenticado pero sin perfil en Firestore: users/${uid}`,
        );
      }

      const u = snap.data() || {};
      const role = String(u.role || "")
        .trim()
        .toLowerCase();

      if (!role) {
        throw new Error(
          `El perfil users/${uid} existe pero NO tiene 'role'. Agregá role: "coach" o "alumno".`,
        );
      }

      if (role !== "coach" && role !== "alumno") {
        throw new Error(
          `Role inválido en users/${uid}: "${u.role}". Usá "coach" o "alumno".`,
        );
      }

      return {
        id: uid,
        uid,
        name: u.name || cred.user.displayName || "",
        email: u.email || cred.user.email || cleanEmail,
        role,
      };
    },

    async logout() {
      await signOut(auth);
    },
  },

  alumnos: {
    async list(coachId) {
      const q = query(
        collection(db, "users"),
        where("role", "==", "alumno"),
        where("coachId", "==", String(coachId)),
      );

      const snap = await getDocs(q);

      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: d.id,
          name: data.name || "",
          email: data.email || "",
          role: data.role || "alumno",
          coachId: data.coachId || "",
        };
      });
    },

    async get(id) {
      const snap = await getDoc(doc(db, "users", String(id)));
      if (!snap.exists()) return null;

      const data = snap.data();
      return {
        id: snap.id,
        uid: snap.id,
        name: data.name || "",
        email: data.email || "",
        role: data.role || "alumno",
        coachId: data.coachId || "",
      };
    },

    async create({ name, email, coachId }) {
      const r = await fetch(`${BASE}/invite-alumno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, coachId }),
      });

      if (r.status === 409) {
        const e = new Error("Ese email ya existe");
        e.code = "EMAIL_EXISTS";
        throw e;
      }

      if (!r.ok) {
        const t = await r.text();
        throw new Error("No se pudo crear/enviar email: " + t);
      }

      return r.json();
    },
  },

  rutinas: {
    async listByAlumno(alumnoId) {
      const r = await fetch(
        `${BASE}/rutinas/${encodeURIComponent(String(alumnoId))}`,
      );
      const data = await ok(r);
      return data.rutinas || [];
    },

    async create(payload) {
      const body = {
        ...payload,
        alumnoId: String(payload.alumnoId),
      };

      const r = await fetch(`${BASE}/rutinas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await ok(r);
      return data.rutina;
    },

    async remove(id) {
      const r = await fetch(`${BASE}/rutinas/${id}`, {
        method: "DELETE",
      });

      if (!r.ok) throw new Error("No se pudo borrar");
      return true;
    },
  },
};

// import { signInWithEmailAndPassword, signOut } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import { auth, db } from "./firebase";
// import { collection, getDocs, query, where } from "firebase/firestore";
// // src/api.js
// const BASE = import.meta.env?.VITE_API_BASE ?? "http://localhost:4100";

// function ok(r) {
//   if (!r.ok) throw new Error("HTTP " + r.status);
//   return r.json();
// }

// export const api = {
//   // --- AUTENTICACIÓN ---
//   auth: {
//     async login(email, password) {
//       const cleanEmail = String(email || "")
//         .trim()
//         .toLowerCase();

//       const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
//       const uid = cred.user.uid;

//       const ref = doc(db, "users", uid);
//       const snap = await getDoc(ref);

//       if (!snap.exists()) {
//         throw new Error(
//           `Usuario autenticado pero sin perfil en Firestore: users/${uid}`,
//         );
//       }

//       const u = snap.data() || {};

//       // ✅ Normalizar role para que no falle por mayúsculas/espacios
//       const role = String(u.role || "")
//         .trim()
//         .toLowerCase();

//       // ✅ Debug opcional (si querés ver qué viene realmente)
//       // console.log("[AUTH] Firestore user:", { uid, ...u });

//       if (!role) {
//         throw new Error(
//           `El perfil users/${uid} existe pero NO tiene 'role'. Agregá role: "coach" o "alumno".`,
//         );
//       }
//       if (role !== "coach" && role !== "alumno") {
//         throw new Error(
//           `Role inválido en users/${uid}: "${u.role}". Usá "coach" o "alumno".`,
//         );
//       }

//       return {
//         id: uid,
//         uid,
//         name: u.name || cred.user.displayName || "",
//         email: u.email || cred.user.email || cleanEmail,
//         role,
//       };
//     },

//     async logout() {
//       await signOut(auth);
//     },
//   },

//   // --- ALUMNOS ---
//   alumnos: {
//     async list(coachId) {
//       const q = query(
//         collection(db, "users"),
//         where("role", "==", "alumno"),
//         where("coachId", "==", String(coachId)),
//       );

//       const snap = await getDocs(q);

//       return snap.docs.map((d) => {
//         const data = d.data();
//         return {
//           id: d.id,
//           uid: d.id,
//           name: data.name || "",
//           email: data.email || "",
//           role: data.role || "alumno",
//           coachId: data.coachId || "",
//         };
//       });
//     },

//     async get(id) {
//       const snap = await getDoc(doc(db, "users", String(id)));
//       if (!snap.exists()) return null;

//       const data = snap.data();
//       return {
//         id: snap.id,
//         uid: snap.id,
//         name: data.name || "",
//         email: data.email || "",
//         role: data.role || "alumno",
//         coachId: data.coachId || "",
//       };
//     },

//     async create({ name, email, coachId }) {
//       const SRV = import.meta.env?.VITE_SERVER_BASE ?? "http://localhost:4500";

//       const r = await fetch(`${SRV}/invite-alumno`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ name, email, coachId }),
//       });

//       if (r.status === 409) {
//         const e = new Error("Ese email ya existe");
//         e.code = "EMAIL_EXISTS";
//         throw e;
//       }

//       if (!r.ok) {
//         const t = await r.text();
//         throw new Error("No se pudo crear/enviar email: " + t);
//       }

//       return r.json();
//     },

//     async update(id, patch) {
//       throw new Error("Update de alumnos aún no migrado a Firestore");
//     },

//     async remove(id) {
//       throw new Error("Delete de alumnos aún no migrado a Firestore");
//     },
//   },

//   // --- RUTINAS ---
//   rutinas: {
//     async listByAlumno(alumnoId) {
//       const r = await fetch(`${BASE}/rutinas?alumnoId=${alumnoId}`);
//       return ok(r);
//     },
//     async get(id) {
//       const r = await fetch(`${BASE}/rutinas/${id}`);
//       if (r.status === 404) return null;
//       return ok(r);
//     },
//     async create(payload) {
//       const body = {
//         ...payload,
//         alumnoId: String(payload.alumnoId),
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };
//       const r = await fetch(`${BASE}/rutinas`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });
//       return ok(r);
//     },
//     async update(id, patch) {
//       const r = await fetch(`${BASE}/rutinas/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
//       });
//       return ok(r);
//     },
//     async remove(id) {
//       const r = await fetch(`${BASE}/rutinas/${id}`, { method: "DELETE" });
//       if (!r.ok) throw new Error("No se pudo borrar");
//       return true;
//     },
//   },

//   // --- PLANES ---
//   planes: {
//     async listByAlumno(alumnoId) {
//       const r = await fetch(
//         `${BASE}/planes?alumnoId=${encodeURIComponent(
//           String(alumnoId),
//         )}&_sort=updatedAt&_order=desc`,
//       );
//       return ok(r);
//     },
//     async get(id) {
//       const r = await fetch(`${BASE}/planes/${id}`);
//       if (r.status === 404) return null;
//       return ok(r);
//     },
//     async create(payload) {
//       const body = {
//         ...payload,
//         alumnoId: String(payload.alumnoId),
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };
//       const r = await fetch(`${BASE}/planes`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });
//       return ok(r);
//     },
//     async update(id, patch) {
//       const r = await fetch(`${BASE}/planes/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
//       });
//       return ok(r);
//     },
//     async remove(id) {
//       const r = await fetch(`${BASE}/planes/${id}`, { method: "DELETE" });
//       if (!r.ok) throw new Error("No se pudo borrar");
//       return true;
//     },
//   },

//   // --- PAGOS ---
//   pagos: {
//     async listByAlumno(alumnoId) {
//       const r = await fetch(
//         `${BASE}/pagos?alumnoId=${encodeURIComponent(
//           String(alumnoId),
//         )}&_sort=fecha&_order=desc`,
//       );
//       return ok(r);
//     },
//     async create({
//       alumnoId,
//       monto,
//       fecha = Date.now(),
//       estado = "pendiente",
//       nota = "",
//     }) {
//       const body = {
//         alumnoId: String(alumnoId),
//         monto,
//         fecha,
//         estado,
//         nota,
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };
//       const r = await fetch(`${BASE}/pagos`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });
//       return ok(r);
//     },
//     async update(id, patch) {
//       const r = await fetch(`${BASE}/pagos/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
//       });
//       return ok(r);
//     },
//     async remove(id) {
//       const r = await fetch(`${BASE}/pagos/${id}`, { method: "DELETE" });
//       if (!r.ok) throw new Error("No se pudo borrar");
//       return true;
//     },
//   },

//   // --- PROGRESOS ---
//   progresos: {
//     async listByAlumno(alumnoId) {
//       const r = await fetch(
//         `${BASE}/progresos?alumnoId=${encodeURIComponent(
//           String(alumnoId),
//         )}&_sort=fecha&_order=desc`,
//       );
//       return ok(r);
//     },
//     async create({ alumnoId, fecha = Date.now(), peso, medidas = {} }) {
//       const body = {
//         alumnoId: String(alumnoId),
//         fecha,
//         peso,
//         medidas,
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };
//       const r = await fetch(`${BASE}/progresos`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });
//       return ok(r);
//     },
//     async update(id, patch) {
//       const r = await fetch(`${BASE}/progresos/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
//       });
//       return ok(r);
//     },
//     async remove(id) {
//       const r = await fetch(`${BASE}/progresos/${id}`, { method: "DELETE" });
//       if (!r.ok) throw new Error("No se pudo borrar");
//       return true;
//     },
//   },

//   // --- MENSAJES ---
//   mensajes: {
//     async listByAlumno(alumnoId) {
//       const r = await fetch(
//         `${BASE}/mensajes?alumnoId=${encodeURIComponent(
//           String(alumnoId),
//         )}&_sort=createdAt&_order=desc`,
//       );
//       return ok(r);
//     },
//     async create({ alumnoId, from, text }) {
//       const body = {
//         alumnoId: String(alumnoId),
//         from,
//         text,
//         createdAt: Date.now(),
//       };
//       const r = await fetch(`${BASE}/mensajes`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });
//       return ok(r);
//     },
//     async remove(id) {
//       const r = await fetch(`${BASE}/mensajes/${id}`, { method: "DELETE" });
//       if (!r.ok) throw new Error("No se pudo borrar");
//       return true;
//     },
//   },
// };
