
import React from 'react';
import Sidebar from './Sidebar';
import { User } from '../types';
import DashboardPage from '../pages/DashboardPage';
import InventoryPage from '../pages/InventoryPage';
import MovementsPage from '../pages/MovementsPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import { useHashNavigation } from '../hooks/useHashNavigation';
import TraceabilityPage from '../pages/TraceabilityPage';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

/**
 * El componente principal de la estructura de la aplicación (Layout).
 * Incluye la barra lateral para la navegación y un área de contenido principal
 * donde se renderiza la página seleccionada actualmente según el hash de la URL.
 * @param {LayoutProps} props - Propiedades del componente.
 */
const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
    // Obtiene la ruta actual de la URL (ej: '/', '/inventory') usando el hook personalizado.
    const path = useHashNavigation();

    // Función para renderizar la página correcta según la ruta actual.
    const renderPage = () => {
        switch (path) {
            case '/inventory':
                return <InventoryPage />;
            case '/movements':
                return <MovementsPage />;
            case '/reports':
                return <ReportsPage />;
            case '/traceability':
                return <TraceabilityPage />;
            case '/settings':
                return <SettingsPage />;
            case '/':
            default:
                return <DashboardPage />;
        }
    };

    return (
        <div className="flex h-screen bg-background">
            <Sidebar user={user} onLogout={onLogout} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};

export default Layout;