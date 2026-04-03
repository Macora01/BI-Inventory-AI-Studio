import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { Movement, MovementType } from '../types';
import { FileText, Download, Filter, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Componente ReportsPage.
 * Permite a los usuarios generar, ver y exportar informes de ventas
 * basados en filtros de rango de fecha y ubicación.
 */
const ReportsPage: React.FC = () => {
    const { movements, products, locations } = useInventory();
    const [reportData, setReportData] = useState<Movement[]>([]);
    const [activeRange, setActiveRange] = useState<'today' | '7days' | 'month' | 'custom' | null>(null);
    
    // Filtros
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

    /**
     * Genera un informe de ventas filtrando los movimientos por un rango de fechas y ubicación.
     * @param range El período de tiempo para el informe.
     */
    const handleGenerateReport = (range: 'today' | '7days' | 'month' | 'custom') => {
        setActiveRange(range);
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (range === 'custom') {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            switch (range) {
                case 'today':
                    start.setHours(0, 0, 0, 0);
                    break;
                case '7days':
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                    start.setHours(0, 0, 0, 0);
                    break;
                case 'month':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    start.setHours(0, 0, 0, 0);
                    break;
            }
            end.setHours(23, 59, 59, 999);
        }

        const filtered = movements.filter(m => {
            const isSale = m.type === MovementType.SALE;
            const mDate = new Date(m.timestamp);
            const inRange = mDate >= start && mDate <= end;
            const matchesLocation = selectedLocationId === 'all' || m.fromLocationId === selectedLocationId;
            return isSale && inRange && matchesLocation;
        }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setReportData(filtered);
    };
    
    /**
     * Exporta los datos del informe actual a un archivo CSV y lo descarga.
     */
    const handleExportCSV = () => {
        if (reportData.length === 0) return;

        const headers = ['Fecha', 'Código Venta', 'Descripción', 'Ubicación Venta', 'Precio'];
        
        const rows = reportData.map(m => {
            const product = products.find(p => p.id_venta === m.productId);
            const location = locations.find(l => l.id === m.fromLocationId);
            const price = m.price ? `$${m.price.toLocaleString('es-CL')}` : 'N/A';
            const description = product?.description.includes(',') ? `"${product.description}"` : product?.description;

            return [
                new Date(m.timestamp).toLocaleString('es-CL'),
                m.productId,
                description || 'N/A',
                location?.name || 'N/A',
                price
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_ventas_${activeRange || 'custom'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /**
     * Exporta los datos del informe actual a un archivo PDF.
     */
    const handleExportPDF = () => {
        if (reportData.length === 0) return;

        const doc = new jsPDF();
        const title = "Reporte de Ventas - Boa Ideia";
        const locationName = selectedLocationId === 'all' ? 'Todas las ubicaciones' : locations.find(l => l.id === selectedLocationId)?.name || 'N/A';
        const dateRangeText = `Periodo: ${new Date(startDate).toLocaleDateString('es-CL')} al ${new Date(endDate).toLocaleDateString('es-CL')}`;

        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Ubicación: ${locationName}`, 14, 30);
        doc.text(dateRangeText, 14, 37);
        doc.text(`Generado el: ${new Date().toLocaleString('es-CL')}`, 14, 44);

        const tableData = reportData.map(m => {
            const product = products.find(p => p.id_venta === m.productId);
            const location = locations.find(l => l.id === m.fromLocationId);
            return [
                new Date(m.timestamp).toLocaleString('es-CL'),
                m.productId,
                product?.description || 'N/A',
                location?.name || 'N/A',
                `$${(m.price || 0).toLocaleString('es-CL')}`
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['Fecha', 'Código', 'Descripción', 'Ubicación', 'Precio']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [160, 82, 45] }, // Primary color #A0522D
        });

        const totalSales = reportData.reduce((sum, m) => sum + (m.price || 0), 0);
        const finalY = (doc as any).lastAutoTable.finalY || 50;
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Total Ventas: $${totalSales.toLocaleString('es-CL')}`, 14, finalY + 10);

        doc.save(`reporte_ventas_${new Date().getTime()}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-primary">Reportes de Ventas</h2>
            </div>

            <Card>
                <div className="space-y-6">
                    {/* Botones Rápidos */}
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-text-light flex items-center gap-2">
                            <Calendar size={16} /> Periodos Rápidos:
                        </span>
                        <Button onClick={() => handleGenerateReport('today')} variant={activeRange === 'today' ? 'primary' : 'secondary'} size="sm">Hoy</Button>
                        <Button onClick={() => handleGenerateReport('7days')} variant={activeRange === '7days' ? 'primary' : 'secondary'} size="sm">Últimos 7 Días</Button>
                        <Button onClick={() => handleGenerateReport('month')} variant={activeRange === 'month' ? 'primary' : 'secondary'} size="sm">Este Mes</Button>
                    </div>

                    {/* Filtros Personalizados */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-accent bg-opacity-30 rounded-lg border border-accent">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-light uppercase">Desde</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 rounded border border-accent bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-light uppercase">Hasta</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 rounded border border-accent bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-light uppercase">Almacén / Ubicación</label>
                            <select 
                                value={selectedLocationId} 
                                onChange={(e) => setSelectedLocationId(e.target.value)}
                                className="w-full p-2 rounded border border-accent bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="all">Todos los Almacenes</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={() => handleGenerateReport('custom')} className="w-full flex items-center justify-center gap-2">
                                <Filter size={18} /> Generar Reporte
                            </Button>
                        </div>
                    </div>
                </div>

                {activeRange && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-accent pb-4">
                        <div>
                            <h3 className="text-xl font-bold text-text-main">Resultados del Reporte</h3>
                            <p className="text-sm text-text-light">
                                {reportData.length} ventas encontradas. Total: <span className="font-bold text-primary">${reportData.reduce((sum, m) => sum + (m.price || 0), 0).toLocaleString('es-CL')}</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleExportCSV} variant="secondary" size="sm" className="flex items-center gap-2" disabled={reportData.length === 0}>
                                <Download size={16} /> CSV
                            </Button>
                            <Button onClick={handleExportPDF} variant="primary" size="sm" className="flex items-center gap-2" disabled={reportData.length === 0}>
                                <FileText size={16} /> Exportar PDF
                            </Button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-xl border border-accent">
                        <table className="w-full text-sm text-left text-text-main">
                            <thead className="text-xs text-primary uppercase bg-accent">
                                <tr>
                                    <th scope="col" className="px-6 py-4">Fecha</th>
                                    <th scope="col" className="px-6 py-4">Código Venta</th>
                                    <th scope="col" className="px-6 py-4">Descripción</th>
                                    <th scope="col" className="px-6 py-4">Ubicación</th>
                                    <th scope="col" className="px-6 py-4 text-right">Precio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-accent">
                                {reportData.length > 0 ? reportData.map(m => {
                                    const product = products.find(p => p.id_venta === m.productId);
                                    const location = locations.find(l => l.id === m.fromLocationId);
                                    return (
                                        <tr key={m.id} className="bg-white hover:bg-accent hover:bg-opacity-10 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-text-light">{new Date(m.timestamp).toLocaleString('es-CL')}</td>
                                            <td className="px-6 py-4 font-bold text-primary">{m.productId}</td>
                                            <td className="px-6 py-4 font-medium">{product?.description || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-accent rounded text-[10px] font-bold text-text-light uppercase">
                                                    {location?.name || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-text-main">{`$${(m.price || 0).toLocaleString('es-CL')}`}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-text-light">
                                            <div className="flex flex-col items-center gap-2 opacity-50">
                                                <FileText size={48} />
                                                <p>No se encontraron ventas para los criterios seleccionados.</p>
                                            </div>
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
