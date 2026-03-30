
import React, { useState, useCallback, useEffect } from 'react';

// Tipos para las notificaciones (toast).
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// Estado global para las notificaciones.
let toasts: ToastMessage[] = [];
// Array de 'listeners' (funciones de actualización de estado de componentes).
let listeners: React.Dispatch<React.SetStateAction<ToastMessage[]>>[] = [];

// Un gestor de estado simple para el componente de notificaciones.
// No utiliza el contexto de React para ser más ligero y desacoplado.
const toastState = {
  addToast: (message: string, type: ToastType = 'info') => {
    const newToast = { id: Date.now(), message, type };
    toasts = [...toasts, newToast];
    // Notifica a todos los componentes suscritos sobre el cambio.
    listeners.forEach(listener => listener(toasts));
    // Elimina la notificación después de 5 segundos.
    setTimeout(() => {
      toastState.removeToast(newToast.id);
    }, 5000);
  },
  removeToast: (id: number) => {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(listener => listener(toasts));
  },
  subscribe: (listener: React.Dispatch<React.SetStateAction<ToastMessage[]>>) => {
    listeners.push(listener);
    // Devuelve una función para darse de baja y evitar fugas de memoria.
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  getSnapshot: () => toasts,
};

/**
 * Hook personalizado para proporcionar la funcionalidad de notificaciones (toast).
 * @returns {{addToast: (message: string, type: ToastType) => void}} - Función para añadir una nueva notificación.
 */
export const useToast = () => {
  return {
    addToast: useCallback((message: string, type: ToastType = 'info') => {
      toastState.addToast(message, type);
    }, []),
  };
};

/**
 * Hook utilizado por el ToastContainer para obtener las notificaciones actuales y suscribirse a los cambios.
 */
export const useToastState = () => {
  const [state, setState] = useState(toastState.getSnapshot());

  // useEffect se usa para suscribirse a los cambios del estado de notificaciones cuando el componente se monta.
  useEffect(() => {
    const unsubscribe = toastState.subscribe(setState);
    // La función de limpieza se encarga de darse de baja cuando el componente se desmonta.
    return () => unsubscribe();
  }, []);

  return state;
};