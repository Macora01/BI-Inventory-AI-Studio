
import { ParsedInitialInventory, ParsedSale, ParsedTransfer } from '../types';

/**
 * Parsea un string CSV para la carga inicial de inventario.
 * @param {string} csvContent - El contenido en string del archivo CSV.
 * @returns {ParsedInitialInventory[]} Un array de objetos de inventario parseados.
 * @throws {Error} Si el contenido del CSV es inválido o tiene cabeceras incorrectas.
 */
export const parseInitialInventoryCSV = (csvContent: string): ParsedInitialInventory[] => {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const expectedHeaders = ['id_venta', 'price', 'cost', 'id_fabrica', 'qty', 'description'];

  // Valida que las cabeceras del archivo coincidan con las esperadas.
  if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
    throw new Error(`Cabeceras de CSV inválidas. Esperado: ${expectedHeaders.join(',')}, Recibido: ${headers.join(',')}`);
  }

  // Mapea cada línea del CSV a un objeto estructurado.
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      id_venta: values[0].trim(),
      price: parseInt(values[1].trim(), 10) || 0,
      cost: parseInt(values[2].trim(), 10) || 0,
      id_fabrica: values[3].trim(),
      qty: parseInt(values[4].trim(), 10) || 0,
      description: values[5].trim(),
    };
  });
};

/**
 * Parsea un string CSV para transferencias de productos desde la bodega principal a un depósito.
 * Formato de nombre de archivo: tras_bod_lugar_fecha.csv
 * @param {string} csvContent - El contenido en string del archivo CSV.
 * @returns {ParsedTransfer[]} Un array de objetos de transferencia parseados.
 * @throws {Error} Si el contenido del CSV es inválido o tiene cabeceras incorrectas.
 */
export const parseTransferCSV = (csvContent: string): ParsedTransfer[] => {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['cod_venta', 'description', 'precio', 'qty'];

    if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
        throw new Error(`Cabeceras de CSV de transferencia inválidas. Esperado: ${expectedHeaders.join(',')}, Recibido: ${headers.join(',')}`);
    }

    return lines.slice(1).map(line => {
        const values = line.split(',');
        return {
            cod_venta: values[0].trim(),
            description: values[1].trim(),
            precio: parseInt(values[2].trim(), 10) || 0,
            qty: parseInt(values[3].trim(), 10) || 0
        };
    });
};

/**
 * Parsea un string CSV para datos de ventas desde una ubicación específica.
 * Formato de nombre de archivo: lugar_AAMMDD.csv
 * @param {string} csvContent - El contenido en string del archivo CSV.
 * @returns {ParsedSale[]} Un array de objetos de venta parseados.
 * @throws {Error} Si el contenido del CSV es inválido o tiene cabeceras incorrectas.
 */
export const parseSalesCSV = (csvContent: string): ParsedSale[] => {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['timestamp', 'lugar', 'cod_fabrica', 'cod_venta', 'description', 'precio', 'qty'];
    
    if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
        throw new Error(`Cabeceras de CSV de ventas inválidas. Esperado: ${expectedHeaders.join(',')}, Recibido: ${headers.join(',')}`);
    }

    return lines.slice(1).map(line => {
        const values = line.split(',');
        return {
            timestamp: values[0].trim(),
            lugar: values[1].trim(),
            cod_fabrica: values[2].trim(),
            cod_venta: values[3].trim(),
            description: values[4].trim(),
            precio: parseInt(values[5].trim(), 10) || 0,
            qty: parseInt(values[6].trim(), 10) || 1,
        };
    });
};