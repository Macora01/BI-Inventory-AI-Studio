
import React, { useEffect, useState, useMemo } from 'react';
import Card from '../components/Card';
import { useInventory } from '../context/InventoryContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Archive, AlertTriangle, Package, CheckCircle, RefreshCw, PieChart as PieChartIcon } from 'lucide-react';
import { analyzeInventoryData } from '../services/geminiService';
import { GeminiInsight } from '../types';
import Button from '../components/Button';

/**
 * Componente DashboardPage.
 * Muestra una vista ejecutiva del inventario, incluyendo métricas clave,
 * gráficos de ventas, alertas de stock e insights impulsados por IA de Gemini.
 */
const DashboardPage: React.FC = () => {
    const { products, stock, movements, locations, loading, error, fetchData } = useInventory();
    const [insights, setInsights] = useState<GeminiInsight[]>([]);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const COLORS = ['#A0522D', '#D2691E', '#CD853F', '#F4A460', '#DEB887', '#BC8F8F', '#8B4513'];

    // useMemo para calcular valores clave solo cuando sus dependencias cambian.
    // Esto optimiza el rendimiento al evitar recálculos innecesarios en cada render.
    
    // Calcula el valor total del inventario (costo * cantidad).
    const inventoryValue = useMemo(() => {
        if (!Array.isArray(stock) || !Array.isArray(products)) return 0;
        return stock.reduce((total, s) => {
            const product = products.find(p => p.id_venta === s.productId);
            return total + (product ? product.cost * s.quantity : 0);
        }, 0);
    }, [stock, products]);
    
    // Calcula el total de unidades en stock.
    const totalUnits = useMemo(() => {
        if (!Array.isArray(stock)) return 0;
        return stock.reduce((sum, s) => sum + s.quantity, 0);
    }, [stock]);
    
    // Calcula la cantidad de productos con bajo stock.
    const lowStockItems = useMemo(() => {
        if (!Array.isArray(stock) || !Array.isArray(products)) return 0;
        
        // Calculamos el stock total por producto
        const totalStockByProduct = stock.reduce((acc, s) => {
            acc[s.productId] = (acc[s.productId] || 0) + s.quantity;
            return acc;
        }, {} as Record<string, number>);

        // Contamos cuántos productos están por debajo de su stock mínimo
        return products.filter(product => {
            const totalStock = totalStockByProduct[product.id_venta] || 0;
            const minStock = product.minStock ?? 2;
            return totalStock < minStock;
        }).length;
    }, [stock, products]);

    // Calcula los productos más vendidos para el gráfico.
    const topSellingProducts = useMemo(() => {
        if (!Array.isArray(movements) || !Array.isArray(products)) return [];
        const sales = movements.filter(m => m.type === 'SALE');
        const salesByProduct = sales.reduce((acc, sale) => {
            const product = products.find(p => p.id_venta === sale.productId);
            if(product) {
                acc[product.description] = (acc[product.description] || 0) + sale.quantity;
            }
            return acc;
        }, {} as Record<string, number>);

        return (Object.entries(salesByProduct) as [string, number][])
            .sort((a, b) => b[1] - a[1]) // Ordena de mayor a menor
            .slice(0, 5) // Toma los 5 primeros
            .map(([name, ventas]) => ({ name, ventas }));
    }, [movements, products]);

    // Distribución de productos por bodega
    const stockDistribution = useMemo(() => {
        if (!Array.isArray(stock) || !Array.isArray(locations)) return [];
        
        const distribution = stock.reduce((acc, s) => {
            const location = locations.find(l => l.id === s.locationId);
            const name = location ? location.name : 'Desconocido';
            acc[name] = (acc[name] || 0) + s.quantity;
            return acc;
        }, {} as Record<string, number>);

        return (Object.entries(distribution) as [string, number][])
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
    }, [stock, locations]);

    // Ventas por sitio (excluyendo Bodega Principal)
    const salesBySite = useMemo(() => {
        if (!Array.isArray(movements) || !Array.isArray(locations)) return [];
        
        const sales = movements.filter(m => m.type === 'SALE');
        const distribution = sales.reduce((acc, sale) => {
            const location = locations.find(l => l.id === sale.fromLocationId);
            // Excluir si es bodega principal
            if (location && location.type !== 'MAIN_WAREHOUSE') {
                const name = location.name;
                acc[name] = (acc[name] || 0) + (sale.price || 0) * sale.quantity;
            }
            return acc;
        }, {} as Record<string, number>);

        return (Object.entries(distribution) as [string, number][])
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
    }, [movements, locations]);

    // Función para solicitar el análisis de IA a Gemini.
    const handleGenerateInsights = async () => {
        setIsLoadingInsights(true);
        try {
            const analysisResult = await analyzeInventoryData(products, stock, movements);
            setInsights(JSON.parse(analysisResult));
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Fallo al parsear los insights de Gemini:", error);
            setInsights([{
                title: "Error de Formato",
                insight: "La respuesta del análisis de IA no pudo ser procesada.",
                recommendation: "Intente nuevamente. Si el problema persiste, la respuesta de la IA podría no estar en el formato JSON esperado."
            }]);
            setLastUpdated(null);
        } finally {
            setIsLoadingInsights(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-primary">Dashboard Ejecutivo</h2>
                {error && (
                    <button 
                        onClick={() => fetchData()}
                        className="flex items-center space-x-2 px-3 py-1 bg-danger bg-opacity-10 text-danger rounded-md hover:bg-opacity-20 transition-all text-sm font-medium border border-danger border-opacity-20"
                    >
                        <AlertTriangle size={16} />
                        <span>Error de Conexión - Reintentar</span>
                    </button>
                )}
            </div>
            
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-accent bg-opacity-20 rounded-xl"></div>
                    ))}
                </div>
            ) : error ? (
                <Card className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                    <AlertTriangle size={64} className="text-danger" />
                    <h3 className="text-xl font-bold text-text-main">No se pudo cargar la información</h3>
                    <p className="text-text-light max-w-md">
                        Hubo un problema al conectar con la base de datos. Por favor, verifica tu conexión o intenta de nuevo.
                    </p>
                    <p className="text-xs text-danger bg-danger bg-opacity-5 p-2 rounded border border-danger border-opacity-10">
                        {error}
                    </p>
                    <Button onClick={() => fetchData()}>Reintentar Carga</Button>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={DollarSign} title="Valor del Inventario" value={`$${inventoryValue.toLocaleString('es-CL')}`} />
                        <StatCard icon={Archive} title="Unidades Totales" value={totalUnits.toLocaleString('es-CL')} />
                        <StatCard icon={Package} title="Productos Únicos (SKU)" value={products.length.toLocaleString('es-CL')} />
                        <StatCard icon={AlertTriangle} title="Items con Bajo Stock" value={lowStockItems.toLocaleString('es-CL')} variant="danger" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2" title="Top 5 Productos Vendidos">
                           <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topSellingProducts}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} tick={{ fill: '#5D4037' }} />
                                    <YAxis tick={{ fill: '#5D4037' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#F5F5DC', border: '1px solid #dec290' }} />
                                    <Legend />
                                    <Bar dataKey="ventas" fill="#A0522D" name="Unidades Vendidas" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card title="Análisis con IA (Gemini)">
                            <div className='flex flex-col h-full'>
                                {insights.length === 0 && !isLoadingInsights && (
                                    <div className="text-center my-auto">
                                        <p className="text-text-light mb-4">Obtenga insights y recomendaciones sobre su inventario.</p>
                                        <Button onClick={handleGenerateInsights} disabled={isLoadingInsights}>
                                            Generar Análisis
                                        </Button>
                                    </div>
                                )}
                                {isLoadingInsights && (
                                    <div className="text-center my-auto">
                                        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                                        <p className="text-text-main">Analizando datos...</p>
                                        <p className="text-xs text-text-light">Consultando a la IA...</p>
                                    </div>
                                )}
                                {insights.length > 0 && !isLoadingInsights && (
                                     <div className="flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-3 bg-success bg-opacity-10 p-2 rounded border border-success border-opacity-20">
                                            <div className="flex items-center text-success text-xs font-semibold">
                                                <CheckCircle size={14} className="mr-1" />
                                                Análisis recibido con éxito
                                            </div>
                                            {lastUpdated && (
                                                <span className="text-[10px] text-text-light">
                                                    {lastUpdated.toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-3 overflow-y-auto pr-2" style={{maxHeight: '200px'}}>
                                            {insights.map((insight, index) => (
                                                <div key={index} className="text-sm border-l-2 border-accent pl-2">
                                                    <h4 className="font-bold text-primary">{insight.title}</h4>
                                                    <p className="text-text-main"><span className="font-semibold">Insight:</span> {insight.insight}</p>
                                                    <p className="text-text-light"><span className="font-semibold">Recomendación:</span> {insight.recommendation}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-auto pt-3">
                                            <Button variant="secondary" size="sm" className="w-full text-xs" onClick={handleGenerateInsights}>
                                                Actualizar Análisis
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Distribución de Productos por Bodega">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stockDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {stockDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `${value.toLocaleString('es-CL')} unidades`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card title="Ventas por Sitio (Monto Total)">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={salesBySite}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#82ca9d"
                                            dataKey="value"
                                        >
                                            {salesBySite.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-CL')}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};

// Sub-componente para las tarjetas de estadísticas.
interface StatCardProps {
    icon: React.ElementType;
    title: string;
    value: string;
    variant?: 'default' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, variant = 'default' }) => {
    const iconColor = variant === 'danger' ? 'text-danger' : 'text-primary';
    return (
        <Card className="flex items-center">
            <div className={`p-3 rounded-full bg-accent mr-4`}>
                <Icon className={`w-8 h-8 ${iconColor}`} />
            </div>
            <div>
                <p className="text-sm text-text-light">{title}</p>
                <p className="text-2xl font-bold text-text-main">{value}</p>
            </div>
        </Card>
    );
};


export default DashboardPage;