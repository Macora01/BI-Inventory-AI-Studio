
import React from 'react';
import { User } from '../types';
import { NAV_ITEMS } from '../constants';
import { LogOut, UserCircle2 } from 'lucide-react';
import { useHashNavigation } from '../hooks/useHashNavigation';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

/**
 * Componente de la barra lateral para la navegación de la aplicación.
 * Muestra enlaces de navegación, información del usuario y un botón de cierre de sesión.
 * @param {SidebarProps} props - Propiedades del componente.
 */
const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
    // Obtiene la ruta actual para resaltar el enlace activo.
    const currentPath = useHashNavigation();

    /**
     * Maneja el clic en los enlaces de navegación.
     * Previene el comportamiento por defecto del enlace y actualiza el hash de la URL manualmente.
     * Esto asegura un enrutamiento del lado del cliente compatible con entornos enmarcados (iframes)
     * como el de AI Studio, evitando errores de "conexión rechazada".
     * @param e El evento del mouse.
     * @param href La ruta de destino (ej: '#/inventory').
     */
    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        window.location.hash = href.slice(1);
    };
  
    return (
    <div className="w-64 bg-primary text-white flex flex-col">
      <div className="p-6 text-center border-b border-secondary">
        <div className="flex justify-center mb-4">
          <img 
            src="/logo.png" 
            alt="Boa Ideia Logo" 
            className="h-16 w-auto object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback if logo is not found
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-2xl font-bold text-accent">Boa Ideia</h1>
        <p className="text-sm text-background">Gestión de Inventario</p>
        <p className="text-[10px] text-accent mt-1 opacity-50">v1.0.5 - Assets Management</p>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a 
                href={item.href} 
                onClick={(e) => handleNavClick(e, item.href)}
                className={`flex items-center px-4 py-3 my-1 rounded-md transition-colors duration-200 cursor-pointer
                  ${currentPath === item.href.slice(1) || (currentPath === '/' && item.href === '#/')
                    ? 'bg-secondary text-white' // Estilo para el enlace activo
                    : 'text-background hover:bg-secondary hover:text-white' // Estilo para enlaces inactivos
                  }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-secondary">
        <div className="flex items-center mb-4">
            <UserCircle2 className="w-10 h-10 mr-3 text-accent" />
            <div>
                <p className="font-semibold text-white">{user.username}</p>
                <p className="text-xs text-background capitalize">{user.role}</p>
            </div>
        </div>
        <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center bg-secondary text-white py-2 rounded-md hover:bg-opacity-80 transition-colors"
        >
            <LogOut className="w-5 h-5 mr-2" />
            <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
