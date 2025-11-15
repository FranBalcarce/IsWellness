import { useEffect, useState } from "react";
import { api } from "../api";
import ConfirmDeleteButton from "../components/ConfirmDeleteButton.jsx";

export default function Planes({ alumnoId }) {
  const alumnoKey = String(alumnoId);

  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", items: [""] });

  async function load() {
    try {
      const data = await api.planes.listByAlumno(alumnoKey);
      setList(data);
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar los planes de nutrición.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoKey]);

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: "", items: [""] });
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      nombre: p.nombre || "",
      items: Array.isArray(p.items) ? [...p.items] : [""],
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nombre || form.items.filter(Boolean).length === 0) {
      alert("Completá nombre y al menos un ítem.");
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        // PATCH: conservamos alumnoId y actualizamos campos editados
        await api.planes.update(editing.id, {
          alumnoId: alumnoKey,
          nombre: form.nombre,
          items: form.items,
        });
      } else {
        await api.planes.create({
          alumnoId: alumnoKey,
          nombre: form.nombre,
          items: form.items,
        });
      }
      setOpen(false);
      setForm({ nombre: "", items: [""] });
      await load();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el plan: " + (e.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.planes.remove(id);
      await load();
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar el plan: " + (e.message || "Error"));
    }
  };

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="title">Nutrición</h2>
        <button type="button" className="btn" onClick={openNew}>
          + Nuevo plan
        </button>
      </div>

      {list.map((p) => (
        <div className="card" key={p.id}>
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <h3 style={{ margin: 0 }}>{p.nombre}</h3>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn" onClick={() => openEdit(p)}>
                Editar
              </button>

              <ConfirmDeleteButton
                label="Eliminar"
                confirmText="¿Eliminar plan?"
                onConfirm={() => remove(p.id)}
              />
            </div>
          </div>

          {Array.isArray(p.items) && p.items.length > 0 ? (
            <ul>
              {p.items.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          ) : (
            <div style={{ opacity: 0.7 }}>Sin ítems</div>
          )}
        </div>
      ))}

      {open && (
        <dialog open>
          <div className="dialog-body grid" style={{ gap: 10 }}>
            <h3 className="title" style={{ marginTop: 0 }}>
              {editing ? "Editar plan" : "Nuevo plan"}
            </h3>

            <div>
              <label>Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </div>

            <div className="grid" style={{ gap: 8 }}>
              <label>Items</label>
              {form.items.map((it, idx) => (
                <div className="row" key={idx} style={{ gap: 8 }}>
                  <input
                    value={it}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const arr = [...f.items];
                        arr[idx] = v;
                        return { ...f, items: arr };
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        items: f.items.filter((_, i) => i !== idx),
                      }));
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setForm((f) => ({ ...f, items: [...f.items, ""] }))
                }
              >
                + Item
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
            <button
              type="button"
              className="btn primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
