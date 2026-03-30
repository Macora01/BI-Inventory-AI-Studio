
import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { useInventory } from '../context/InventoryContext';
import { Stock } from '../types';

/**
 * Componente InventoryPage.
 * Muestra una tabla completa de todos los productos, permitiendo a los usuarios
 * ver los niveles de stock en todas las ubicaciones. Incluye funcionalidad de búsqueda.
 */
const InventoryPage: React.FC = () => {
    const { products, stock, locations } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');

    // useMemo para filtrar productos solo cuando la lista de productos o el término de búsqueda cambian.
    const filteredProducts = useMemo(() => {
        if (!searchTerm) {
            return products;
        }
        return products.filter(p => 
            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id_venta.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    // Función para obtener el stock de un producto en una ubicación específica.
    const getStockForProductAndLocation = (productId: string, locationId: string): number => {
        const stockItem = stock.find(s => s.productId === productId && s.locationId === locationId);
        return stockItem ? stockItem.quantity : 0;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-primary">Vista de Inventario</h2>
            <Card>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por descripción o código..."
                        className="w-full max-w-sm p-2 border border-accent rounded-md bg-white focus:ring-2 focus:ring-secondary focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-text-main">
                        <thead className="text-xs text-primary uppercase bg-accent">
                            <tr>
                                <th scope="col" className="px-6 py-3">Código Venta</th>
                                <th scope="col" className="px-6 py-3">Descripción</th>
                                {locations.map(loc => (
                                    <th key={loc.id} scope="col" className="px-6 py-3 text-center">{loc.name}</th>
                                ))}
                                <th scope="col" className="px-6 py-3 text-center">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => {
                                // Calcula el stock total para el producto sumando las cantidades de todas las ubicaciones.
                                const totalStock = stock
                                    .filter(s => s.productId === product.id_venta)
                                    .reduce((sum, s) => sum + s.quantity, 0);

                                return (
                                    <tr key={product.id_venta} className="bg-background-light border-b border-background hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium whitespace-nowrap">{product.id_venta}</td>
                                        <td className="px-6 py-4">{product.description}</td>
                                        {locations.map(loc => (
                                            <td key={loc.id} className="px-6 py-4 text-center">
                                                {getStockForProductAndLocation(product.id_venta, loc.id)}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-center font-bold">{totalStock}</td>
                                    </tr>
                                );
                            })}
                             {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={locations.length + 3} className="text-center py-8 text-text-light">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default InventoryPage;