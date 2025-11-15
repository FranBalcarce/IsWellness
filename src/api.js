// src/api.js
const BASE = import.meta.env?.VITE_API_BASE ?? "http://localhost:4100";

function ok(r) {
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function genPassword(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const api = {
  // --- AUTENTICACIÓN ---
  auth: {
    async login(email, password) {
      // Buscar en coaches
      const rc = await fetch(
        `${BASE}/coaches?email=${encodeURIComponent(email)}`
      );
      const coaches = await ok(rc);
      if (coaches.length) {
        const c = coaches[0];
        if (c.password === password)
          return { id: c.id, name: c.name, email: c.email, role: "coach" };
        throw new Error("Contraseña incorrecta");
      }

      // Buscar en alumnos
      const ra = await fetch(
        `${BASE}/alumnos?email=${encodeURIComponent(email)}`
      );
      const alumnos = await ok(ra);
      if (alumnos.length) {
        const a = alumnos[0];
        if (a.password === password)
          return { id: a.id, name: a.name, email: a.email, role: "alumno" };
        throw new Error("Contraseña incorrecta");
      }
      throw new Error("Usuario no encontrado");
    },
  },

  // --- ALUMNOS ---
  // src/api.js (solo reemplazar alumnos.create)
  alumnos: {
    async list() {
      const r = await fetch(`${BASE}/alumnos?_sort=id&_order=desc`);
      return ok(r);
    },
    async get(id) {
      const r = await fetch(`${BASE}/alumnos/${id}`);
      if (r.status === 404) return null;
      return ok(r);
    },
    async create({ name, email, coachId = 1 }) {
      // ahora lo hace el micro-server
      const SRV = import.meta.env?.VITE_SERVER_BASE ?? "http://localhost:4500";
      const r = await fetch(`${SRV}/invite-alumno`, {
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
      // el server ya creó el alumno y envió el mail
      const created = await r.json();
      // opcional: si querés seguir mostrando algo, podrías agregar tempPassword
      return created;
    },
    async update(id, patch) {
      const r = await fetch(`${BASE}/alumnos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
      });
      return ok(r);
    },
    async remove(id) {
      const r = await fetch(`${BASE}/alumnos/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo eliminar el alumno");
      return true;
    },
  },

  // --- RUTINAS ---
  rutinas: {
    async listByAlumno(alumnoId) {
      const r = await fetch(`${BASE}/rutinas?alumnoId=${alumnoId}`);
      return ok(r);
    },
    async get(id) {
      const r = await fetch(`${BASE}/rutinas/${id}`);
      if (r.status === 404) return null;
      return ok(r);
    },
    async create(payload) {
      const body = {
        ...payload,
        alumnoId: String(payload.alumnoId),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const r = await fetch(`${BASE}/rutinas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return ok(r);
    },
    async update(id, patch) {
      const r = await fetch(`${BASE}/rutinas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
      });
      return ok(r);
    },
    async remove(id) {
      const r = await fetch(`${BASE}/rutinas/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo borrar");
      return true;
    },
  },

  // --- PLANES ---
  planes: {
    async listByAlumno(alumnoId) {
      const r = await fetch(
        `${BASE}/planes?alumnoId=${encodeURIComponent(
          String(alumnoId)
        )}&_sort=updatedAt&_order=desc`
      );
      return ok(r);
    },
    async get(id) {
      const r = await fetch(`${BASE}/planes/${id}`);
      if (r.status === 404) return null;
      return ok(r);
    },
    async create(payload) {
      const body = {
        ...payload,
        alumnoId: String(payload.alumnoId),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const r = await fetch(`${BASE}/planes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return ok(r);
    },
    async update(id, patch) {
      const r = await fetch(`${BASE}/planes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
      });
      return ok(r);
    },
    async remove(id) {
      const r = await fetch(`${BASE}/planes/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo borrar");
      return true;
    },
  },

  // --- PAGOS ---
  pagos: {
    async listByAlumno(alumnoId) {
      const r = await fetch(
        `${BASE}/pagos?alumnoId=${encodeURIComponent(
          String(alumnoId)
        )}&_sort=fecha&_order=desc`
      );
      return ok(r);
    },
    async create({
      alumnoId,
      monto,
      fecha = Date.now(),
      estado = "pendiente",
      nota = "",
    }) {
      const body = {
        alumnoId: String(alumnoId),
        monto,
        fecha,
        estado,
        nota,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const r = await fetch(`${BASE}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return ok(r);
    },
    async update(id, patch) {
      const r = await fetch(`${BASE}/pagos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
      });
      return ok(r);
    },
    async remove(id) {
      const r = await fetch(`${BASE}/pagos/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo borrar");
      return true;
    },
  },

  // --- PROGRESOS ---
  progresos: {
    async listByAlumno(alumnoId) {
      const r = await fetch(
        `${BASE}/progresos?alumnoId=${encodeURIComponent(
          String(alumnoId)
        )}&_sort=fecha&_order=desc`
      );
      return ok(r);
    },
    async create({ alumnoId, fecha = Date.now(), peso, medidas = {} }) {
      const body = {
        alumnoId: String(alumnoId),
        fecha,
        peso,
        medidas,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const r = await fetch(`${BASE}/progresos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return ok(r);
    },
    async update(id, patch) {
      const r = await fetch(`${BASE}/progresos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, updatedAt: Date.now() }),
      });
      return ok(r);
    },
    async remove(id) {
      const r = await fetch(`${BASE}/progresos/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo borrar");
      return true;
    },
  },

  // --- MENSAJES ---
  mensajes: {
    async listByAlumno(alumnoId) {
      const r = await fetch(
        `${BASE}/mensajes?alumnoId=${encodeURIComponent(
          String(alumnoId)
        )}&_sort=createdAt&_order=desc`
      );
      return ok(r);
    },
    async create({ alumnoId, from, text }) {
      const body = {
        alumnoId: String(alumnoId),
        from,
        text,
        createdAt: Date.now(),
      };
      const r = await fetch(`${BASE}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return ok(r);
    },
    async remove(id) {
      const r = await fetch(`${BASE}/mensajes/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo borrar");
      return true;
    },
  },
};
