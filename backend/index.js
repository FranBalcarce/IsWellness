import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://is-wellness.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.options("*", cors());
app.use(express.json());

const PORT = process.env.PORT || 4500;
const APP_LOGIN_URL =
  process.env.APP_LOGIN_URL || "http://localhost:5173/login";

// ===== Firebase Admin Init =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const keyPath = path.join(__dirname, "serviceAccountKey.json");

  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin no configurado. Creá backend/serviceAccountKey.json o configurá FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY",
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

initFirebaseAdmin();

const db = admin.firestore();

// ===== Helpers =====
function sanitizeRutinaPayload(body = {}) {
  const nombre = String(
    body.nombre || body.nombreRutina || body.title || body.name || "",
  ).trim();

  const alumnoId = String(
    body.alumnoId || body.studentId || body.userId || "",
  ).trim();

  const coachId = String(body.coachId || body.entrenadorId || "coach-1").trim();

  const ejercicios = Array.isArray(body.ejercicios)
    ? body.ejercicios
        .map((ej, index) => {
          const nombreEjercicio = String(
            ej?.nombre || ej?.name || ej?.ejercicio || "",
          ).trim();

          const series = Array.isArray(ej?.series)
            ? ej.series.map((serie) => ({
                reps: Number(serie?.reps ?? serie?.repeticiones ?? 0),
                done: Boolean(serie?.done ?? false),
              }))
            : [];

          const video = String(
            ej?.video || ej?.videoUrl || ej?.youtubeUrl || ej?.url || "",
          ).trim();

          return {
            id: ej?.id || `ej-${index + 1}`,
            nombre: nombreEjercicio,
            series,
            video,
          };
        })
        .filter((ej) => ej.nombre)
    : [];

  return {
    nombre,
    alumnoId,
    coachId,
    ejercicios,
  };
}

// ===== Healthcheck =====
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "trainer-server",
    firebase: true,
    loginUrl: APP_LOGIN_URL,
  });
});

// ======================================================
// CREAR ALUMNO
// ======================================================
app.post("/invite-alumno", async (req, res) => {
  try {
    const { name, email, coachId = "" } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ error: "Falta name o email" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanCoachId = String(coachId || "").trim() || "coach-1";

    try {
      await admin.auth().getUserByEmail(cleanEmail);
      return res.status(409).json({ error: "EMAIL_EXISTS" });
    } catch (_e) {
      // Si no existe, seguimos
    }

    const userRecord = await admin.auth().createUser({
      email: cleanEmail,
      displayName: cleanName,
      emailVerified: false,
      disabled: false,
    });

    const uid = userRecord.uid;

    await db.doc(`users/${uid}`).set(
      {
        uid,
        role: "alumno",
        name: cleanName,
        email: cleanEmail,
        coachId: cleanCoachId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await db.doc(`coaches/${cleanCoachId}/students/${uid}`).set(
      {
        uid,
        name: cleanName,
        email: cleanEmail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const resetLink = await admin.auth().generatePasswordResetLink(cleanEmail, {
      url: APP_LOGIN_URL,
      handleCodeInApp: false,
    });

    console.log("RESET LINK DEL ALUMNO:", cleanEmail, resetLink);

    return res.json({
      id: uid,
      uid,
      name: cleanName,
      email: cleanEmail,
      role: "alumno",
      coachId: cleanCoachId,
      resetLink,
    });
  } catch (e) {
    console.error("[INVITE] server error:", e);

    return res.status(500).json({
      error: "SERVER_ERROR",
      detail: String(e?.message || e),
    });
  }
});

// ======================================================
// ELIMINAR ALUMNO
// ======================================================
app.delete("/alumnos/:uid", async (req, res) => {
  try {
    const uid = String(req.params.uid || "").trim();

    if (!uid) {
      return res.status(400).json({ error: "Falta uid" });
    }

    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "ALUMNO_NOT_FOUND" });
    }

    const userData = userSnap.data() || {};
    const coachId = String(userData.coachId || "").trim();

    // Borrar referencia bajo el coach si existe
    if (coachId) {
      const coachStudentRef = db.doc(`coaches/${coachId}/students/${uid}`);
      const coachStudentSnap = await coachStudentRef.get();

      if (coachStudentSnap.exists) {
        await coachStudentRef.delete();
      }
    }

    // Borrar perfil del usuario en Firestore
    await userRef.delete();

    // Borrar usuario en Firebase Auth
    try {
      await admin.auth().deleteUser(uid);
    } catch (authError) {
      // Si no existe en Auth, no cortamos todo el flujo
      console.warn("[ALUMNOS][DELETE][AUTH]", authError?.message || authError);
    }

    return res.json({
      ok: true,
      deletedUid: uid,
    });
  } catch (e) {
    console.error("[ALUMNOS][DELETE] error:", e);

    return res.status(500).json({
      error: "ALUMNO_DELETE_FAILED",
      detail: String(e?.message || e),
    });
  }
});
// ======================================================
// REENVIAR / GENERAR LINK DE CONTRASEÑA
// ======================================================
app.post("/reset-link", async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Falta email" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const resetLink = await admin.auth().generatePasswordResetLink(cleanEmail, {
      url: APP_LOGIN_URL,
      handleCodeInApp: false,
    });

    console.log("RESET LINK EXISTENTE:", cleanEmail, resetLink);

    return res.json({
      ok: true,
      email: cleanEmail,
      resetLink,
    });
  } catch (e) {
    console.error("[RESET LINK ERROR]", e);

    return res.status(500).json({
      error: "RESET_LINK_FAILED",
      detail: String(e?.message || e),
    });
  }
});

