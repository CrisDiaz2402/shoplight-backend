import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// 1. Inicializar Cliente SNS (Reutiliza tus credenciales del .env)
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "", 
  },
});

// 2. Función para notificar Stock Bajo (Reemplaza a la notificación de venta)
export const notificarStockBajo = async (productName: string, currentStock: number) => {
  try {
    const topicArn = process.env.SNS_TOPIC_ARN;
    
    if (!topicArn) {
      console.warn("SNS_TOPIC_ARN no está configurado. No se envió alerta.");
      return;
    }

    // Mensaje de alerta crítica de inventario
    const mensaje = `
 ⚠️ ALERTA DE STOCK BAJO ⚠️
 
 El producto "${productName}" ha alcanzado un nivel crítico de inventario.
 Stock actual: ${currentStock} unidades.

 Se requiere reabastecimiento inmediato.
    `;

    const params = {
      Message: mensaje,
      Subject: `Alerta: Stock Bajo - ${productName}`, // Asunto claro para el correo
      TopicArn: topicArn,
    };

    const command = new PublishCommand(params);
    await snsClient.send(command);
    
    console.log(`✅ [SNS] Alerta de stock bajo enviada para: ${productName}`);

  } catch (error) {
    console.error("❌ Error enviando alerta SNS:", error);
  }
};