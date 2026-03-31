
import React, { useEffect, useState, useMemo } from 'react';
import Card from '../components/Card';
import { useInventory } from '../context/InventoryContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Archive, AlertTriangle, Package } from 'lucide-react';
import { analyzeInventoryData } from '../services/geminiService';
import { GeminiInsight } from '../types';
import Button from '../components/Button';

/**
 * Componente DashboardPage.
 * Muestra una vista ejecutiva del inventario, incluyendo métricas clave,
 * gráficos de ventas, alertas de stock e insights impulsados por IA de Gemini.
 */
const DashboardPage: React.FC = () => {
    const { products, stock, movements } = useInventory();
    const [insights, setInsights] = useState<GeminiInsight[]>([]);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);

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

    // Función para solicitar el análisis de IA a Gemini.
    const handleGenerateInsights = async () => {
        setIsLoadingInsights(true);
        try {
            const analysisResult = await analyzeInventoryData(products, stock, movements);
            setInsights(JSON.parse(analysisResult));
        } catch (error) {
            console.error("Fallo al parsear los insights de Gemini:", error);
            setInsights([{
                title: "Error de Formato",
                insight: "La respuesta del análisis de IA no pudo ser procesada.",
                recommendation: "Intente nuevamente. Si el problema persiste, la respuesta de la IA podría no estar en el formato JSON esperado."
            }]);
        } finally {
            setIsLoadingInsights(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-primary">Dashboard Ejecutivo</h2>
            
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
                        {isLoadingInsights && <p className="text-text-main my-auto text-center">Analizando datos...</p>}
                        {insights.length > 0 && (
                             <div className="space-y-3 overflow-y-auto pr-2" style={{maxHeight: '240px'}}>
                                {insights.map((insight, index) => (
                                    <div key={index} className="text-sm">
                                        <h4 className="font-bold text-primary">{insight.title}</h4>
                                        <p className="text-text-main"><span className="font-semibold">Insight:</span> {insight.insight}</p>
                                        <p className="text-text-light"><span className="font-semibold">Recomendación:</span> {insight.recommendation}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
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