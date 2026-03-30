
import { GoogleGenAI, Type } from "@google/genai";
import { Movement, Product, Stock } from "../types";

// Se asegura de que la clave API esté disponible en las variables de entorno.
if (!process.env.API_KEY) {
  // En una aplicación real, se podría manejar esto de forma más elegante.
  // Para este ejemplo, lanzamos un error en la consola si falta la clave.
  console.error("La variable de entorno API_KEY no está configurada.");
}

// Inicializa el cliente de la API de Google GenAI con la clave API.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analiza los datos de inventario para generar insights ejecutivos usando Gemini Pro.
 * @param {Product[]} products - La lista de todos los productos.
 * @param {Stock[]} stock - Los niveles de stock actuales para todos los productos y ubicaciones.
 * @param {Movement[]} movements - Un historial de todos los movimientos de inventario.
 * @returns {Promise<string>} Un string que contiene el análisis generado por la IA en formato JSON.
 */
export const analyzeInventoryData = async (
  products: Product[],
  stock: Stock[],
  movements: Movement[]
): Promise<string> => {
  
  // Se utiliza el modelo recomendado para tareas complejas de texto.
  const model = 'gemini-2.5-pro';

  // Prepara un resumen de los datos para enviar al modelo.
  // No se envían todos los datos para evitar exceder los límites de tokens; se envían datos agregados.
  const topSellingProducts = movements
    .filter(m => m.type === 'SALE')
    .reduce((acc, m) => {
      acc[m.productId] = (acc[m.productId] || 0) + m.quantity;
      return acc;
    }, {} as Record<string, number>);

  const sortedTopSellers = Object.entries(topSellingProducts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([productId, quantity]) => ({ productId, quantity }));

  const lowStockProducts = stock
    .filter(s => s.quantity <= (s.criticalStock || 5))
    .slice(0, 10);

  const dataSummary = {
    totalProducts: products.length,
    totalStockItems: stock.reduce((sum, s) => sum + s.quantity, 0),
    totalMovements: movements.length,
    topSellingProducts: sortedTopSellers,
    lowStockProducts,
  };

  const prompt = `
    Eres un analista experto en gestión de inventario para una marca llamada "Boa Ideia".
    Analiza el siguiente resumen de datos de inventario y proporciona un informe ejecutivo.
    
    El informe debe ser conciso y directo, orientado a un gerente.
    Quiero que la respuesta esté en formato JSON. El esquema JSON debe ser un array de objetos, donde cada objeto tiene los campos "title", "insight" y "recommendation".
    
    Aquí están los datos:
    ${JSON.stringify(dataSummary, null, 2)}

    Genera 3-4 insights clave. Por ejemplo:
    - Identifica los productos de mayor venta y sugiere estrategias.
    - Señala los productos con bajo stock y recomienda acciones de reposición.
    - Menciona cualquier tendencia o patrón interesante que observes.
    - Proporciona una visión general del estado del inventario.
  `;
    
  try {
    // Llama a la API de Gemini para generar contenido.
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: 'El título del insight.',
                        },
                        insight: {
                            type: Type.STRING,
                            description: 'La observación o el dato clave encontrado.',
                        },
                        recommendation: {
                            type: Type.STRING,
                            description: 'La acción recomendada basada en el insight.',
                        }
                    }
                }
            }
        }
    });

    // Retorna el texto de la respuesta, que debería ser el JSON solicitado.
    return response.text;
  } catch (error) {
    console.error("Error al llamar a la API de Gemini:", error);
    // En caso de error, retorna un objeto JSON con un mensaje de error.
    return JSON.stringify([{
        title: "Error de Análisis",
        insight: "No se pudo conectar con el servicio de inteligencia artificial para generar el análisis.",
        recommendation: "Por favor, verifique la configuración de la API key y la conexión a internet. Si el problema persiste, contacte a soporte."
    }]);
  }
};