// ======================================================
// CREAR RUTINA
// ======================================================
app.post("/rutinas", async (req, res) => {
  try {
    const { nombre, alumnoId, coachId, ejercicios } = sanitizeRutinaPayload(
      req.body,
    );

    if (!nombre) {
      return res.status(400).json({ error: "Falta el nombre de la rutina" });
    }

    if (!alumnoId) {
      return res.status(400).json({ error: "Falta alumnoId" });
    }

    const rutinaRef = db.collection("rutinas").doc();

    const rutina = {
      id: rutinaRef.id,
      nombre,
      alumnoId,
      coachId,
      ejercicios,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await rutinaRef.set(rutina);

    return res.status(201).json({
      ok: true,
      rutina: {
        id: rutina.id,
        nombre: rutina.nombre,
        alumnoId: rutina.alumnoId,
        coachId: rutina.coachId,
        ejercicios: rutina.ejercicios,
      },
    });
  } catch (e) {
    console.error("[RUTINAS][CREATE] error:", e);

    return res.status(500).json({
      error: "RUTINA_CREATE_FAILED",
      detail: String(e?.message || e),
    });
  }
});

// ======================================================
// LISTAR RUTINAS POR ALUMNO
// ======================================================
app.get("/rutinas/:alumnoId", async (req, res) => {
  try {
    const alumnoId = String(req.params.alumnoId || "").trim();

    if (!alumnoId) {
      return res.status(400).json({ error: "Falta alumnoId" });
    }

    const snapshot = await db
      .collection("rutinas")
      .where("alumnoId", "==", alumnoId)
      .get();

    const rutinas = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });

    return res.json({
      ok: true,
      rutinas,
    });
  } catch (e) {
    console.error("[RUTINAS][LIST] error:", e);

    return res.status(500).json({
      error: "RUTINAS_LIST_FAILED",
      detail: String(e?.message || e),
    });
  }
});

// ======================================================
// OBTENER UNA RUTINA
// ======================================================
app.get("/rutinas/item/:rutinaId", async (req, res) => {
  try {
    const rutinaId = String(req.params.rutinaId || "").trim();

    if (!rutinaId) {
      return res.status(400).json({ error: "Falta rutinaId" });
    }

    const doc = await db.collection("rutinas").doc(rutinaId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "RUTINA_NOT_FOUND" });
    }

    return res.json({
      ok: true,
      rutina: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (e) {
    console.error("[RUTINAS][GET] error:", e);

    return res.status(500).json({
      error: "RUTINA_GET_FAILED",
      detail: String(e?.message || e),
    });
  }
});

// ======================================================
// EDITAR RUTINA
// ======================================================
app.put("/rutinas/:rutinaId", async (req, res) => {
  try {
    const rutinaId = String(req.params.rutinaId || "").trim();

    if (!rutinaId) {
      return res.status(400).json({ error: "Falta rutinaId" });
    }

    const { nombre, alumnoId, coachId, ejercicios } = sanitizeRutinaPayload(
      req.body,
    );

    const docRef = db.collection("rutinas").doc(rutinaId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "RUTINA_NOT_FOUND" });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (nombre) updateData.nombre = nombre;
    if (alumnoId) updateData.alumnoId = alumnoId;
    if (coachId) updateData.coachId = coachId;
    if (Array.isArray(ejercicios)) updateData.ejercicios = ejercicios;

    await docRef.set(updateData, { merge: true });

    const updated = await docRef.get();

    return res.json({
      ok: true,
      rutina: {
        id: updated.id,
        ...updated.data(),
      },
    });
  } catch (e) {
    console.error("[RUTINAS][UPDATE] error:", e);

    return res.status(500).json({
      error: "RUTINA_UPDATE_FAILED",
      detail: String(e?.message || e),
    });
  }
});

