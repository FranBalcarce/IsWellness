import { useEffect, useState } from "react";
import { api } from "../api";

export default function Mensajes({ alumnoId, isAlumno }) {
  const alumnoKey = String(alumnoId);
  const [list, setList] = useState([]);
  const [texto, setTexto] = useState("");

  const load = async () => {
    try {
      const data = await api.mensajes.listByAlumno(alumnoKey);
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar los mensajes.");
    }
  };

  useEffect(() => {
    load();
  }, [alumnoKey]);

  const send = async () => {
    if (!texto.trim()) return;

    try {
      await api.mensajes.create({
        alumnoId: alumnoKey,
        texto: texto.trim(),
        autor: isAlumno ? "alumno" : "coach",
      });

      setTexto("");
      await load();
    } catch (e) {
      console.error(e);
      alert("No se pudo enviar el mensaje.");
    }
  };

  return (
    <div className="grid" style={{ gap: 12 }}>
      <h2 className="title">Mensajes</h2>

      <div className="grid" style={{ gap: 8 }}>
        {list.length === 0 ? (
          <div className="empty-state">Todavía no hay mensajes.</div>
        ) : (
          list.map((m) => (
            <div className="card" key={m.id}>
              <strong>{m.autor || "Sin autor"}:</strong>{" "}
              {m.texto || "Sin contenido"}
            </div>
          ))
        )}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí un mensaje..."
        />
        <button type="button" className="btn primary" onClick={send}>
          Enviar
        </button>
      </div>
    </div>
  );
}
