import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { Movement, MovementType } from '../types';

/**
 * Componente ReportsPage.
 * Permite a los usuarios generar, ver y exportar informes de ventas
 * basados en filtros de rango de fecha.
 */
const ReportsPage: React.FC = () => {
    const { movements, products, locations } = useInventory();
    const [reportData, setReportData] = useState<Movement[]>([]);
    const [activeRange, setActiveRange] = useState<'today' | '7days' | 'month' | null>(null);

    /**
     * Genera un informe de ventas filtrando los movimientos por un rango de fechas.
     * @param range El período de tiempo para el informe.
     */
    const handleGenerateReport = (range: 'today' | '7days' | 'month') => {
        setActiveRange(range);
        const now = new Date();
        let startDate = new Date();

        switch (range) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case '7days':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                break;
        }

        const filtered = movements.filter(m => 
            m.type === MovementType.SALE && 
            new Date(m.timestamp) >= startDate &&
            new Date(m.timestamp) <= now
        ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setReportData(filtered);
    };
    
    /**
     * Exporta los datos del informe actual a un archivo CSV y lo descarga.
     */
    const handleExportCSV = () => {
        if (reportData.length === 0) return;

        const headers = ['Fecha', 'Código Venta', 'Descripción', 'Ubicación Venta', 'Precio'];
        
        // Mapea los datos del informe a filas de CSV.
        const rows = reportData.map(m => {
            const product = products.find(p => p.id_venta === m.productId);
            const location = locations.find(l => l.id === m.fromLocationId);
            const price = m.price ? `$${m.price.toLocaleString('es-CL')}` : 'N/A';
            
            // Escapa las comas en la descripción para no romper el formato CSV.
            const description = product?.description.includes(',') ? `"${product.description}"` : product?.description;

            return [
                new Date(m.timestamp).toLocaleString('es-CL'),
                m.productId,
                description || 'N/A',
                location?.name || 'N/A',
                price
            ].join(',');
        });

        // Crea el contenido del CSV y el enlace de descarga.
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_ventas_${activeRange || 'custom'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-primary">Reportes de Ventas</h2>
            <Card>
                <div className="flex items-center space-x-2 md:space-x-4 mb-4">
                    <span className="text-sm md:text-base font-semibold">Seleccionar periodo:</span>
                    <Button onClick={() => handleGenerateReport('today')} variant={activeRange === 'today' ? 'primary' : 'secondary'}>Hoy</Button>
                    <Button onClick={() => handleGenerateReport('7days')} variant={activeRange === '7days' ? 'primary' : 'secondary'}>Últimos 7 Días</Button>
                    <Button onClick={() => handleGenerateReport('month')} variant={activeRange === 'month' ? 'primary' : 'secondary'}>Este Mes</Button>
                </div>

                {activeRange && (
                <div className="mt-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                        <h3 className="text-xl font-semibold text-text-main">Resultados del Reporte</h3>
                        <Button onClick={handleExportCSV} disabled={reportData.length === 0}>Exportar a CSV</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-text-main">
                            <thead className="text-xs text-primary uppercase bg-accent">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Fecha</th>
                                    <th scope="col" className="px-6 py-3">Código Venta</th>
                                    <th scope="col" className="px-6 py-3">Descripción</th>
                                    <th scope="col" className="px-6 py-3">Ubicación Venta</th>
                                    <th scope="col" className="px-6 py-3 text-right">Precio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.length > 0 ? reportData.map(m => {
                                    const product = products.find(p => p.id_venta === m.productId);
                                    const location = locations.find(l => l.id === m.fromLocationId);
                                    return (
                                        <tr key={m.id} className="bg-background-light border-b border-background">
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(m.timestamp).toLocaleString('es-CL')}</td>
                                            <td className="px-6 py-4 font-medium">{m.productId}</td>
                                            <td className="px-6 py-4">{product?.description || 'N/A'}</td>
                                            <td className="px-6 py-4">{location?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 text-right">{`$${(m.price || 0).toLocaleString('es-CL')}`}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-text-light">
                                            No se encontraron ventas en el periodo seleccionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
            </Card>
        </div>
    );
};

export default ReportsPage;