// ======================================================
// ELIMINAR RUTINA
// ======================================================
app.delete("/rutinas/:rutinaId", async (req, res) => {
  try {
    const rutinaId = String(req.params.rutinaId || "").trim();

    if (!rutinaId) {
      return res.status(400).json({ error: "Falta rutinaId" });
    }

    const docRef = db.collection("rutinas").doc(rutinaId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "RUTINA_NOT_FOUND" });
    }

    await docRef.delete();

    return res.json({
      ok: true,
      deletedId: rutinaId,
    });
  } catch (e) {
    console.error("[RUTINAS][DELETE] error:", e);

    return res.status(500).json({
      error: "RUTINA_DELETE_FAILED",
      detail: String(e?.message || e),
    });
  }
});

function sanitizePlanPayload(body = {}) {
  return {
    nombre: String(body.nombre || body.name || "").trim(),
    alumnoId: String(body.alumnoId || "").trim(),
    items: Array.isArray(body.items)
      ? body.items.map((i) => String(i || "").trim()).filter(Boolean)
      : [],
  };
}

function sanitizePagoPayload(body = {}) {
  return {
    alumnoId: String(body.alumnoId || "").trim(),
    monto: Number(body.monto || 0),
    fecha: String(body.fecha || "").trim(),
    estado: String(body.estado || "pendiente").trim(),
    nota: String(body.nota || "").trim(),
  };
}

function sanitizeProgresoPayload(body = {}) {
  return {
    alumnoId: String(body.alumnoId || "").trim(),
    fecha: String(body.fecha || "").trim(),
    peso: Number(body.peso || 0),
    medidas: body.medidas || {},
  };
}

function sanitizeMensajePayload(body = {}) {
  return {
    alumnoId: String(body.alumnoId || "").trim(),
    texto: String(body.texto || body.text || "").trim(),
    autor: String(body.autor || body.from || "coach").trim(),
  };
}

// ================= PLANES =================
app.post("/planes", async (req, res) => {
  try {
    const { nombre, alumnoId, items } = sanitizePlanPayload(req.body);
    if (!nombre) return res.status(400).json({ error: "Falta nombre" });
    if (!alumnoId) return res.status(400).json({ error: "Falta alumnoId" });

    const ref = db.collection("planes").doc();
    const plan = {
      id: ref.id,
      nombre,
      alumnoId,
      items,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(plan);
    return res.status(201).json({ ok: true, plan });
  } catch (e) {
    console.error("[PLANES][CREATE]", e);
    return res
      .status(500)
      .json({ error: "PLAN_CREATE_FAILED", detail: String(e?.message || e) });
  }
});

app.get("/planes/:alumnoId", async (req, res) => {
  try {
    const alumnoId = String(req.params.alumnoId || "").trim();
    const snap = await db
      .collection("planes")
      .where("alumnoId", "==", alumnoId)
      .get();
    const planes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ ok: true, planes });
  } catch (e) {
    console.error("[PLANES][LIST]", e);
    return res
      .status(500)
      .json({ error: "PLAN_LIST_FAILED", detail: String(e?.message || e) });
  }
});

app.put("/planes/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const { nombre, alumnoId, items } = sanitizePlanPayload(req.body);
    const ref = db.collection("planes").doc(id);

    await ref.set(
      {
        nombre,
        alumnoId,
        items,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const updated = await ref.get();
    return res.json({ ok: true, plan: { id: updated.id, ...updated.data() } });
  } catch (e) {
    console.error("[PLANES][UPDATE]", e);
    return res
      .status(500)
      .json({ error: "PLAN_UPDATE_FAILED", detail: String(e?.message || e) });
  }
});

app.delete("/planes/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    await db.collection("planes").doc(id).delete();
    return res.json({ ok: true });
  } catch (e) {
    console.error("[PLANES][DELETE]", e);
    return res
      .status(500)
      .json({ error: "PLAN_DELETE_FAILED", detail: String(e?.message || e) });
  }
});

