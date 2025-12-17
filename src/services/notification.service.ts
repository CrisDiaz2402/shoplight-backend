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

// 2. Función para notificar nueva venta
export const notificarVentaAdmin = async (orderId: number, total: number, itemsCount: number) => {
  try {
    const topicArn = process.env.SNS_TOPIC_ARN;
    if (!topicArn) {
      console.warn("SNS_TOPIC_ARN no está configurado. No se envió alerta.");
      return;
    }

    // Mensaje que le llegará al admin
    const mensaje = `
 ¡Nueva Venta en ShopLight!
 Total: $${total}
 Items: ${itemsCount}
 Orden ID: #${orderId}

Revisa el panel administrativo para más detalles.
    `;

    const params = {
      Message: mensaje,
      Subject: "Alerta de Venta - ShopLight",
      TopicArn: topicArn,
    };

    const command = new PublishCommand(params);
    await snsClient.send(command);
    
    console.log(`Alerta SNS enviada por Orden #${orderId}`);
  } catch (error) {
    console.error("Error enviando alerta SNS:", error);
    // No lanzamos el error para no interrumpir la venta si falla la notificación
  }
};