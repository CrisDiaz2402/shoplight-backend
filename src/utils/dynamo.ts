import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// 1. Inicializar Cliente (Reutiliza credenciales del .env)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "", 
  },
});

// El DocumentClient nos deja guardar JSON directo sin convertir tipos de datos raros
const docClient = DynamoDBDocumentClient.from(client);

export const registrarAuditoriaVenta = async (userId: number, orderId: number, total: number) => {
  try {
    const TABLE_NAME = "shoplight-audit-logs"; // Asegúrate de que coincida con lo que creaste

    const logEntry = {
      id: `ORDER-${orderId}-${Date.now()}`, // ID único
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
    // No lanzamos error para no detener la venta
  }
};