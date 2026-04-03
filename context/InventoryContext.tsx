import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Product, Stock, Movement, Location, User, MovementType } from '../types';
import { INITIAL_LOCATIONS, INITIAL_USERS } from '../constants';

// Define la estructura de datos que proporcionará el contexto.
interface InventoryContextType {
    products: Product[];
    stock: Stock[];
    movements: Movement[];
    locations: Location[];
    users: User[];
    
    // Funciones para manipular el estado
    addMovement: (movementData: Omit<Movement, 'id' | 'timestamp'>) => void;
    updateStock: (productId: string, locationId: string, quantityChange: number) => void;
    setInitialData: (products: Product[], stock: Stock[], movements: Movement[]) => void;
    findProductById: (productId: string) => Product | undefined;
    clearAllData: () => void;
    clearProducts: () => Promise<void>;
    clearLocations: () => Promise<void>;
    clearUsers: () => Promise<void>;
    backupData: () => Promise<any>;
    restoreData: (data: any) => Promise<void>;
    
    // Funciones CRUD para Productos
    addProduct: (product: Product) => Promise<void>;
    updateProduct: (product: Product) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;

    // Funciones CRUD para Ubicaciones
    addLocation: (location: Omit<Location, 'id'>) => void;
    updateLocation: (location: Location) => void;
    deleteLocation: (locationId: string) => void;
    
    // Funciones CRUD para Usuarios
    addUser: (user: Omit<User, 'id'>) => void;
    updateUser: (user: User) => void;
    deleteUser: (userId: string) => void;

    // Estado de carga y error
    loading: boolean;
    error: string | null;
    dbStatus: { status: string; database: string; time?: string; error?: string } | null;
    logo: string | null;
    fetchData: () => Promise<void>;
    checkHealth: () => Promise<void>;
    fetchLogo: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Función auxiliar para generar IDs únicos.
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // ---- ESTADO PRINCIPAL ----
    const [products, setProducts] = useState<Product[]>([]);
    const [stock, setStock] = useState<Stock[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dbStatus, setDbStatus] = useState<{ status: string; database: string; time?: string; error?: string } | null>(null);
    const [logo, setLogo] = useState<string | null>(null);

    // ---- CARGA INICIAL DESDE LA API ----
    const fetchLogo = useCallback(async () => {
        try {
            console.log('Fetching logo...');
            const res = await fetch('/api/settings/logo');
            if (res.ok) {
                const data = await res.json();
                console.log('Logo data received:', data.logo ? 'Base64 string' : 'null');
                setLogo(data.logo);
            } else {
                console.error('Failed to fetch logo:', res.status);
            }
        } catch (err) {
            console.error('Error fetching logo:', err);
        }
    }, []);
    const checkHealth = useCallback(async () => {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            setDbStatus(data);
        } catch (err) {
            setDbStatus({ status: 'error', database: 'disconnected', error: 'No se pudo contactar con el servidor' });
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        checkHealth(); // Verificamos salud en paralelo
        try {
            const [pRes, sRes, mRes, lRes, uRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/stock'),
                fetch('/api/movements'),
                fetch('/api/locations'),
                fetch('/api/users')
            ]);

            // Verificamos si alguna respuesta no es OK
            const responses = [pRes, sRes, mRes, lRes, uRes];
            const failedRes = responses.find(r => !r.ok);
            if (failedRes) {
                const errData = await failedRes.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errData.error || `HTTP Error ${failedRes.status}`);
            }

            const pData = await pRes.json();
            const sData = await sRes.json();
            const mData = await mRes.json();
            const lData = await lRes.json();
            const uData = await uRes.json();

            // Validamos que los datos sean arreglos antes de guardarlos
            if (!Array.isArray(pData) || !Array.isArray(sData) || !Array.isArray(mData) || !Array.isArray(lData) || !Array.isArray(uData)) {
                console.error('Datos inválidos recibidos de la API:', { pData, sData, mData, lData, uData });
                throw new Error('La base de datos devolvió un formato inesperado. Revisa la conexión.');
            }

            setProducts(pData);
            setStock(sData);
            setMovements(mData.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
            setLocations(lData);
            setUsers(uData);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
            console.error('Error fetching data:', msg);
            setError(msg);
            // No limpiamos los arreglos aquí para no borrar la UI si ya había algo, 
            // pero si es la carga inicial, estarán vacíos.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchLogo();
    }, [fetchData, fetchLogo]);

