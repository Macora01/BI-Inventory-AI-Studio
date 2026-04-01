
import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { useInventory } from '../context/InventoryContext';
import { Product, Stock, MovementType, Location, ParsedInitialInventory, ParsedTransfer, ParsedSale } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Search, Plus, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, Info, Upload, Package, FileText, ShoppingCart, RefreshCw, Camera, AlertCircle } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import Papa from 'papaparse';
import QRScanner from '../components/QRScanner';
import ProductImage from '../components/ProductImage';
import { useToast } from '../hooks/useToast';

/**
 * Componente InventoryPage.
 * Muestra una tabla completa de todos los productos, permitiendo a los usuarios
 * ver los niveles de stock en todas las ubicaciones. Incluye funcionalidad de búsqueda,
 * creación, edición, eliminación y ajuste de stock.
 */
const InventoryPage: React.FC = () => {
    const { 
        products, stock, locations, 
        addProduct, updateProduct, deleteProduct, 
        updateStock, addMovement, setInitialData,
        loading, error, fetchData
    } = useInventory();
    const { addToast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados para Modales
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
    const [qrScannerTarget, setQRScannerTarget] = useState<'search' | 'product_id' | 'factory_id'>('search');
    
    // Estado para Producto seleccionado (Edición o Nuevo)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estado para subida de imagen de producto
    const [productImageFile, setProductImageFile] = useState<File | null>(null);
    const [uploadingProductImage, setUploadingProductImage] = useState(false);
    const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());
    
    // Estado para Ajuste de Stock
    const [adjustmentData, setAdjustmentData] = useState({
        productId: '',
        locationId: '',
        quantity: 0,
        reason: '',
        type: 'ADD' as 'ADD' | 'REMOVE'
    });

    // useMemo para filtrar productos solo cuando la lista de productos o el término de búsqueda cambian.
    const filteredProducts = useMemo(() => {
        if (!searchTerm) {
            return products;
        }
        const lowerSearch = searchTerm.toLowerCase();
        return products.filter(p => 
            p.description.toLowerCase().includes(lowerSearch) ||
            p.id_venta.toLowerCase().includes(lowerSearch) ||
            p.id_fabrica.toLowerCase().includes(lowerSearch)
        );
    }, [products, searchTerm]);

    // Función para obtener el stock de un producto en una ubicación específica.
    const getStockForProductAndLocation = (productId: string, locationId: string): number => {
        const stockItem = stock.find(s => s.productId === productId && s.locationId === locationId);
        return stockItem ? stockItem.quantity : 0;
    };

    // Manejadores de Producto
    const handleOpenNewProduct = () => {
        setSelectedProduct({ id_venta: '', id_fabrica: '', description: '', price: 0, cost: 0, minStock: 2, initialStock: 0 });
        setIsEditing(false);
        setIsProductModalOpen(true);
    };

    const handleOpenEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsEditing(true);
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        
        try {
            if (isEditing) {
                await updateProduct(selectedProduct);
                addToast('Producto actualizado con éxito.', 'success');
                
                // Si hay una imagen seleccionada, subirla ahora que el producto está guardado
                if (productImageFile && selectedProduct.id_fabrica) {
                    await handleProductImageUpload(selectedProduct.id_fabrica);
                }
            } else {
                await addProduct(selectedProduct);
                addToast('Producto creado con éxito.', 'success');
                
                // Si hay una imagen seleccionada, subirla
                if (productImageFile && selectedProduct.id_fabrica) {
                    await handleProductImageUpload(selectedProduct.id_fabrica);
                }
            }
            setIsProductModalOpen(false);
            setProductImageFile(null);
        } catch (error) {
            // El error ya se muestra en el alert del contexto
            console.error('Error in handleSaveProduct:', error);
            addToast('Error al guardar el producto.', 'error');
        }
    };

    const handleProductImageUpload = async (factoryId: string) => {
        if (!productImageFile || !factoryId) return;
        setUploadingProductImage(true);
        const formData = new FormData();
        formData.append('file', productImageFile);
        try {
            const response = await fetch(`/api/upload?type=product&factoryId=${factoryId}`, {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                setImageRefreshKey(Date.now());
            } else {
                addToast('Error al subir la imagen del producto.', 'error');
            }
        } catch (err) {
            addToast('Error de red al subir la imagen.', 'error');
        } finally {
            setUploadingProductImage(false);
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (window.confirm('¿Está seguro de eliminar este producto? Se borrará también su stock.')) {
            await deleteProduct(productId);
        }
    };

    // Manejadores de Ajuste de Stock
    const handleOpenAdjustment = (productId: string, type: 'ADD' | 'REMOVE') => {
        setAdjustmentData({
            productId,
            locationId: locations[0]?.id || '',
            quantity: 1,
            reason: '',
            type
        });
        setIsAdjustmentModalOpen(true);
    };

    const handleSaveAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        const change = adjustmentData.type === 'ADD' ? adjustmentData.quantity : -adjustmentData.quantity;
        
        // Actualizar Stock
        await updateStock(adjustmentData.productId, adjustmentData.locationId, change);
        
        // Registrar Movimiento
        await addMovement({
            productId: adjustmentData.productId,
            quantity: Math.abs(change),
            type: MovementType.ADJUSTMENT,
            fromLocationId: adjustmentData.type === 'REMOVE' ? adjustmentData.locationId : undefined,
            toLocationId: adjustmentData.type === 'ADD' ? adjustmentData.locationId : undefined,
            relatedFile: `Ajuste Manual: ${adjustmentData.reason}`
        });
        
        setIsAdjustmentModalOpen(false);
    };

    // --- LÓGICA DE IMPORTACIÓN CSV ---
    
    const processInitialInventory = async (content: string) => {
        if (locations.length === 0) {
            alert('Error: Las ubicaciones aún no se han cargado. Por favor, espere un momento.');
            return;
        }

        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            delimiter: "", // Auto-detectar delimitador (, o ;)
            complete: async (results) => {
                try {
                    const data = results.data as ParsedInitialInventory[];
                    const newProducts: Product[] = [];
                    const newStock: Stock[] = [];
                    const newMovements: any[] = [];
                    
                    const mainLoc = locations.find(l => l.id === 'main_warehouse' || l.id === 'loc_central') || locations[0];
                    
                    data.forEach(item => {
                        if (!item.id_venta) return;
                        newProducts.push({
                            id_venta: item.id_venta,
                            id_fabrica: item.id_fabrica || '',
                            description: item.description || '',
                            price: Number(item.price) || 0,
                            cost: Number(item.cost) || 0
                        });
                        
                        if (Number(item.qty) > 0) {
                            newStock.push({
                                productId: item.id_venta,
                                locationId: mainLoc.id,
                                quantity: Number(item.qty)
                            });
                            newMovements.push({
                                productId: item.id_venta,
                                quantity: Number(item.qty),
                                type: MovementType.INITIAL_LOAD,
                                toLocationId: mainLoc.id,
                                timestamp: new Date(),
                                relatedFile: 'Carga Inicial CSV'
                            });
                        }
                    });
                    
                    await setInitialData(newProducts, newStock, newMovements);
                    setIsImportModalOpen(false);
                    alert('Inventario inicial cargado con éxito.');
                } catch (error: any) {
                    console.error('Error procesando inventario:', error);
                    alert(`Error al cargar el inventario: ${error.message}`);
                }
            }
        });
    };

    const processTransfers = async (content: string) => {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as ParsedTransfer[];
                const errors: string[] = [];
                
                for (const item of data) {
                    if (!item.id_venta || !item.qty) continue;
                    const qty = Number(item.qty);
                    
                    // Validar existencia de ubicaciones
                    const fromLoc = locations.find(l => l.name.toLowerCase() === item.sitio_inicial?.toLowerCase());
                    const toLoc = locations.find(l => l.name.toLowerCase() === item.sitio_final?.toLowerCase());
                    
                    if (!fromLoc) {
                        errors.push(`Error: El sitio inicial "${item.sitio_inicial}" no existe en la configuración.`);
                        continue;
                    }
                    if (!toLoc) {
                        errors.push(`Error: El sitio final "${item.sitio_final}" no existe en la configuración.`);
                        continue;
                    }
                    
                    // Validar stock en sitio inicial
                    const currentStock = getStockForProductAndLocation(item.id_venta, fromLoc.id);
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
                        type: MovementType.TRANSFER_IN,
                        fromLocationId: fromLoc.id,
                        toLocationId: toLoc.id,
                        timestamp: new Date(),
                        relatedFile: 'Transferencia CSV'
                    });
                }
                
                setIsImportModalOpen(false);
                if (errors.length > 0) {
                    alert(`Transferencias procesadas con algunos errores:\n\n${errors.join('\n')}`);
                } else {
                    alert('Todas las transferencias se procesaron con éxito.');
                }
            }
        });
    };

    const processSales = async (content: string) => {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as ParsedSale[];
                const errors: string[] = [];
                
                for (const item of data) {
                    if (!item.cod_venta || !item.qty) continue;
                    
                    // Buscar ubicación por nombre exacto
                    const loc = locations.find(l => l.name.toLowerCase() === item.lugar?.toLowerCase());
                    
                    if (!loc) {
                        errors.push(`Error: El lugar de venta "${item.lugar}" no existe en la configuración.`);
                        continue;
                    }
                    
                    const qty = Number(item.qty) || 1;
                    
                    await updateStock(item.cod_venta, loc.id, -qty);
                    await addMovement({
                        productId: item.cod_venta,
                        quantity: qty,
                        type: MovementType.SALE,
                        fromLocationId: loc.id,
                        timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
                        price: Number(item.precio) || 0,
                        relatedFile: 'Venta CSV'
                    });
                }
                
                setIsImportModalOpen(false);
                if (errors.length > 0) {
                    alert(`Ventas procesadas con algunos errores:\n\n${errors.join('\n')}`);
                } else {
                    alert('Ventas procesadas con éxito.');
                }
            }
        });
    };

    const handleQRScan = (decodedText: string) => {
        const upperCode = decodedText.toUpperCase();
        if (qrScannerTarget === 'search') {
            setSearchTerm(upperCode);
        } else if (qrScannerTarget === 'product_id') {
            setSelectedProduct(prev => prev ? { ...prev, id_venta: upperCode } : null);
        } else if (qrScannerTarget === 'factory_id') {
            setSelectedProduct(prev => prev ? { ...prev, id_fabrica: upperCode } : null);
        }
        setIsQRScannerOpen(false);
    };

    const openScanner = (target: 'search' | 'product_id' | 'factory_id') => {
        setQRScannerTarget(target);
        setIsQRScannerOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-primary">Gestión de Productos e Inventario</h2>
                <div className="flex space-x-2">
                    <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" className="flex items-center">
                        <Upload size={18} className="mr-2" /> Importar CSV
                    </Button>
                    <Button onClick={handleOpenNewProduct} className="flex items-center">
                        <Plus size={18} className="mr-2" /> Nuevo Producto
                    </Button>
                </div>
            </div>

            <Card>
                <div className="mb-4 flex items-center bg-white border border-accent rounded-md px-3 py-2 max-w-md focus-within:ring-2 focus-within:ring-secondary">
                    <Search size={20} className="text-text-light mr-2" />
                    <input
                        type="text"
                        placeholder="Buscar por descripción, código venta o fábrica..."
                        className="flex-grow bg-transparent focus:outline-none text-text-main"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button 
                        onClick={() => openScanner('search')}
                        className="ml-2 p-1 text-primary hover:bg-accent hover:bg-opacity-20 rounded transition-colors"
                        title="Buscar por QR/Barcode"
                    >
                        <Camera size={20} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-text-main">
                        <thead className="text-xs text-primary uppercase bg-accent">
                            <tr>
                                <th scope="col" className="px-4 py-3">Imagen</th>
                                <th scope="col" className="px-4 py-3">Código Venta / Fábrica</th>
                                <th scope="col" className="px-4 py-3">Descripción</th>
                                {locations.map(loc => (
                                    <th key={loc.id} scope="col" className="px-4 py-3 text-center">{loc.name}</th>
                                ))}
                                <th scope="col" className="px-4 py-3 text-center">Total</th>
                                <th scope="col" className="px-4 py-3 text-center">Mín.</th>
                                <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={locations.length + 4} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                            <p className="text-text-light">Cargando inventario...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={locations.length + 4} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center space-y-4 text-danger">
                                            <AlertCircle size={48} />
                                            <p className="font-bold">Error de Conexión</p>
                                            <p className="text-sm max-w-md">{error}</p>
                                            <button 
                                                onClick={() => fetchData()}
                                                className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                                            >
                                                Reintentar Conexión
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts.map(product => {
                                const totalStock = stock
                                    .filter(s => s.productId === product.id_venta)
                                    .reduce((sum, s) => sum + s.quantity, 0);
                                
                                const isLowStock = totalStock < (product.minStock ?? 2);

                                return (
                                    <tr key={product.id_venta} className={`bg-background-light border-b border-background hover:bg-gray-50 transition-colors ${isLowStock ? 'bg-red-50' : ''}`}>
                                        <td className="px-4 py-4">
                                            <ProductImage 
                                                factoryId={product.id_fabrica} 
                                                alt={product.description} 
                                                className="w-12 h-12" 
                                                refreshKey={imageRefreshKey}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-bold">{product.id_venta}</div>
                                            <div className="text-xs text-text-light">{product.id_fabrica}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {product.description}
                                            {isLowStock && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger text-white">
                                                    Stock Bajo
                                                </span>
                                            )}
                                        </td>
                                        {locations.map(loc => (
                                            <td key={loc.id} className="px-4 py-4 text-center">
                                                {getStockForProductAndLocation(product.id_venta, loc.id)}
                                            </td>
                                        ))}
                                        <td className={`px-4 py-4 text-center font-bold ${isLowStock ? 'text-danger' : ''}`}>{totalStock}</td>
                                        <td className="px-4 py-4 text-center text-text-light">{product.minStock ?? 2}</td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex justify-end space-x-1">
                                                <button 
                                                    onClick={() => handleOpenAdjustment(product.id_venta, 'ADD')}
                                                    title="Aumentar Stock"
                                                    className="p-1 text-success hover:bg-success hover:bg-opacity-10 rounded"
                                                >
                                                    <ArrowUpCircle size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenAdjustment(product.id_venta, 'REMOVE')}
                                                    title="Disminuir Stock"
                                                    className="p-1 text-danger hover:bg-danger hover:bg-opacity-10 rounded"
                                                >
                                                    <ArrowDownCircle size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenEditProduct(product)}
                                                    title="Editar Producto"
                                                    className="p-1 text-primary hover:bg-primary hover:bg-opacity-10 rounded"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteProduct(product.id_venta)}
                                                    title="Eliminar Producto"
                                                    className="p-1 text-danger hover:bg-danger hover:bg-opacity-10 rounded"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                             {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={locations.length + 4} className="text-center py-8 text-text-light italic">
                                        No se encontraron productos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Producto (Nuevo/Editar) */}
            <Modal 
                isOpen={isProductModalOpen} 
                onClose={() => setIsProductModalOpen(false)} 
                title={isEditing ? 'Detalles del Producto' : 'Nuevo Producto'}
            >
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 flex flex-col items-center">
                        <ProductImage 
                            factoryId={selectedProduct?.id_fabrica || ''} 
                            alt={selectedProduct?.description || 'Producto'} 
                            className="w-full aspect-square mb-4 shadow-md" 
                            refreshKey={imageRefreshKey}
                        />
                        <div className="w-full space-y-2">
                            <label className="block text-[10px] font-medium text-text-light uppercase tracking-wider">Subir Foto</label>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => setProductImageFile(e.target.files?.[0] || null)}
                                className="block w-full text-[10px] text-text-main file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-accent file:text-primary hover:file:bg-opacity-80"
                            />
                            <p className="text-[10px] text-text-light text-center italic">
                                La imagen se guardará como <code className="bg-background p-0.5 rounded">{selectedProduct?.id_fabrica || 'id_fabrica'}.jpg</code>
                            </p>
                        </div>
                    </div>
                    <form onSubmit={handleSaveProduct} className="flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main">Código Venta (ID Único)</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input 
                                type="text" 
                                required
                                disabled={isEditing}
                                className="flex-grow p-2 border border-accent rounded-l-md bg-white disabled:bg-gray-100"
                                value={selectedProduct?.id_venta || ''}
                                onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, id_venta: e.target.value } : null)}
                            />
                            {!isEditing && (
                                <button
                                    type="button"
                                    onClick={() => openScanner('product_id')}
                                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-accent bg-accent bg-opacity-20 text-primary hover:bg-opacity-40 transition-colors"
                                    title="Escanear Código"
                                >
                                    <Camera size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">Código Fábrica</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input 
                                type="text" 
                                className="flex-grow p-2 border border-accent rounded-l-md bg-white"
                                value={selectedProduct?.id_fabrica || ''}
                                onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, id_fabrica: e.target.value } : null)}
                            />
                            <button
                                type="button"
                                onClick={() => openScanner('factory_id')}
                                className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-accent bg-accent bg-opacity-20 text-primary hover:bg-opacity-40 transition-colors"
                                title="Escanear Código"
                            >
                                <Camera size={20} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">Descripción</label>
                        <input 
                            type="text" 
                            required
                            className="mt-1 block w-full p-2 border border-accent rounded-md bg-white"
                            value={selectedProduct?.description || ''}
                            onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main">Precio Venta</label>
                            <input 
                                type="number" 
                                required
                                className="mt-1 block w-full p-2 border border-accent rounded-md bg-white"
                                value={selectedProduct?.price || ''}
                                placeholder="0"
                                onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, price: Number(e.target.value) } : null)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-main">Costo</label>
                            <input 
                                type="number" 
                                required
                                className="mt-1 block w-full p-2 border border-accent rounded-md bg-white"
                                value={selectedProduct?.cost || ''}
                                placeholder="0"
                                onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, cost: Number(e.target.value) } : null)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main">Stock Mínimo</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                className="mt-1 block w-full p-2 border border-accent rounded-md bg-white"
                                value={selectedProduct?.minStock || ''}
                                placeholder="0"
                                onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, minStock: Number(e.target.value) } : null)}
                            />
                        </div>
                        {!isEditing && (
                            <div>
                                <label className="block text-sm font-medium text-text-main">Stock Inicial</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    className="mt-1 block w-full p-2 border border-accent rounded-md bg-white"
                                    value={selectedProduct?.initialStock || ''}
                                    placeholder="0"
                                    onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, initialStock: Number(e.target.value) } : null)}
                                />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-text-light mt-1">El sistema alertará cuando la suma de todas las bodegas sea menor al stock mínimo.</p>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                        <Button type="submit">Guardar Producto</Button>
                    </div>
                </form>
            </div>
        </Modal>

            {/* Modal de Ajuste de Stock */}
            <Modal 
                isOpen={isAdjustmentModalOpen} 
                onClose={() => setIsAdjustmentModalOpen(false)} 
                title={adjustmentData.type === 'ADD' ? 'Aumentar Stock' : 'Disminuir Stock'}
            >
                <form onSubmit={handleSaveAdjustment} className="space-y-4">
                    <div className="p-3 bg-accent bg-opacity-20 rounded-md flex items-start">
                        <Info size={20} className="text-primary mr-2 mt-0.5" />
                        <p className="text-xs text-text-main">
                            Este ajuste registrará un movimiento de tipo <strong>AJUSTE</strong> en el historial.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">Ubicación</label>
                        <select 
                            className="mt-1 block w-full p-2 border border-accent rounded-md bg-white"
                            value={adjustmentData.locationId}
                            onChange={(e) => setAdjustmentData(prev => ({ ...prev, locationId: e.target.value }))}
                        >
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">Cantidad</label>
                        <input 
                            type="number" 
                            min="1"
                            required
                            className="mt-1 block w-full p-2 border border-accent rounded-md bg-white"
                            value={adjustmentData.quantity || ''}
                            placeholder="0"
                            onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main">Razón / Motivo</label>
                        <textarea 
                            required
                            placeholder="Ej: Producto dañado, error de conteo, devolución..."
                            className="mt-1 block w-full p-2 border border-accent rounded-md bg-white"
                            rows={3}
                            value={adjustmentData.reason}
                            onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                        />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsAdjustmentModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant={adjustmentData.type === 'ADD' ? 'primary' : 'danger'}>
                            {adjustmentData.type === 'ADD' ? 'Aumentar' : 'Disminuir'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Importación CSV */}
            <Modal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                title="Importar Datos desde CSV"
            >
                <div className="space-y-6">
                    <p className="text-sm text-text-main">
                        Seleccione el tipo de archivo que desea cargar. Asegúrese de que el formato coincida con los campos requeridos.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="p-4 border border-accent rounded-lg">
                            <h4 className="font-bold text-primary flex items-center mb-2">
                                <Package size={18} className="mr-2" /> Inventario Inicial
                            </h4>
                            <p className="text-xs text-text-light mb-3">Carga masiva de productos y stock inicial.</p>
                            <FileUpload 
                                title="Subir Inventario Inicial"
                                onFileProcess={processInitialInventory} 
                            />
                        </div>

                        <div className="p-4 border border-accent rounded-lg">
                            <h4 className="font-bold text-primary flex items-center mb-2">
                                <RefreshCw size={18} className="mr-2" /> Transferencias
                            </h4>
                            <p className="text-xs text-text-light mb-3">Movimientos entre Bodega Central y Almacenes.</p>
                            <FileUpload 
                                title="Subir Transferencias"
                                onFileProcess={processTransfers} 
                            />
                        </div>

                        <div className="p-4 border border-accent rounded-lg">
                            <h4 className="font-bold text-primary flex items-center mb-2">
                                <ShoppingCart size={18} className="mr-2" /> Ventas
                            </h4>
                            <p className="text-xs text-text-light mb-3">Registro de ventas para descontar del stock.</p>
                            <FileUpload 
                                title="Subir Ventas"
                                onFileProcess={processSales} 
                            />
                        </div>
                    </div>

                    <div className="bg-background-light p-3 rounded-md border border-accent">
                        <h5 className="text-xs font-bold text-primary uppercase mb-2">Formatos Esperados (Cabeceras):</h5>
                        <ul className="text-[10px] space-y-1 text-text-main list-disc pl-4">
                            <li><strong>Inventario:</strong> id_venta, price, cost, id_fabrica, qty, description</li>
                            <li><strong>Transferencias:</strong> sitio_inicial, sitio_final, id_venta, qty <br/>
                                <span className="text-[9px] text-text-light italic">(Ej: Bod_Prin, Alma_VLT, PROD01, 1)</span>
                            </li>
                            <li><strong>Ventas:</strong> timestamp, lugar, cod_fabrica, cod_venta, description, precio, qty <br/>
                                <span className="text-[9px] text-text-light italic">(Ej: 2024-03-31, Alma_VLT, FAB01, VENTA01, Desc, 100, 1)</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </Modal>

            {isQRScannerOpen && (
                <QRScanner 
                    onScan={handleQRScan} 
                    onClose={() => setIsQRScannerOpen(false)} 
                    title={
                        qrScannerTarget === 'search' ? "Buscar Producto" : 
                        qrScannerTarget === 'product_id' ? "Escanear Código Venta" : 
                        "Escanear Código Fábrica"
                    }
                />
            )}
        </div>
    );
};

export default InventoryPage;