// ================= PAGOS =================
app.post("/pagos", async (req, res) => {
  try {
    const pago = sanitizePagoPayload(req.body);
    if (!pago.alumnoId)
      return res.status(400).json({ error: "Falta alumnoId" });

    const ref = db.collection("pagos").doc();
    const data = {
      id: ref.id,
      ...pago,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(data);
    return res.status(201).json({ ok: true, pago: data });
  } catch (e) {
    console.error("[PAGOS][CREATE]", e);
    return res
      .status(500)
      .json({ error: "PAGO_CREATE_FAILED", detail: String(e?.message || e) });
  }
});

app.get("/pagos/:alumnoId", async (req, res) => {
  try {
    const alumnoId = String(req.params.alumnoId || "").trim();
    const snap = await db
      .collection("pagos")
      .where("alumnoId", "==", alumnoId)
      .get();
    const pagos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ ok: true, pagos });
  } catch (e) {
    console.error("[PAGOS][LIST]", e);
    return res
      .status(500)
      .json({ error: "PAGO_LIST_FAILED", detail: String(e?.message || e) });
  }
});

app.put("/pagos/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const pago = sanitizePagoPayload(req.body);

    await db
      .collection("pagos")
      .doc(id)
      .set(
        {
          ...pago,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    const updated = await db.collection("pagos").doc(id).get();
    return res.json({ ok: true, pago: { id: updated.id, ...updated.data() } });
  } catch (e) {
    console.error("[PAGOS][UPDATE]", e);
    return res
      .status(500)
      .json({ error: "PAGO_UPDATE_FAILED", detail: String(e?.message || e) });
  }
});

app.delete("/pagos/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    await db.collection("pagos").doc(id).delete();
    return res.json({ ok: true });
  } catch (e) {
    console.error("[PAGOS][DELETE]", e);
    return res
      .status(500)
      .json({ error: "PAGO_DELETE_FAILED", detail: String(e?.message || e) });
  }
});

// ================= PROGRESOS =================
app.post("/progresos", async (req, res) => {
  try {
    const progreso = sanitizeProgresoPayload(req.body);
    if (!progreso.alumnoId)
      return res.status(400).json({ error: "Falta alumnoId" });

    const ref = db.collection("progresos").doc();
    const data = {
      id: ref.id,
      ...progreso,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(data);
    return res.status(201).json({ ok: true, progreso: data });
  } catch (e) {
    console.error("[PROGRESOS][CREATE]", e);
    return res
      .status(500)
      .json({
        error: "PROGRESO_CREATE_FAILED",
        detail: String(e?.message || e),
      });
  }
});

app.get("/progresos/:alumnoId", async (req, res) => {
  try {
    const alumnoId = String(req.params.alumnoId || "").trim();
    const snap = await db
      .collection("progresos")
      .where("alumnoId", "==", alumnoId)
      .get();
    const progresos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ ok: true, progresos });
  } catch (e) {
    console.error("[PROGRESOS][LIST]", e);
    return res
      .status(500)
      .json({ error: "PROGRESO_LIST_FAILED", detail: String(e?.message || e) });
  }
});

app.put("/progresos/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const progreso = sanitizeProgresoPayload(req.body);

    await db
      .collection("progresos")
      .doc(id)
      .set(
        {
          ...progreso,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    const updated = await db.collection("progresos").doc(id).get();
    return res.json({
      ok: true,
      progreso: { id: updated.id, ...updated.data() },
    });
  } catch (e) {
    console.error("[PROGRESOS][UPDATE]", e);
    return res
      .status(500)
      .json({
        error: "PROGRESO_UPDATE_FAILED",
        detail: String(e?.message || e),
      });
  }
});

app.delete("/progresos/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    await db.collection("progresos").doc(id).delete();
    return res.json({ ok: true });
  } catch (e) {
    console.error("[PROGRESOS][DELETE]", e);
    return res
      .status(500)
      .json({
        error: "PROGRESO_DELETE_FAILED",
        detail: String(e?.message || e),
      });
  }
});

// ================= MENSAJES =================
app.post("/mensajes", async (req, res) => {
  try {
    const mensaje = sanitizeMensajePayload(req.body);
    if (!mensaje.alumnoId)
      return res.status(400).json({ error: "Falta alumnoId" });
    if (!mensaje.texto) return res.status(400).json({ error: "Falta texto" });

    const ref = db.collection("mensajes").doc();
    const data = {
      id: ref.id,
      ...mensaje,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(data);
    return res.status(201).json({ ok: true, mensaje: data });
  } catch (e) {
    console.error("[MENSAJES][CREATE]", e);
    return res
      .status(500)
      .json({
        error: "MENSAJE_CREATE_FAILED",
        detail: String(e?.message || e),
      });
  }
});

app.get("/mensajes/:alumnoId", async (req, res) => {
  try {
    const alumnoId = String(req.params.alumnoId || "").trim();
    const snap = await db
      .collection("mensajes")
      .where("alumnoId", "==", alumnoId)
      .get();
    const mensajes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ ok: true, mensajes });
  } catch (e) {
    console.error("[MENSAJES][LIST]", e);
    return res
      .status(500)
      .json({ error: "MENSAJE_LIST_FAILED", detail: String(e?.message || e) });
  }
});

