import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4500;
const JSON_API = process.env.JSON_API || "http://localhost:4100";
const APP_LOGIN_URL =
  process.env.APP_LOGIN_URL || "http://localhost:5173/login";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = process.env.FROM_NAME || "Entrenador App";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.warn(
    "[WARN] Falta RESEND_API_KEY en .env — no se podrán enviar emails."
  );
}

const resend = new Resend(RESEND_API_KEY);

function genPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Healthcheck
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "trainer-server",
    jsonApi: JSON_API,
    from: FROM_EMAIL,
  });
});

app.post("/invite-alumno", async (req, res) => {
  try {
    const { name, email, coachId = 1 } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: "Falta name o email" });
    }

    console.log("[INVITE] creando alumno:", { name, email, coachId });

    // 1) evitar duplicados
    const q = await fetch(
      `${JSON_API}/alumnos?email=${encodeURIComponent(email)}`
    );
    const existing = await q.json();
    if (existing.length) {
      console.log("[INVITE] email duplicado:", email);
      return res.status(409).json({ error: "EMAIL_EXISTS" });
    }

    // 2) generar y crear alumno
    const password = genPassword(10);
    const body = {
      name,
      email,
      password, // queda persistido en json-server (demo)
      role: "alumno",
      coachId,
      createdAt: Date.now(),
    };

    const r = await fetch(`${JSON_API}/alumnos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("[INVITE] error creando alumno en JSON_API:", t);
      return res.status(500).json({ error: "CREATE_FAILED", detail: t });
    }

    const created = await r.json();
    console.log("[INVITE] alumno creado:", created);

    // 3) enviar email (si hay API key)
    if (!RESEND_API_KEY) {
      console.warn(
        "[INVITE] RESEND_API_KEY no configurada; no se envía email."
      );
    } else {
      const subject = "Tu acceso al Panel de Alumno";
      const html = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5; color:#111">
          <h2>¡Hola ${name || ""}!</h2>
          <p>Te crearon un acceso al panel de alumno. Podés entrar con:</p>
          <ul>
            <li><b>Email:</b> ${email}</li>
            <li><b>Contraseña:</b> <code>${password}</code></li>
          </ul>
          <p>Ingresá desde este enlace:</p>
          <p><a href="${APP_LOGIN_URL}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none">Ir al panel</a></p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <small>Si no esperabas este mensaje, podés ignorarlo.</small>
        </div>
      `;

      try {
        const sendRes = await resend.emails.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: email,
          subject,
          html,
        });
        console.log("[INVITE] resend response:", sendRes);
      } catch (err) {
        console.error("[INVITE] error enviando email:", err?.message || err);
        // no rompemos el flujo: el alumno queda creado igual
      }
    }

    // 4) devolvemos el creado
    res.json({ ...created, sent: !!RESEND_API_KEY });
  } catch (e) {
    console.error("[INVITE] server error:", e);
    res
      .status(500)
      .json({ error: "SERVER_ERROR", detail: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
