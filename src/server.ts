import dotenv from "dotenv";
dotenv.config();

import app from "./app";
// 1. IMPORTAR EL WORKER
import { startOrderWorker } from "./workers/orderWorker";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  
  // 2. ARRANCAR EL WORKER
  // Se ejecuta en segundo plano sin bloquear las peticiones de los usuarios
  startOrderWorker();
});