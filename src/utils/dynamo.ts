import { DynamoDBClient } from "@aws-sdk/client-dynamodb"; 
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"; 

// 1. Inicializar Cliente (Reutiliza credenciales del .env)
const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || "us-east-1", 
  credentials: { 
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "", 
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "", 
    sessionToken: process.env.AWS_SESSION_TOKEN || "", 
  },
});

// El DocumentClient nos permite trabajar con objetos JSON nativos de JavaScript [cite: 210]
const docClient = DynamoDBDocumentClient.from(client); 

const TABLE_NAME = "shoplight-audit-logs"; 

/**
 * Guarda un registro de auditoría cuando se completa una venta 
 */
export const registrarAuditoriaVenta = async (userId: number, orderId: number, total: number) => { 
  try {
    const logEntry = { 
      id: `ORDER-${orderId}-${Date.now()}`, // ID único combinando orden y tiempo 
      tipo: "VENTA_COMPLETADA", 
      timestamp: new Date().toISOString(), 
      detalles: { 
        usuario: userId, 
        monto: total, 
        estado: "EXITOSO" 
      }
    };

    const command = new PutCommand({ 
      TableName: TABLE_NAME, 
      Item: logEntry, 
    });

    await docClient.send(command); 
    console.log(`✅ Auditoría guardada en DynamoDB para Orden #${orderId}`); 

  } catch (error) { 
    console.error("❌ Error guardando en DynamoDB:", error); 
    // No lanzamos error para no interrumpir el flujo principal de la venta si falla el log 
  }
};

/**
 * Recupera todos los registros de auditoría de la tabla (Vista Kardex)
 * Nota: ScanCommand es adecuado para tablas pequeñas en entornos de laboratorio.
 */
export const obtenerLogsAuditoria = async () => {
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
    });

    const response = await docClient.send(command);
    const items = response.Items || [];

    // Ordenamos los logs por timestamp de forma descendente (más recientes primero)
    return items.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  } catch (error) {
    console.error("❌ Error obteniendo logs de DynamoDB:", error);
    throw error; // Lanzamos el error para que el controlador pueda responder con un 500
  }
};