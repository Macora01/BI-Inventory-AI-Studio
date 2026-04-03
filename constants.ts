import { LayoutDashboard, Boxes, ArrowRightLeft, BarChart3, Footprints, Settings } from 'lucide-react';
import { MovementType, Location, User, LocationType } from './types';

export const NAV_ITEMS = [
    { href: '#/', text: 'Dashboard', icon: LayoutDashboard },
    { href: '#/inventory', text: 'Inventario', icon: Boxes },
    { href: '#/movements', text: 'Movimientos', icon: ArrowRightLeft },
    { href: '#/reports', text: 'Reportes', icon: BarChart3 },
    { href: '#/traceability', text: 'Trazabilidad', icon: Footprints },
    { href: '#/settings', text: 'Configuración', icon: Settings },
];

export const MOVEMENT_TYPE_MAP: Record<MovementType, string> = {
    [MovementType.INITIAL_LOAD]: 'Carga Inicial',
    [MovementType.TRANSFER_IN]: 'Ingreso por Traslado',
    [MovementType.TRANSFER_OUT]: 'Salida por Traslado',
    [MovementType.SALE]: 'Venta',
    [MovementType.ADJUSTMENT]: 'Ajuste de Inventario',
    [MovementType.PRODUCT_ADDITION]: 'Adición de Productos',
};

// Se definen datos iniciales por si no hay nada en localStorage.
export const INITIAL_LOCATIONS: Location[] = [
    { id: 'main_warehouse', name: 'Bodega Principal', type: LocationType.MAIN_WAREHOUSE },
];

export const INITIAL_USERS: User[] = [
    { id: 'user_1', username: 'admin', role: 'admin' },
];