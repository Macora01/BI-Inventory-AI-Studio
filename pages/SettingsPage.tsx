import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useInventory } from '../context/InventoryContext';
import { Location, User, LocationType, LOCATION_TYPE_MAP } from '../types';
import Modal from '../components/Modal';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const SettingsPage: React.FC = () => {
    const { 
        locations, addLocation, updateLocation, deleteLocation,
        users, addUser, updateUser, deleteUser,
        clearAllData
    } = useInventory();
    const { addToast } = useToast();

    // Estado para los modales y los datos a editar
    const [isLocationModalOpen, setLocationModalOpen] = useState(false);
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<any>({});
    
    // Estado para la confirmación de borrado de datos
    const [isConfirmingClear, setIsConfirmingClear] = useState(false);

    // Efecto para manejar el temporizador de la confirmación de borrado.
    useEffect(() => {
        if (!isConfirmingClear) return;

        const timer = setTimeout(() => {
            setIsConfirmingClear(false);
            addToast('La eliminación de datos fue cancelada automáticamente.', 'info');
        }, 5000); // 5 segundos para confirmar

        // Limpia el temporizador si el componente se desmonta o el estado cambia.
        return () => clearTimeout(timer);
    }, [isConfirmingClear, addToast]);


    const handleClearData = () => {
        if (isConfirmingClear) {
            // Segundo clic: procede con la eliminación.
            clearAllData();
            addToast('Todos los datos han sido eliminados exitosamente.', 'success');
            setIsConfirmingClear(false);
            // Recarga la página para volver al login después de un breve instante.
            setTimeout(() => window.location.reload(), 1500);
        } else {
            // Primer clic: activa el modo de confirmación.
            setIsConfirmingClear(true);
            addToast('Se requiere confirmación para eliminar todos los datos.', 'warning');
        }
    };

    const handleCancelClear = () => {
        setIsConfirmingClear(false);
        addToast('La eliminación de datos ha sido cancelada.', 'info');
    };


    // --- MANEJO DE UBICACIONES ---
    const openLocationModal = (location: Location | null = null) => {
        setEditingLocation(location);
        setFormData(location || { name: '', type: LocationType.FIXED_STORE_PERMANENT });
        setLocationModalOpen(true);
    };

    const handleLocationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLocation) {
            updateLocation({ ...editingLocation, ...formData });
        } else {
            addLocation(formData);
        }
        setLocationModalOpen(false);
    };

    // --- MANEJO DE USUARIOS ---
     const openUserModal = (user: User | null = null) => {
        setEditingUser(user);
        setFormData(user || { username: '', role: 'user' });
        setUserModalOpen(true);
    };

    const handleUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateUser({ ...editingUser, ...formData });
        } else {
            addUser(formData);
        }
        setUserModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-primary">Configuración</h2>

            {/* Gestión de Ubicaciones */}
            <Card title="Gestión de Ubicaciones">
                <Button onClick={() => openLocationModal()} className="mb-4">Añadir Ubicación</Button>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-primary uppercase bg-accent">
                            <tr>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map(loc => (
                                <tr key={loc.id} className="bg-background-light border-b border-background">
                                    <td className="px-6 py-4">{loc.name}</td>
                                    <td className="px-6 py-4">{LOCATION_TYPE_MAP[loc.type]}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openLocationModal(loc)} className="text-secondary p-1"><Edit size={16}/></button>
                                        <button onClick={() => deleteLocation(loc.id)} className="text-danger p-1 ml-2"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

             {/* Gestión de Usuarios */}
            <Card title="Gestión de Usuarios">
                <Button onClick={() => openUserModal()} className="mb-4">Añadir Usuario</Button>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-primary uppercase bg-accent">
                            <tr>
                                <th className="px-6 py-3">Nombre de Usuario</th>
                                <th className="px-6 py-3">Rol</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="bg-background-light border-b border-background">
                                    <td className="px-6 py-4">{user.username}</td>
                                    <td className="px-6 py-4 capitalize">{user.role}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openUserModal(user)} className="text-secondary p-1"><Edit size={16}/></button>
                                        <button onClick={() => deleteUser(user.id)} className="text-danger p-1 ml-2"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Gestión de Datos */}
            <Card title="Gestión de Datos">
                <div className="flex flex-col items-center justify-center p-4 text-center">
                     <p className="text-text-light mb-4">
                        {isConfirmingClear
                            ? '¡ADVERTENCIA! ¿Está seguro de que desea eliminar permanentemente todos los datos?'
                            : 'Elimina todos los datos de la aplicación (productos, stock, etc.).'
                        }
                     </p>
                     <div className="flex items-center justify-center gap-4">
                        {isConfirmingClear ? (
                            <>
                                <Button
                                    onClick={handleClearData}
                                    variant="danger"
                                    className="animate-pulse"
                                >
                                    Sí, Eliminar Todo
                                </Button>
                                <Button
                                    onClick={handleCancelClear}
                                    variant="secondary"
                                >
                                    Cancelar Operación
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={handleClearData}
                                variant="danger"
                            >
                                Limpiar Todos los Datos
                            </Button>
                        )}
                    </div>
                     {isConfirmingClear && (
                        <p className="text-sm text-danger mt-2">
                            Esta acción no se puede deshacer. Tiene 5 segundos para confirmar.
                        </p>
                    )}
                </div>
            </Card>

            {/* Modal para Ubicaciones */}
            <Modal isOpen={isLocationModalOpen} onClose={() => setLocationModalOpen(false)} title={editingLocation ? 'Editar Ubicación' : 'Añadir Ubicación'}>
                <form onSubmit={handleLocationSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main">Nombre</label>
                        <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="mt-1 w-full p-2 border border-accent rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">Tipo</label>
                        <select value={formData.type || ''} onChange={(e) => setFormData({...formData, type: e.target.value})} className="mt-1 w-full p-2 border border-accent rounded-md bg-white">
                            {Object.entries(LOCATION_TYPE_MAP).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-right">
                        <Button type="submit">{editingLocation ? 'Actualizar' : 'Guardar'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal para Usuarios */}
            <Modal isOpen={isUserModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? 'Editar Usuario' : 'Añadir Usuario'}>
                 <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main">Nombre de Usuario</label>
                        <input type="text" value={formData.username || ''} onChange={(e) => setFormData({...formData, username: e.target.value})} className="mt-1 w-full p-2 border border-accent rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">Rol</label>
                        <select value={formData.role || 'user'} onChange={(e) => setFormData({...formData, role: e.target.value})} className="mt-1 w-full p-2 border border-accent rounded-md bg-white">
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                        </select>
                    </div>
                    <div className="text-right">
                        <Button type="submit">{editingUser ? 'Actualizar' : 'Guardar'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SettingsPage;