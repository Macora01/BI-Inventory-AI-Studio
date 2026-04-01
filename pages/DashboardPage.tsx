
import React, { useEffect, useState, useMemo } from 'react';
import Card from '../components/Card';
import { useInventory } from '../context/InventoryContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { DollarSign, Archive, AlertTriangle, Package, CheckCircle, RefreshCw, PieChart as PieChartIcon, TrendingUp, History, Activity, TrendingDown, ShoppingCart } from 'lucide-react';
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

    // Calcula el potencial de venta (precio * cantidad).
    const potentialRevenue = useMemo(() => {
        if (!Array.isArray(stock) || !Array.isArray(products)) return 0;
        return stock.reduce((total, s) => {
            const product = products.find(p => p.id_venta === s.productId);
            return total + (product ? product.price * s.quantity : 0);
        }, 0);
    }, [stock, products]);

    const potentialMargin = potentialRevenue - inventoryValue;
    
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

    // Tendencia de ventas (últimos 7 días)
    const salesTrend = useMemo(() => {
        if (!Array.isArray(movements)) return [];
        
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const trendData = last7Days.map(date => {
            const daySales = movements.filter(m => 
                m.type === 'SALE' && 
                new Date(m.timestamp).toISOString().split('T')[0] === date
            );
            const total = daySales.reduce((sum, s) => sum + (s.price || 0) * s.quantity, 0);
            const units = daySales.reduce((sum, s) => sum + s.quantity, 0);
            
            // Formatear fecha para el gráfico
            const displayDate = new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
            
            return { date: displayDate, monto: total, unidades: units };
        });

        return trendData;
    }, [movements]);

    // Valor de inventario por ubicación (Capital inmovilizado)
    const valueByLocation = useMemo(() => {
        if (!Array.isArray(stock) || !Array.isArray(products) || !Array.isArray(locations)) return [];
        
        const distribution = stock.reduce((acc, s) => {
            const product = products.find(p => p.id_venta === s.productId);
            const location = locations.find(l => l.id === s.locationId);
            if (product && location) {
                acc[location.name] = (acc[location.name] || 0) + (product.cost * s.quantity);
            }
            return acc;
        }, {} as Record<string, number>);

        return (Object.entries(distribution) as [string, number][])
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [stock, products, locations]);

    // Productos con stock crítico (Lista detallada)
    const criticalProductsList = useMemo(() => {
        if (!Array.isArray(stock) || !Array.isArray(products)) return [];
        
        const totalStockByProduct = stock.reduce((acc, s) => {
            acc[s.productId] = (acc[s.productId] || 0) + s.quantity;
            return acc;
        }, {} as Record<string, number>);

        return products
            .filter(p => {
                const current = totalStockByProduct[p.id_venta] || 0;
                const min = p.minStock ?? 2;
                return current < min;
            })
            .map(p => ({
                id: p.id_venta,
                name: p.description,
                current: totalStockByProduct[p.id_venta] || 0,
                min: p.minStock ?? 2
            }))
            .sort((a, b) => a.current - b.current)
            .slice(0, 5);
    }, [stock, products]);

    // Últimos 5 movimientos
    const recentActivity = useMemo(() => {
        if (!Array.isArray(movements)) return [];
        return [...movements]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    }, [movements]);

    // Índice de Salud del Inventario (0-100)
    const healthScore = useMemo(() => {
        if (products.length === 0) return 100;
        const stockoutPenalty = (lowStockItems / products.length) * 100;
        const score = 100 - stockoutPenalty;
        return Math.max(0, Math.round(score));
    }, [products.length, lowStockItems]);

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
                        <StatCard icon={DollarSign} title="Valor (Costo)" value={`$${inventoryValue.toLocaleString('es-CL')}`} />
                        <StatCard icon={TrendingUp} title="Margen Potencial" value={`$${potentialMargin.toLocaleString('es-CL')}`} variant="success" />
                        <StatCard icon={Activity} title="Salud Inventario" value={`${healthScore}%`} variant={healthScore > 80 ? 'success' : healthScore > 50 ? 'warning' : 'danger'} />
                        <StatCard icon={AlertTriangle} title="Items Bajo Stock" value={lowStockItems.toLocaleString('es-CL')} variant="danger" />
                    </div>

                    {/* Fila 1: Tendencia y Alertas */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <Card className="lg:col-span-3" title="Tendencia de Ventas (Últimos 7 Días)">
                           <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesTrend}>
                                        <defs>
                                            <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#A0522D" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#A0522D" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="date" tick={{ fill: '#5D4037', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#5D4037', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#F5F5DC', border: '1px solid #dec290', borderRadius: '8px' }}
                                            formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, 'Ventas']}
                                        />
                                        <Area type="monotone" dataKey="monto" stroke="#A0522D" fillOpacity={1} fill="url(#colorMonto)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                           </div>
                        </Card>

                        <Card title="Alertas de Reposición">
                            <div className="space-y-3">
                                {criticalProductsList.length > 0 ? criticalProductsList.map((p) => (
                                    <div key={p.id} className="p-3 bg-danger bg-opacity-5 border border-danger border-opacity-10 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-bold text-text-main truncate max-w-[120px]">{p.name}</p>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-danger text-white rounded-full font-bold">CRÍTICO</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-text-light uppercase tracking-wider">Actual</span>
                                                <span className="text-sm font-bold text-danger">{p.current} un.</span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[10px] text-text-light uppercase tracking-wider">Mínimo</span>
                                                <span className="text-sm font-semibold text-text-main">{p.min} un.</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10">
                                        <CheckCircle className="w-10 h-10 text-success mx-auto mb-2 opacity-20" />
                                        <p className="text-sm text-text-light">Stock saludable.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Fila 2: Top Productos y Actividad */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2" title="Top 5 Productos Vendidos">
                           <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topSellingProducts}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} tick={{ fill: '#5D4037', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#5D4037' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#F5F5DC', border: '1px solid #dec290' }} />
                                    <Legend />
                                    <Bar dataKey="ventas" fill="#A0522D" name="Unidades Vendidas" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card title="Actividad Reciente">
                            <div className="space-y-4">
                                {recentActivity.length > 0 ? recentActivity.map((m) => {
                                    const product = products.find(p => p.id_venta === m.productId);
                                    return (
                                        <div key={m.id} className="flex items-start space-x-3 pb-3 border-b border-accent last:border-0 last:pb-0">
                                            <div className={`mt-1 p-1.5 rounded-full ${
                                                m.type === 'SALE' ? 'bg-success bg-opacity-20 text-success' :
                                                m.type === 'TRANSFER_IN' || m.type === 'TRANSFER_OUT' ? 'bg-primary bg-opacity-20 text-primary' :
                                                'bg-accent text-text-light'
                                            }`}>
                                                <History size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-text-main truncate">
                                                    {m.type === 'SALE' ? 'Venta' : m.type === 'TRANSFER_IN' ? 'Entrada' : m.type === 'TRANSFER_OUT' ? 'Salida' : 'Ajuste'} - {product?.description || m.productId}
                                                </p>
                                                <div className="flex justify-between items-center mt-0.5">
                                                    <span className="text-[10px] text-text-light">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    <span className="text-[10px] font-bold text-primary">{m.quantity} un.</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <p className="text-center text-text-light text-sm py-10">Sin actividad reciente.</p>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Fila 3: Capital e IA */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2" title="Capital Inmovilizado por Ubicación">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={valueByLocation} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={(v) => `$${v/1000}k`} hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#5D4037', fontSize: 11 }} />
                                        <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-CL')}`} />
                                        <Bar dataKey="value" fill="#CD853F" name="Valor (Costo)" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card title="Análisis con IA (Gemini)">
                            <div className='flex flex-col h-full'>
                                {insights.length === 0 && !isLoadingInsights && (
                                    <div className="text-center my-auto">
                                        <p className="text-text-light mb-4 text-sm">Obtenga insights estratégicos.</p>
                                        <Button onClick={handleGenerateInsights} disabled={isLoadingInsights} size="sm">
                                            Generar Análisis
                                        </Button>
                                    </div>
                                )}
                                {isLoadingInsights && (
                                    <div className="text-center my-auto">
                                        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                                        <p className="text-sm text-text-main">Analizando...</p>
                                    </div>
                                )}
                                {insights.length > 0 && !isLoadingInsights && (
                                     <div className="flex flex-col h-full">
                                        <div className="space-y-3 overflow-y-auto pr-2" style={{maxHeight: '220px'}}>
                                            {insights.map((insight, index) => (
                                                <div key={index} className="text-xs border-l-2 border-accent pl-2">
                                                    <h4 className="font-bold text-primary">{insight.title}</h4>
                                                    <p className="text-text-main mt-1">{insight.insight}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-auto pt-3">
                                            <Button variant="secondary" size="sm" className="w-full text-[10px]" onClick={handleGenerateInsights}>
                                                Actualizar IA
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Fila 4: Distribución (Pie Charts) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Distribución de Unidades">
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stockDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {stockDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `${value.toLocaleString('es-CL')} un.`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card title="Ventas por Sitio">
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={salesBySite}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
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
    variant?: 'default' | 'danger' | 'success' | 'warning';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, variant = 'default' }) => {
    const iconColor = 
        variant === 'danger' ? 'text-danger' : 
        variant === 'success' ? 'text-success' : 
        variant === 'warning' ? 'text-warning' : 
        'text-primary';
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