app.delete("/mensajes/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    await db.collection("mensajes").doc(id).delete();
    return res.json({ ok: true });
  } catch (e) {
    console.error("[MENSAJES][DELETE]", e);
    return res
      .status(500)
      .json({
        error: "MENSAJE_DELETE_FAILED",
        detail: String(e?.message || e),
      });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});

// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import fetch from "node-fetch";
// import { Resend } from "resend";

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = process.env.PORT || 4500;
// const JSON_API = process.env.JSON_API || "http://localhost:4100";
// const APP_LOGIN_URL =
//   process.env.APP_LOGIN_URL || "http://localhost:5173/login";
// const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
// const FROM_NAME = process.env.FROM_NAME || "Entrenador App";
// const RESEND_API_KEY = process.env.RESEND_API_KEY;

// if (!RESEND_API_KEY) {
//   console.warn(
//     "[WARN] Falta RESEND_API_KEY en .env — no se podrán enviar emails."
//   );
// }

// const resend = new Resend(RESEND_API_KEY);

// function genPassword(len = 10) {
//   const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
//   let out = "";
//   for (let i = 0; i < len; i++)
//     out += chars[Math.floor(Math.random() * chars.length)];
//   return out;
// }

// // Healthcheck
// app.get("/", (_req, res) => {
//   res.json({
//     ok: true,
//     service: "trainer-server",
//     jsonApi: JSON_API,
//     from: FROM_EMAIL,
//   });
// });

// app.post("/invite-alumno", async (req, res) => {
//   try {
//     const { name, email, coachId = 1 } = req.body || {};
//     if (!name || !email) {
//       return res.status(400).json({ error: "Falta name o email" });
//     }

//     console.log("[INVITE] creando alumno:", { name, email, coachId });

//     // 1) evitar duplicados
//     const q = await fetch(
//       `${JSON_API}/alumnos?email=${encodeURIComponent(email)}`
//     );
//     const existing = await q.json();
//     if (existing.length) {
//       console.log("[INVITE] email duplicado:", email);
//       return res.status(409).json({ error: "EMAIL_EXISTS" });
//     }

//     // 2) generar y crear alumno
//     const password = genPassword(10);
//     const body = {
//       name,
//       email,
//       password, // queda persistido en json-server (demo)
//       role: "alumno",
//       coachId,
//       createdAt: Date.now(),
//     };

//     const r = await fetch(`${JSON_API}/alumnos`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });

//     if (!r.ok) {
//       const t = await r.text();
//       console.error("[INVITE] error creando alumno en JSON_API:", t);
//       return res.status(500).json({ error: "CREATE_FAILED", detail: t });
//     }

//     const created = await r.json();
//     console.log("[INVITE] alumno creado:", created);

//     // 3) enviar email (si hay API key)
//     if (!RESEND_API_KEY) {
//       console.warn(
//         "[INVITE] RESEND_API_KEY no configurada; no se envía email."
//       );
//     } else {
//       const subject = "Tu acceso al Panel de Alumno";
//       const html = `
//         <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5; color:#111">
//           <h2>¡Hola ${name || ""}!</h2>
//           <p>Te crearon un acceso al panel de alumno. Podés entrar con:</p>
//           <ul>
//             <li><b>Email:</b> ${email}</li>
//             <li><b>Contraseña:</b> <code>${password}</code></li>
//           </ul>
//           <p>Ingresá desde este enlace:</p>
//           <p><a href="${APP_LOGIN_URL}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none">Ir al panel</a></p>
//           <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
//           <small>Si no esperabas este mensaje, podés ignorarlo.</small>
//         </div>
//       `;

//       try {
//         const sendRes = await resend.emails.send({
//           from: `${FROM_NAME} <${FROM_EMAIL}>`,
//           to: email,
//           subject,
//           html,
//         });
//         console.log("[INVITE] resend response:", sendRes);
//       } catch (err) {
//         console.error("[INVITE] error enviando email:", err?.message || err);
//         // no rompemos el flujo: el alumno queda creado igual
//       }
//     }

//     // 4) devolvemos el creado
//     res.json({ ...created, sent: !!RESEND_API_KEY });
//   } catch (e) {
//     console.error("[INVITE] server error:", e);
//     res
//       .status(500)
//       .json({ error: "SERVER_ERROR", detail: String(e?.message || e) });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server listening on http://localhost:${PORT}`);
// });
