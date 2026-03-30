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
        // En una app real, esto debería ser una transacción en el backend.
        // Por simplicidad para el demo, lo hacemos secuencialmente.
        try {
            for (const p of initialProducts) {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(p)
                });
            }
            for (const s of initialStock) {
                await fetch('/api/stock/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: s.productId, locationId: s.locationId, quantityChange: s.quantity })
                });
            }
            for (const m of initialMovements) {
                await fetch('/api/movements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(m)
                });
            }
            fetchData(); // Recarga todo
        } catch (error) {
            console.error('Error setting initial data:', error);
        }
    }, [fetchData]);

    const findProductById = useCallback((productId: string) => products.find(p => p.id_venta === productId), [products]);

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
    
    return (
        <InventoryContext.Provider value={{ 
            products, stock, movements, locations, users, 
            addMovement, updateStock, setInitialData, findProductById, clearAllData,
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