import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useInventory } from '../context/InventoryContext';
import { Movement, MovementType } from '../types';
import { MOVEMENT_TYPE_MAP } from '../constants';

interface TraceabilityData {
    history: Movement[];
    initialStock: number;
    currentStock: number;
}

/**
 * Componente TraceabilityPage.
 * Permite a los usuarios buscar un producto por su ID y ver su ciclo de vida completo,
 * incluyendo el stock inicial y todos los movimientos posteriores (transferencias, ventas).
 */
const TraceabilityPage: React.FC = () => {
    const [productId, setProductId] = useState('');
    const [traceabilityData, setTraceabilityData] = useState<TraceabilityData | null>(null);
    const [productNotFound, setProductNotFound] = useState(false);
    const { movements, findProductById, locations, stock } = useInventory();

    const handleSearch = () => {
        const product = findProductById(productId);
        if (product) {
            // Filtra y ordena el historial para encontrar el movimiento inicial.
            const history = movements
                .filter(m => m.productId === productId)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            // Encuentra el stock inicial del primer movimiento de carga.
            const initialStockMovement = history.find(m => m.type === MovementType.INITIAL_LOAD);
            const initialStock = initialStockMovement ? initialStockMovement.quantity : 0;

            // Calcula el stock actual sumando las cantidades en todas las ubicaciones.
            const currentStock = stock
                .filter(s => s.productId === productId)
                .reduce((sum, s) => sum + s.quantity, 0);

            // Guarda todos los datos de trazabilidad y reordena el historial para mostrar lo más reciente primero.
            setTraceabilityData({
                history: history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
                initialStock,
                currentStock
            });
            setProductNotFound(false);
        } else {
            setTraceabilityData(null);
            setProductNotFound(true);
        }
    };

    // Obtiene los detalles del producto si se ha encontrado un historial.
    const product = traceabilityData ? findProductById(productId) : null;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-primary">Trazabilidad de Producto</h2>
            <Card>
                <div className="flex items-end space-x-4">
                    <div className="flex-grow">
                        <label htmlFor="product-search" className="block text-sm font-medium text-text-main">
                            Código de Venta del Producto (ej: BI0001BL)
                        </label>
                        <input
                            id="product-search"
                            type="text"
                            className="mt-1 w-full p-2 border border-accent rounded-md bg-white focus:ring-2 focus:ring-secondary focus:outline-none"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch}>Buscar</Button>
                </div>
            </Card>

            {productNotFound && (
                <Card>
                    <p className="text-center text-danger">Producto con código '{productId}' no encontrado.</p>
                </Card>
            )}

            {traceabilityData && product && (
                <Card title={`Historial de: ${product.description} (${product.id_venta})`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-background rounded-md border border-accent">
                        <div>
                            <p className="text-sm text-text-light">Stock Inicial</p>
                            <p className="text-2xl font-bold text-primary">{traceabilityData.initialStock}</p>
                        </div>
                        <div>
                            <p className="text-sm text-text-light">Stock Actual</p>
                            <p className="text-2xl font-bold text-secondary">{traceabilityData.currentStock}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-screen">
                         <table className="w-full text-sm text-left text-text-main">
                            <thead className="text-xs text-primary uppercase bg-accent sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Fecha</th>
                                    <th scope="col" className="px-6 py-3">Tipo de Movimiento</th>
                                    <th scope="col" className="px-6 py-3">Origen</th>
                                    <th scope="col" className="px-6 py-3">Destino</th>
                                    <th scope="col" className="px-6 py-3 text-right">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {traceabilityData.history.map((m) => (
                                    <tr key={m.id} className="bg-background-light border-b border-background">
                                        <td className="px-6 py-4">{new Date(m.timestamp).toLocaleString('es-CL')}</td>
                                        <td className="px-6 py-4">{MOVEMENT_TYPE_MAP[m.type] || m.type}</td>
                                        <td className="px-6 py-4">{locations.find(l => l.id === m.fromLocationId)?.name || 'N/A'}</td>
                                        <td className="px-6 py-4">{locations.find(l => l.id === m.toLocationId)?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right font-bold">{m.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default TraceabilityPage;