    // ---- FUNCIONES DE MOVIMIENTOS Y STOCK ----
    const addMovement = useCallback(async (movementData: Omit<Movement, 'id' | 'timestamp'>) => {
        const id = generateId('mov');
        const timestamp = new Date().toISOString();
        const newMovement = { ...movementData, id, timestamp };

        try {
            await fetch('/api/movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMovement)
            });
            setMovements(prev => [{ ...newMovement, timestamp: new Date(timestamp) }, ...prev]);
        } catch (error) {
            console.error('Error adding movement:', error);
        }
    }, []);

    const updateStock = useCallback(async (productId: string, locationId: string, quantityChange: number) => {
        try {
            await fetch('/api/stock/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, locationId, quantityChange })
            });
            setStock(prevStock => {
                const stockIndex = prevStock.findIndex(s => s.productId === productId && s.locationId === locationId);
                if (stockIndex > -1) {
                    const newStock = [...prevStock];
                    newStock[stockIndex] = { ...newStock[stockIndex], quantity: newStock[stockIndex].quantity + quantityChange };
                    return newStock;
                } else if (quantityChange > 0) {
                    return [...prevStock, { productId, locationId, quantity: quantityChange }];
                }
                return prevStock;
            });
        } catch (error) {
            console.error('Error updating stock:', error);
        }
    }, []);
    
    const setInitialData = useCallback(async (initialProducts: Product[], initialStock: Stock[], initialMovements: Movement[]) => {
        try {
            const response = await fetch('/api/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    products: initialProducts, 
                    stock: initialStock, 
                    movements: initialMovements 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en la importación masiva');
            }

            await fetchData(); // Recarga todo
        } catch (error) {
            console.error('Error setting initial data:', error);
            throw error;
        }
    }, [fetchData]);

    const findProductById = useCallback((productId: string) => products.find(p => p.id_venta === productId), [products]);

    // ---- FUNCIONES CRUD PARA PRODUCTOS ----
    const addProduct = useCallback(async (product: Product) => {
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar el producto');
            }

            setProducts(prev => {
                const exists = prev.some(p => p.id_venta === product.id_venta);
                if (exists) {
                    return prev.map(p => p.id_venta === product.id_venta ? product : p);
                }
                return [...prev, product];
            });

            // Si hay stock inicial, lo agregamos a la bodega principal
            if (product.initialStock && product.initialStock > 0) {
                // Esperamos a que las locaciones estén cargadas
                let currentLocations = locations;
                if (currentLocations.length === 0) {
                    const lRes = await fetch('/api/locations');
                    currentLocations = await lRes.json();
                    if (Array.isArray(currentLocations)) {
                        setLocations(currentLocations);
                    } else {
                        currentLocations = [];
                    }
                }

                const mainLoc = currentLocations.find(l => l.id === 'main_warehouse' || l.id === 'loc_central') || currentLocations[0];
                if (mainLoc) {
                    await updateStock(product.id_venta, mainLoc.id, product.initialStock);
                    await addMovement({
                        productId: product.id_venta,
                        quantity: product.initialStock,
                        type: MovementType.INITIAL_LOAD,
                        toLocationId: mainLoc.id,
                        relatedFile: 'Carga Inicial Manual'
                    });
                }
            }
            
            // Recargar datos para asegurar consistencia
            await fetchData();
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Error al guardar el producto: ' + (error as Error).message);
            throw error;
        }
    }, [locations, updateStock, addMovement]);

    const updateProduct = useCallback(async (product: Product) => {
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar el producto');
            }
            setProducts(prev => prev.map(p => p.id_venta === product.id_venta ? product : p));
            await fetchData();
        } catch (error) {
            console.error('Error updating product:', error);
            alert('Error al actualizar el producto: ' + (error as Error).message);
            throw error;
        }
    }, []);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar el producto');
            }
            setProducts(prev => prev.filter(p => p.id_venta !== productId));
            setStock(prev => prev.filter(s => s.productId !== productId));
            await fetchData();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error al eliminar el producto: ' + (error as Error).message);
            throw error;
        }
    }, []);

    // ---- FUNCIONES CRUD PARA UBICACIONES ----
    const addLocation = useCallback(async (locationData: Omit<Location, 'id'>) => {
        const id = generateId('loc');
        const newLocation = { ...locationData, id };
        try {
            await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLocation)
            });
            setLocations(prev => [...prev, newLocation]);
        } catch (error) {
            console.error('Error adding location:', error);
        }
    }, []);

    const updateLocation = useCallback(async (updatedLocation: Location) => {
        try {
            await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedLocation)
            });
            setLocations(prev => prev.map(loc => loc.id === updatedLocation.id ? updatedLocation : loc));
        } catch (error) {
            console.error('Error updating location:', error);
        }
    }, []);

    const deleteLocation = useCallback(async (locationId: string) => {
        try {
            await fetch(`/api/locations/${locationId}`, { method: 'DELETE' });
            setLocations(prev => prev.filter(loc => loc.id !== locationId));
        } catch (error) {
            console.error('Error deleting location:', error);
        }
    }, []);

    // ---- FUNCIONES CRUD PARA USUARIOS ----
    const addUser = useCallback(async (userData: Omit<User, 'id'>) => {
        const id = generateId('user');
        const newUser = { ...userData, id };
        try {
            await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            setUsers(prev => [...prev, newUser]);
        } catch (error) {
            console.error('Error adding user:', error);
        }
    }, []);

    const updateUser = useCallback(async (updatedUser: User) => {
        try {
            await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUser)
            });
            setUsers(prev => prev.map(user => user.id === updatedUser.id ? updatedUser : user));
        } catch (error) {
            console.error('Error updating user:', error);
        }
    }, []);

    const deleteUser = useCallback(async (userId: string) => {
        try {
            await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            setUsers(prev => prev.filter(user => user.id !== userId));
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }, []);

    // ---- FUNCIÓN PARA LIMPIAR DATOS ----
    const clearAllData = useCallback(async () => {
        try {
            await fetch('/api/clear', { method: 'POST' });
            setProducts([]);
            setStock([]);
            setMovements([]);
            localStorage.removeItem('inventory_user'); // Cierra sesión
            fetchData(); // Recarga para obtener usuarios y ubicaciones por defecto
        } catch (error) {
            console.error('Error clearing data:', error);
        }
    }, [fetchData]);

    const clearProducts = useCallback(async () => {
        try {
            await fetch('/api/clear/products', { method: 'POST' });
            setProducts([]);
            setStock([]);
            setMovements([]);
            fetchData();
        } catch (error) {
            console.error('Error clearing products:', error);
        }
    }, [fetchData]);

    const clearLocations = useCallback(async () => {
        try {
            await fetch('/api/clear/locations', { method: 'POST' });
            setLocations([]);
            setStock([]);
            fetchData();
        } catch (error) {
            console.error('Error clearing locations:', error);
        }
    }, [fetchData]);

    const clearUsers = useCallback(async () => {
        try {
            await fetch('/api/clear/users', { method: 'POST' });
            setUsers([]);
            localStorage.removeItem('inventory_user'); // Cierra sesión si se borran todos los usuarios
            fetchData();
        } catch (error) {
            console.error('Error clearing users:', error);
        }
    }, [fetchData]);

    const backupData = useCallback(async () => {
        try {
            const response = await fetch('/api/backup');
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Error al obtener el respaldo');
        } catch (err) {
            console.error('Error backing up data:', err);
            throw err;
        }
    }, []);

    const restoreData = useCallback(async (data: any) => {
        try {
            const response = await fetch('/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                await fetchData();
            } else {
                throw new Error('Error al restaurar los datos');
            }
        } catch (err) {
            console.error('Error restoring data:', err);
            throw err;
        }
    }, [fetchData]);
    
    return (
        <InventoryContext.Provider value={{ 
            products, stock, movements, locations, users, 
            addMovement, updateStock, setInitialData, findProductById, clearAllData,
            clearProducts, clearLocations, clearUsers,
            backupData, restoreData,
            addProduct, updateProduct, deleteProduct,
            addLocation, updateLocation, deleteLocation,
            addUser, updateUser, deleteUser,
            loading, error, dbStatus, logo, fetchData, checkHealth, fetchLogo
        }}>
            {children}
        </InventoryContext.Provider>
    );
};

// Hook personalizado para acceder fácilmente al contexto.
export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventory debe ser usado dentro de un InventoryProvider');
    }
    return context;
};