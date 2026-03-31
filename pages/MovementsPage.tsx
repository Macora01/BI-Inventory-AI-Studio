import React, { useCallback } from 'react';
import Card from '../components/Card';
import FileUpload from '../components/FileUpload';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../hooks/useToast';
import { parseInitialInventoryCSV, parseSalesCSV, parseTransferCSV } from '../services/csvParser';
import { MovementType, Product } from '../types';
import { MOVEMENT_TYPE_MAP } from '../constants';

// Helper para normalizar nombres para una comparación flexible.
// Convierte a minúsculas y elimina espacios y guiones bajos.
const normalizeName = (name: string) => name.toLowerCase().replace(/[\s_]/g, '');

/**
 * Componente MovementsPage.
 * Proporciona la funcionalidad para que los usuarios carguen varios archivos CSV para actualizar el inventario.
 * También muestra un registro de los movimientos de inventario más recientes.
 */
const MovementsPage: React.FC = () => {
    const { addMovement, updateStock, setInitialData, locations, products, movements, stock } = useInventory();
    const { addToast } = useToast();

    // Helper para obtener stock
    const getStock = (productId: string, locationId: string) => {
        const item = stock.find(s => s.productId === productId && s.locationId === locationId);
        return item ? item.quantity : 0;
    };

    // Procesa el archivo CSV de inventario inicial.
    const processInitialInventory = useCallback(async (content: string, file: File) => {
        try {
            const parsedData = parseInitialInventoryCSV(content);
            const newProducts: Product[] = [];
            const newStock = [];
            const newMovements = [];

            for (const item of parsedData) {
                const product: Product = {
                    id_venta: item.id_venta,
                    price: item.price,
                    cost: item.cost,
                    id_fabrica: item.id_fabrica,
                    description: item.description,
                };
                newProducts.push(product);
                
                newStock.push({
                    productId: item.id_venta,
                    locationId: 'main_warehouse',
                    quantity: item.qty,
                });

                newMovements.push({
                    id: `mov_${Date.now()}_${item.id_venta}`,
                    productId: item.id_venta,
                    quantity: item.qty,
                    type: MovementType.INITIAL_LOAD,
                    toLocationId: 'main_warehouse',
                    timestamp: new Date(),
                    relatedFile: file.name
                });
            }
            setInitialData(newProducts, newStock, newMovements);
            addToast(`Carga inicial desde '${file.name}' procesada con éxito.`, 'success');
        } catch (error: any) {
            addToast(`Error procesando archivo inicial: ${error.message}`, 'error');
        }
    }, [setInitialData, addToast]);

    // Procesa el archivo CSV de transferencias.
    const processTransfers = useCallback(async (content: string, file: File) => {
        try {
            const parsedData = parseTransferCSV(content);
            const errors: string[] = [];

            for (const item of parsedData) {
                if (!item.id_venta || !item.qty) continue;
                const qty = Number(item.qty);

                // Validar existencia de ubicaciones
                const fromLoc = locations.find(l => l.name.toLowerCase() === item.sitio_inicial?.toLowerCase());
                const toLoc = locations.find(l => l.name.toLowerCase() === item.sitio_final?.toLowerCase());

                if (!fromLoc) {
                    errors.push(`Error: El sitio inicial "${item.sitio_inicial}" no existe.`);
                    continue;
                }
                if (!toLoc) {
                    errors.push(`Error: El sitio final "${item.sitio_final}" no existe.`);
                    continue;
                }

                // Validar stock en sitio inicial
                const currentStock = getStock(item.id_venta, fromLoc.id);
                if (currentStock < qty) {
                    errors.push(`Error: Stock insuficiente para "${item.id_venta}" en "${item.sitio_inicial}". Disponible: ${currentStock}, Requerido: ${qty}.`);
                    continue;
                }

                // Procesar transferencia
                await updateStock(item.id_venta, fromLoc.id, -qty);
                await updateStock(item.id_venta, toLoc.id, qty);
                
                await addMovement({
                    productId: item.id_venta,
                    quantity: qty,
                    type: MovementType.TRANSFER_OUT,
                    fromLocationId: fromLoc.id,
                    toLocationId: toLoc.id,
                    relatedFile: file.name
                });

                await addMovement({
                    productId: item.id_venta,
                    quantity: qty,
                    type: MovementType.TRANSFER_IN,
                    fromLocationId: fromLoc.id,
                    toLocationId: toLoc.id,
                    relatedFile: file.name
                });
            }

            if (errors.length > 0) {
                addToast(`Transferencia procesada con errores:\n${errors.join('\n')}`, 'error');
            } else {
                addToast(`Transferencia desde '${file.name}' procesada exitosamente.`, 'success');
            }
        } catch (error: any) {
            addToast(`Error procesando transferencia: ${error.message}`, 'error');
        }
    }, [addMovement, updateStock, locations, addToast, products, getStock]);

    // Procesa el archivo CSV de ventas.
    const processSales = useCallback(async (content: string, file: File) => {
        try {
            // Lógica mejorada para extraer el nombre de la ubicación del archivo.
            const fileNameWithoutExt = file.name.slice(0, file.name.lastIndexOf('.'));
            const lastUnderscoreIndex = fileNameWithoutExt.lastIndexOf('_');
            if (lastUnderscoreIndex === -1) {
                throw new Error(`Formato de archivo de ventas inválido. Use 'lugar_AAMMDD.csv'.`);
            }
            const locationNameFromFile = fileNameWithoutExt.substring(0, lastUnderscoreIndex);
            
            // Búsqueda flexible de la ubicación.
            const normalizedLocationFromFile = normalizeName(locationNameFromFile);
            const fromLocation = locations.find(l => normalizeName(l.name).startsWith(normalizedLocationFromFile));

            if (!fromLocation) {
                throw new Error(`Ubicación de venta '${locationNameFromFile}' no encontrada. Verifique que exista en Configuración.`);
            }

            const parsedData = parseSalesCSV(content);
            const errors: string[] = [];

            for (const item of parsedData) {
                if (!item.cod_venta) continue;
                
                const qty = Number(item.qty) || 1;
                
                updateStock(item.cod_venta, fromLocation.id, -qty);
                addMovement({
                    productId: item.cod_venta,
                    quantity: qty,
                    type: MovementType.SALE,
                    fromLocationId: fromLocation.id,
                    relatedFile: file.name,
                    price: item.precio,
                    cost: products.find(p => p.id_venta === item.cod_venta)?.cost
                });
            }
            
            if (errors.length > 0) {
                addToast(`Ventas procesadas con errores:\n${errors.join('\n')}`, 'error');
            } else {
                addToast(`Ventas desde '${file.name}' procesadas exitosamente.`, 'success');
            }
        } catch (error: any) {
             addToast(`Error procesando ventas: ${error.message}`, 'error');
        }
    }, [addMovement, updateStock, locations, addToast, products]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-primary">Cargar Movimientos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Carga Inicial (inventario_inicial.csv)"><FileUpload onFileProcess={processInitialInventory} title="Cargar Inventario Inicial" /></Card>
                <Card title="Transferencias (tras_bod_...csv)"><FileUpload onFileProcess={processTransfers} title="Cargar Transferencia" /></Card>
                <Card title="Ventas Diarias (lugar_...csv)"><FileUpload onFileProcess={processSales} title="Cargar Ventas" /></Card>
            </div>
            
            <Card title="Últimos Movimientos">
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm text-left text-text-main">
                        <thead className="text-xs text-primary uppercase bg-accent sticky top-0">
                             <tr>
                                <th scope="col" className="px-6 py-3">Fecha</th>
                                <th scope="col" className="px-6 py-3">Producto</th>
                                <th scope="col" className="px-6 py-3">Tipo</th>
                                <th scope="col" className="px-6 py-3 text-right">Cantidad</th>
                                <th scope="col" className="px-6 py-3">Origen</th>
                                <th scope="col" className="px-6 py-3">Destino</th>
                            </tr>
                        </thead>
                        <tbody>
                             {movements.slice(0, 50).map(m => {
                                const product = products.find(p => p.id_venta === m.productId);
                                return (
                                <tr key={m.id} className="bg-background-light border-b border-background">
                                    <td className="px-6 py-4">{new Date(m.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {product ? `${product.description} (${m.productId})` : m.productId}
                                    </td>
                                    <td className="px-6 py-4">{MOVEMENT_TYPE_MAP[m.type] || m.type}</td>
                                    <td className="px-6 py-4 text-right">{m.quantity}</td>
                                    <td className="px-6 py-4">{locations.find(l => l.id === m.fromLocationId)?.name || 'N/A'}</td>
                                    <td className="px-6 py-4">{locations.find(l => l.id === m.toLocationId)?.name || 'N/A'}</td>
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default MovementsPage;