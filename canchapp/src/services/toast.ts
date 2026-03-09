import { toast as sonnerToast } from "sonner";

/**
 * Servicio de notificaciones reutilizable para toda la app.
 * Usa sonner internamente con estilos adaptados al theme de Canchapp.
 *
 * Uso:
 *   import { notify } from "../services/toast";
 *   notify.success("Cuenta creada exitosamente");
 *   notify.error("Error al crear la cuenta");
 *   notify.info("Revisa tu correo");
 *   notify.warning("Tu sesión expirará pronto");
 *   notify.promise(apiCall(), { loading: "...", success: "...", error: "..." });
 */

const notify = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, { description }),

  error: (message: string, description?: string) =>
    sonnerToast.error(message, { description }),

  info: (message: string, description?: string) =>
    sonnerToast.info(message, { description }),

  warning: (message: string, description?: string) =>
    sonnerToast.warning(message, { description }),

  /** Toast con promise — muestra loading, success y error automáticamente */
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) => sonnerToast.promise(promise, messages),

  /** Toast básico sin icono */
  message: (message: string, description?: string) =>
    sonnerToast(message, { description }),

  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};

export { notify };
export default notify;
