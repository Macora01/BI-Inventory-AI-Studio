import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Product, Stock, Movement, Location, User } from '../types';
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

    // ---- CARGA INICIAL DESDE LA API ----
    const fetchData = useCallback(async () => {
        try {
            const [pRes, sRes, mRes, lRes, uRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/stock'),
                fetch('/api/movements'),
                fetch('/api/locations'),
                fetch('/api/users')
            ]);

            const [pData, sData, mData, lData, uData] = await Promise.all([
                pRes.json(), sRes.json(), mRes.json(), lRes.json(), uRes.json()
            ]);

            // Validamos que los datos sean arreglos antes de guardarlos
            if (!Array.isArray(pData)) console.error('Error: /api/products no devolvió un arreglo', pData);
            if (!Array.isArray(sData)) console.error('Error: /api/stock no devolvió un arreglo', sData);
            if (!Array.isArray(mData)) console.error('Error: /api/movements no devolvió un arreglo', mData);
            if (!Array.isArray(lData)) console.error('Error: /api/locations no devolvió un arreglo', lData);
            if (!Array.isArray(uData)) console.error('Error: /api/users no devolvió un arreglo', uData);

            setProducts(Array.isArray(pData) ? pData : []);
            setStock(Array.isArray(sData) ? sData : []);
            setMovements(Array.isArray(mData) ? mData.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : []);
            setLocations(Array.isArray(lData) ? lData : []);
            setUsers(Array.isArray(uData) ? uData : []);

            if (!Array.isArray(pData) || !Array.isArray(sData) || !Array.isArray(mData) || !Array.isArray(lData) || !Array.isArray(uData)) {
                console.error('Algunos datos de la API no son arreglos. Revisa la conexión a la base de datos.');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
            await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            setProducts(prev => {
                const exists = prev.some(p => p.id_venta === product.id_venta);
                if (exists) {
                    return prev.map(p => p.id_venta === product.id_venta ? product : p);
                }
                return [...prev, product];
            });
        } catch (error) {
            console.error('Error adding product:', error);
        }
    }, []);

    const updateProduct = useCallback(async (product: Product) => {
        try {
            await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            setProducts(prev => prev.map(p => p.id_venta === product.id_venta ? product : p));
        } catch (error) {
            console.error('Error updating product:', error);
        }
    }, []);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await fetch(`/api/products/${productId}`, { method: 'DELETE' });
            setProducts(prev => prev.filter(p => p.id_venta !== productId));
            setStock(prev => prev.filter(s => s.productId !== productId));
        } catch (error) {
            console.error('Error deleting product:', error);
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
    
    return (
        <InventoryContext.Provider value={{ 
            products, stock, movements, locations, users, 
            addMovement, updateStock, setInitialData, findProductById, clearAllData,
            clearProducts, clearLocations, clearUsers,
            addProduct, updateProduct, deleteProduct,
            addLocation, updateLocation, deleteLocation,
            addUser, updateUser, deleteUser
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