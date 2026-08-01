export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastEventDetail {
  message: string;
  type: ToastType;
  duration?: number;
}

// Dispatch custom browser events to trigger toast notifications globally
export const toast = {
  // Fire a "show-toast" event that ToastContainer.tsx listens for
  show(message: string, type: ToastType = "info", duration = 3500) {
    const event = new CustomEvent<ToastEventDetail>("show-toast", {
      detail: { message, type, duration },
    });
    window.dispatchEvent(event);
  },
  success(message: string, duration = 3500) {
    this.show(message, "success", duration);
  },
  error(message: string, duration = 3500) {
    this.show(message, "error", duration);
  },
  info(message: string, duration = 3500) {
    this.show(message, "info", duration);
  },
  warning(message: string, duration = 3500) {
    this.show(message, "warning", duration);
  },
};
