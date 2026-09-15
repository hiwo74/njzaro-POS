import { AnimatePresence, motion } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const MODAL_EASE = [0.23, 1, 0.32, 1] as const;

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: MODAL_EASE }}
            onClick={onCancel}
          />
          <motion.div
            className="relative bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm"
            style={{ transformOrigin: "center" }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: MODAL_EASE }}
          >
            <h3 className="font-semibold text-brand-900 mb-1">{title}</h3>
            <p className="text-sm text-brand-500 mb-4">{message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={onCancel} className="press px-4 py-2 rounded-lg border border-brand-200 text-brand-900">
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`press px-4 py-2 rounded-lg font-medium text-white ${
                  danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-500 hover:bg-brand-600"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
