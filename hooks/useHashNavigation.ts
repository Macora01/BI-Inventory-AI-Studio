
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para un enrutamiento simple basado en el hash de la URL.
 * Escucha los cambios en el hash de la URL (ej: #/inventory) y devuelve la ruta actual.
 * Esto evita recargas de página completas y funciona en entornos donde la manipulación
 * de la ruta de la URL está restringida.
 * @returns {string} La ruta actual basada en el hash de la URL (ej: '/', '/inventory').
 */
export const useHashNavigation = () => {
    // El estado inicial se toma del hash actual de la URL.
    const [path, setPath] = useState(window.location.hash.slice(1) || '/');

    // useCallback para memorizar la función que maneja el cambio de hash.
    const handleHashChange = useCallback(() => {
        setPath(window.location.hash.slice(1) || '/');
    }, []);

    // useEffect para añadir y remover el listener del evento 'hashchange'.
    useEffect(() => {
        window.addEventListener('hashchange', handleHashChange);
        // La función de limpieza se ejecuta cuando el componente se desmonta.
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [handleHashChange]);

    return path;
};