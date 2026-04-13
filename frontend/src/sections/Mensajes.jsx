import { useEffect, useState } from "react";
import { api } from "../api";

export default function Mensajes({ alumnoId, userName }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");

  const load = async () => setList(await api.mensajes.listByAlumno(alumnoId));
  useEffect(() => {
    load();
  }, [alumnoId]);

  const send = async () => {
    if (!text.trim()) return;
    await api.mensajes.create({ alumnoId, from: userName || "Usuario", text });
    setText("");
    await load();
  };

  return (
    <div className="grid" style={{ gap: 12 }}>
      <h2 className="title">Mensajes</h2>
      <div className="grid" style={{ gap: 8 }}>
        {[...list].reverse().map((m) => (
          <div className="card" key={m.id}>
            <strong>{m.from}:</strong> {m.text}
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input
          placeholder="Escribí un mensaje…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn primary" onClick={send}>
          Enviar
        </button>
      </div>
    </div>
  );
}
