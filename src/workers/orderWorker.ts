import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { prisma } from "../utils/prisma";

// El cliente usará las mismas credenciales que ya configuraste para S3/SNS
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-1" });

export const startOrderWorker = () => {
  const queueUrl = process.env.SQS_QUEUE_URL;

  if (!queueUrl) {
    console.log("⚠️ [SQS Worker] No hay URL de cola. El worker no iniciará.");
    return;
  }

  console.log("👷 [SQS Worker] Iniciado. Esperando pedidos para procesar...");

  // Revisar la cola periódicamente (cada 20 segundos para no saturar)
  setInterval(async () => {
    try {
      const response = await sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10 // Long Polling: espera hasta 10s si la cola está vacía
      }));

      if (response.Messages && response.Messages.length > 0) {
        for (const message of response.Messages) {
          const body = JSON.parse(message.Body || "{}");
          const orderId = body.orderId;

          if (orderId) {
            console.log(`📦 [SQS Worker] Pedido #${orderId} recibido de la cola.`);
            console.log(`⏳ [SQS Worker] Iniciando simulación de logística (Espera de 30s)...`);

            // --- SOLUCIÓN IMPLEMENTADA: RETRASO ARTIFICIAL ---
            // Esto pausa el proceso por 30 segundos antes de tocar la base de datos.
            // Durante este tiempo, en el frontend verás el estado como "Pendiente".
            await new Promise(resolve => setTimeout(resolve, 30000));

            // SIMULACIÓN REAL: Ahora sí cambiamos el estado en la base de datos
            await prisma.order.update({
              where: { id: Number(orderId) },
              data: { status: "PROCESADO" }
            });

            console.log(`✅ [SQS Worker] Pedido #${orderId} actualizado a PROCESADO tras la espera.`);

            // IMPORTANTE: Borrar el mensaje de la cola para que no se procese otra vez
            await sqsClient.send(new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle!
            }));
          }
        }
      }
    } catch (error) {
      console.error("❌ [SQS Worker] Error:", error);
    }
  }, 20000); // El intervalo general se ejecuta cada 20 segundos
};