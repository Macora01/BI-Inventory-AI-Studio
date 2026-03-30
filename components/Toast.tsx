
import React from 'react';
import { useToastState } from '../hooks/useToast';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

// Mapeo de tipos de notificación a íconos de Lucide React.
const icons = {
    success: <CheckCircle2 className="w-6 h-6 text-success" />,
    error: <XCircle className="w-6 h-6 text-danger" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
    warning: <AlertCircle className="w-6 h-6 text-yellow-500" />,
};

// Mapeo de tipos de notificación a clases de color de fondo y borde.
const bgColors = {
    success: 'bg-green-100 border-success',
    error: 'bg-red-100 border-danger',
    info: 'bg-blue-100 border-blue-500',
    warning: 'bg-yellow-100 border-yellow-500',
};

// Mapeo de tipos de notificación a clases de color de texto.
const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-yellow-800',
};

/**
 * El contenedor que alberga y muestra todas las notificaciones (toasts) activas.
 * Debe colocarse en la raíz de la aplicación para ser visible en todas las páginas.
 */
export const ToastContainer: React.FC = () => {
    // Obtiene el estado actual de las notificaciones desde el hook personalizado.
    const toasts = useToastState();

    return (
        <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2">
            {toasts.map((toast) => (
                <div 
                    key={toast.id} 
                    className={`flex items-center p-4 rounded-lg shadow-lg border-l-4 animate-fade-in-right ${bgColors[toast.type]} ${textColors[toast.type]}`}
                >
                    <div className="mr-3">
                        {icons[toast.type]}
                    </div>
                    <p>{toast.message}</p>
                </div>
            ))}
        </div>
    );
};