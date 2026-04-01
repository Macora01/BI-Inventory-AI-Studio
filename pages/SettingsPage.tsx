import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useInventory } from '../context/InventoryContext';
import { Location, User, LocationType, LOCATION_TYPE_MAP } from '../types';
import Modal from '../components/Modal';
import { Edit, Trash2, Database, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const SettingsPage: React.FC = () => {
    const { 
        locations, addLocation, updateLocation, deleteLocation,
        users, addUser, updateUser, deleteUser,
        clearAllData, clearProducts, clearLocations, clearUsers,
        dbStatus, checkHealth, error, loading
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

    // Estado para subida de logo
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Efecto para manejar el temporizador de la confirmación de borrado.
    useEffect(() => {
        if (!isConfirmingClear) return;

        const timer = setTimeout(() => {
            setIsConfirmingClear(false);
        }, 5000); // 5 segundos para confirmar

        // Limpia el temporizador si el componente se desmonta o el estado cambia.
        return () => clearTimeout(timer);
    }, [isConfirmingClear]);


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
            addToast('Se requiere confirmación para eliminar TODOS los datos.', 'warning');
        }
    };

    const handleClearSpecific = async (type: 'products' | 'locations' | 'users') => {
        const messages = {
            products: '¿Está seguro de eliminar todos los productos, stock y movimientos?',
            locations: '¿Está seguro de eliminar todas las ubicaciones y el stock asociado?',
            users: '¿Está seguro de eliminar todos los usuarios? Esto cerrará su sesión.'
        };

        if (window.confirm(messages[type])) {
            try {
                if (type === 'products') await clearProducts();
                if (type === 'locations') await clearLocations();
                if (type === 'users') {
                    await clearUsers();
                    window.location.reload();
                    return;
                }
                addToast(`Base de datos de ${type} limpiada con éxito.`, 'success');
            } catch (error) {
                addToast(`Error al limpiar ${type}.`, 'error');
            }
        }
    };

    const handleCancelClear = () => {
        setIsConfirmingClear(false);
        addToast('La eliminación de datos ha sido cancelada.', 'info');
    };

    const handleLogoUpload = async () => {
        if (!logoFile) return;
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append('file', logoFile);
        try {
            const response = await fetch('/api/upload?type=logo', {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                addToast('Logo actualizado correctamente. Recarga para ver los cambios.', 'success');
                setLogoFile(null);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                const data = await response.json();
                addToast(data.error || 'Error al subir el logo.', 'error');
            }
        } catch (err) {
            addToast('Error de red al subir el logo.', 'error');
        } finally {
            setUploadingLogo(false);
        }
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
        setFormData(user || { username: '', password: '', role: 'user' });
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
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-primary">Configuración</h2>
                <span className="text-xs bg-accent text-primary px-2 py-1 rounded">v1.0.6</span>
            </div>

            {/* Identidad de Marca */}
            <Card title="Identidad de Marca (Logo)">
                <div className="p-4 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-32 h-32 bg-background rounded-lg border-2 border-dashed border-accent flex items-center justify-center overflow-hidden">
                        <img 
                            src={`/logo.png?t=${Date.now()}`} 
                            alt="Logo actual" 
                            className="max-w-full max-h-full object-contain" 
                            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Sin+Logo')} 
                        />
                    </div>
                    <div className="flex-1 space-y-4">
                        <p className="text-sm text-text-light">Sube el logo de tu empresa. Se recomienda un archivo PNG con fondo transparente. El archivo se guardará como <code className="bg-background p-1 rounded">logo.png</code>.</p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                className="text-sm text-text-main file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary hover:file:bg-opacity-80"
                            />
                            <Button 
                                onClick={handleLogoUpload} 
                                disabled={!logoFile || uploadingLogo}
                                className="flex items-center gap-2"
                            >
                                <Upload size={16} />
                                {uploadingLogo ? 'Subiendo...' : 'Actualizar Logo'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Estado del Sistema - MOVIDO ARRIBA PARA VISIBILIDAD */}
            <Card title="Estado del Sistema (Conexión Base de Datos)">
                <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${dbStatus?.database === 'connected' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                            <Database size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-text-main">Estado de la Base de Datos</h4>
                            <div className="flex items-center space-x-2">
                                {dbStatus?.database === 'connected' ? (
                                    <>
                                        <CheckCircle2 size={14} className="text-success" />
                                        <span className="text-sm text-success font-medium">Conectado a PostgreSQL</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={14} className="text-danger" />
                                        <span className="text-sm text-danger font-medium">Desconectado (Usando DB Local Temporal)</span>
                                    </>
                                )}
                            </div>
                            {dbStatus?.error && (
                                <p className="text-xs text-danger mt-1 bg-danger bg-opacity-5 p-1 rounded border border-danger border-opacity-10">
                                    Error: {dbStatus.error}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => {
                            addToast('Verificando conexión...', 'info');
                            checkHealth();
                        }}
                        className="flex items-center space-x-2"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Verificar Conexión</span>
                    </Button>
                </div>
            </Card>

            {/* Alerta de Base de Datos no configurada */}
            {dbStatus?.database === 'disconnected' && (
                <div className="bg-danger bg-opacity-10 border-2 border-danger p-6 rounded-xl flex flex-col md:flex-row items-center gap-6 animate-pulse">
                    <div className="bg-danger text-white p-4 rounded-full">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-bold text-danger mb-1">¡Atención! Base de Datos no Detectada</h3>
                        <p className="text-text-main">
                            La aplicación no está conectada a una base de datos externa. 
                            Esto puede causar que los datos se pierdan al reiniciar el servidor o que solo funcione el usuario administrador original.
                        </p>
                        <p className="text-sm text-text-light mt-2">
                            Por favor, asegúrate de configurar la variable <code className="bg-background p-1 rounded font-mono text-danger">DATABASE_URL</code> en el menú de Configuración del editor.
                        </p>
                    </div>
                </div>
            )}

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
                                <th className="px-6 py-3">Contraseña</th>
                                <th className="px-6 py-3">Rol</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="bg-background-light border-b border-background">
                                    <td className="px-6 py-4">{user.username}</td>
                                    <td className="px-6 py-4">••••••••</td>
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
                <div className="space-y-6 p-4">
                    {/* Limpiar Productos */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-accent pb-4">
                        <div className="text-left">
                            <h4 className="font-bold text-primary">Base de Datos de Productos</h4>
                            <p className="text-sm text-text-light">Elimina productos, stock y movimientos asociados.</p>
                        </div>
                        <Button onClick={() => handleClearSpecific('products')} variant="danger">Limpiar Productos</Button>
                    </div>

                    {/* Limpiar Ubicaciones */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-accent pb-4">
                        <div className="text-left">
                            <h4 className="font-bold text-primary">Base de Datos de Ubicaciones</h4>
                            <p className="text-sm text-text-light">Elimina todas las ubicaciones y el stock asociado.</p>
                        </div>
                        <Button onClick={() => handleClearSpecific('locations')} variant="danger">Limpiar Ubicaciones</Button>
                    </div>

                    {/* Limpiar Usuarios */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-accent pb-4">
                        <div className="text-left">
                            <h4 className="font-bold text-primary">Base de Datos de Usuarios</h4>
                            <p className="text-sm text-text-light">Elimina todos los usuarios (requiere re-login).</p>
                        </div>
                        <Button onClick={() => handleClearSpecific('users')} variant="danger">Limpiar Usuarios</Button>
                    </div>

                    {/* Limpiar Todo */}
                    <div className="flex flex-col items-center justify-center pt-4 text-center">
                         <p className="text-text-light mb-4">
                            {isConfirmingClear
                                ? '¡ADVERTENCIA! ¿Está seguro de que desea eliminar permanentemente TODOS los datos del sistema?'
                                : 'Elimina absolutamente todos los datos de la aplicación.'
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
                                        Cancelar
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
                    </div>
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
                        <label className="block text-sm font-medium text-text-main">Contraseña</label>
                        <input type="password" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} className="mt-1 w-full p-2 border border-accent rounded-md" required />
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