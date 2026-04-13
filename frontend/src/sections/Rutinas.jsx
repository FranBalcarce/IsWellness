import { useEffect, useState } from "react";
import { api } from "../api";
import ConfirmDeleteButton from "../components/ConfirmDeleteButton.jsx";

function isYouTube(url) {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
}
function videoEmbed(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
  } catch (e) {}
  return "";
}

export default function Rutinas({ alumnoId, isAlumno }) {
  const alumnoKey = String(alumnoId);
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const blankRutina = {
    nombre: "",
    ejercicios: [
      {
        nombre: "",
        video: "",
        series: [
          { reps: 12, done: false },
          { reps: 10, done: false },
          { reps: 8, done: false },
        ],
      },
    ],
  };
  const [form, setForm] = useState(blankRutina);

  const load = async () => {
    try {
      const data = await api.rutinas.listByAlumno(alumnoKey);
      setList(data);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar las rutinas.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoKey]);

  const openNew = () => {
    setEditing(null);
    setForm(blankRutina);
    setOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm(JSON.parse(JSON.stringify(r)));
    setOpen(true);
  };

  const save = async () => {
    if (!form.nombre || !form.ejercicios.length) {
      alert("Completá el nombre y al menos un ejercicio.");
      return;
    }
    try {
      const payload = { ...form, alumnoId: alumnoKey };
      if (editing) {
        await api.rutinas.update(editing.id, payload);
      } else {
        await api.rutinas.create(payload);
      }
      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar la rutina.");
    }
  };

  const remove = async (id) => {
    try {
      await api.rutinas.remove(id);
      await load();
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la rutina.");
    }
  };

  const toggleSetDone = async (rutinaId, exIdx, setIdx) => {
    try {
      const r = await api.rutinas.get(rutinaId);
      if (!r?.ejercicios?.[exIdx]?.series?.[setIdx]) return;
      const ex = r.ejercicios[exIdx];
      ex.series[setIdx].done = !ex.series[setIdx].done;
      await api.rutinas.update(rutinaId, { ejercicios: r.ejercicios });
      await load();
    } catch (e) {
      console.error(e);
      alert("No se pudo actualizar la serie.");
    }
  };

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="title">Rutinas</h2>
        {!isAlumno && (
          <button type="button" className="btn" onClick={openNew}>
            + Nueva rutina
          </button>
        )}
      </div>

      {list.map((r) => (
        <div className="card" key={r.id}>
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <h3 style={{ margin: 0 }}>{r.nombre}</h3>
            {!isAlumno && (
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => openEdit(r)}
                >
                  Editar
                </button>

                <ConfirmDeleteButton
                  label="Eliminar"
                  confirmText="¿Eliminar esta rutina?"
                  onConfirm={() => remove(r.id)}
                />
              </div>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            {r.ejercicios.map((e, exIdx) => {
              const yt = isYouTube(e.video) ? videoEmbed(e.video) : "";
              return (
                <div className="exercise" key={exIdx}>
                  <h4>{e.nombre}</h4>
                  <div className="sets">
                    {e.series.map((s, setIdx) => (
                      <div
                        key={setIdx}
                        className={"set" + (s.done ? " done" : "")}
                        onClick={() => toggleSetDone(r.id, exIdx, setIdx)}
                        title="Marcar como hecho"
                        style={{ cursor: "pointer" }}
                      >
                        {s.reps} reps
                      </div>
                    ))}
                  </div>
                  {e.video && (
                    <div style={{ marginTop: 8 }}>
                      {yt ? (
                        <iframe
                          width="100%"
                          height="200"
                          src={`https://www.youtube.com/embed/${yt}`}
                          title="Video ejercicio"
                          frameBorder="0"
                          allowFullScreen
                        />
                      ) : (
                        <a href={e.video} target="_blank" rel="noreferrer">
                          Ver video
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {open && (
        <dialog open>
          <div className="dialog-body grid" style={{ gap: 10 }}>
            <h3 className="title" style={{ marginTop: 0 }}>
              {editing ? "Editar rutina" : "Nueva rutina"}
            </h3>

            <div>
              <label>Nombre de la rutina</label>
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label>Ejercicios</label>
              {form.ejercicios.map((e, i) => (
                <div className="card" key={i}>
                  <div className="grid" style={{ gap: 8 }}>
                    <input
                      placeholder="Nombre del ejercicio"
                      value={e.nombre}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setForm((f) => {
                          const arr = [...f.ejercicios];
                          arr[i] = { ...arr[i], nombre: v };
                          return { ...f, ejercicios: arr };
                        });
                      }}
                    />

                    <input
                      placeholder="URL de video (YouTube u otro, opcional)"
                      value={e.video}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setForm((f) => {
                          const arr = [...f.ejercicios];
                          arr[i] = { ...arr[i], video: v };
                          return { ...f, ejercicios: arr };
                        });
                      }}
                    />

                    <div>
                      <label>Series</label>
                      <div className="sets">
                        {e.series.map((s, si) => (
                          <div key={si} className="row" style={{ gap: 6 }}>
                            <input
                              type="number"
                              min="1"
                              value={s.reps}
                              onChange={(ev) => {
                                const reps = parseInt(
                                  ev.target.value || "0",
                                  10
                                );
                                setForm((f) => {
                                  const arr = [...f.ejercicios];
                                  const ss = [...arr[i].series];
                                  ss[si] = { ...ss[si], reps };
                                  arr[i] = { ...arr[i], series: ss };
                                  return { ...f, ejercicios: arr };
                                });
                              }}
                              style={{ width: 80 }}
                            />
                            <button
                              type="button"
                              className="btn"
                              onClick={() => {
                                setForm((f) => {
                                  const arr = [...f.ejercicios];
                                  arr[i] = {
                                    ...arr[i],
                                    series: arr[i].series.filter(
                                      (_, idx) => idx !== si
                                    ),
                                  };
                                  return { ...f, ejercicios: arr };
                                });
                              }}
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setForm((f) => {
                              const arr = [...f.ejercicios];
                              arr[i] = {
                                ...arr[i],
                                series: [
                                  ...arr[i].series,
                                  { reps: 10, done: false },
                                ],
                              };
                              return { ...f, ejercicios: arr };
                            });
                          }}
                        >
                          + Serie
                        </button>
                      </div>
                    </div>

                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            ejercicios: f.ejercicios.filter(
                              (_, idx) => idx !== i
                            ),
                          }));
                        }}
                      >
                        Eliminar ejercicio
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn"
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    ejercicios: [
                      ...f.ejercicios,
                      {
                        nombre: "",
                        video: "",
                        series: [{ reps: 12, done: false }],
                      },
                    ],
                  }));
                }}
              >
                + Agregar ejercicio
              </button>
            </div>
          </div>

          <div className="dialog-footer">
            <button
              type="button"
              className="btn"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button type="button" className="btn primary" onClick={save}>
              Guardar
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
