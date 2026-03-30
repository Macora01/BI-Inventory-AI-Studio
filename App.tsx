
import React, { useState, useCallback, useEffect } from 'react';
import { InventoryProvider } from './context/InventoryContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import { User } from './types';
import { ToastContainer } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Componente principal de la aplicación (App).
 * Funciona como la raíz de la aplicación, manejando el estado de autenticación
 * y proporcionando el contexto principal del inventario a todos los componentes hijos.
 */
function App() {
  // Estado para almacenar el usuario actualmente autenticado. Por defecto es nulo.
  const [user, setUser] = useState<User | null>(null);

  // useEffect para verificar si hay un usuario logueado en localStorage al montar el componente.
  // Esto proporciona persistencia de la sesión entre recargas de la página.
  useEffect(() => {
    const storedUser = localStorage.getItem('inventory_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  /**
   * Función callback para manejar el inicio de sesión del usuario.
   * Establece el estado del usuario y almacena el objeto de usuario en localStorage.
   * @param {User} loggedInUser - El objeto de usuario devuelto tras un inicio de sesión exitoso.
   */
  const handleLogin = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('inventory_user', JSON.stringify(loggedInUser));
  }, []);

  /**
   * Función callback para manejar el cierre de sesión del usuario.
   * Limpia el estado del usuario y elimina el objeto de usuario de localStorage.
   */
  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('inventory_user');
  }, []);

  return (
    // El InventoryProvider envuelve la aplicación para que todos los componentes
    // puedan acceder al estado y las funciones del inventario.
    <ErrorBoundary>
      <InventoryProvider>
        <div className="bg-background min-h-screen font-sans text-text-main">
          {user ? (
            // Si hay un usuario logueado, muestra el Layout principal de la aplicación.
            <Layout user={user} onLogout={handleLogout} />
          ) : (
            // Si no hay usuario, muestra la página de inicio de sesión.
            <LoginPage onLogin={handleLogin} />
          )}
        </div>
        {/* El ToastContainer se renderiza aquí para estar disponible en toda la aplicación. */}
        <ToastContainer />
      </InventoryProvider>
    </ErrorBoundary>
  );
}

export default App;