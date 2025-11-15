export default function ConfirmDeleteButton({
  onConfirm,
  label = "Eliminar",
  confirmText = "¿Seguro que querés eliminar?",
  disabled = false,
}) {
  const handleClick = () => {
    if (disabled) return;
    if (confirm(confirmText)) onConfirm?.();
  };
  return (
    <button
      type="button"
      className="btn"
      onClick={handleClick}
      disabled={disabled}
      title={label}
      style={{ color: "#b00020", borderColor: "#b00020" }}
    >
      {label}
    </button>
  );
}
