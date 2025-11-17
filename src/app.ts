import express from "express";
import cors from "cors";
import path from "path"; // 1. Importa el módulo 'path' de Node.js
import { authRouter } from "./routes/auth.routes";
import { productsRouter } from "./routes/products.routes";
import { ordersRouter } from "./routes/orders.routes";

const app = express();

app.use(cors());
app.use(express.json());

// 2. Define la ruta a tu carpeta 'public' (el frontend)
// Usamos path.join para crear una ruta absoluta desde __dirname (la carpeta 'src')
// subiendo un nivel ('..') y entrando a 'public'.
const publicPath = path.join(__dirname, '..', 'public');

// 3. Sirve los archivos estáticos
// Esto le dice a Express que cualquier petición que coincida con un archivo
// en 'publicPath' (ej: /assets/index-CMHlxu4P.js) debe ser servida.
app.use(express.static(publicPath));

// 4. Rutas del API
// Tus rutas de API existentes.
app.use("/auth", authRouter);
app.use("/products", productsRouter);
app.use("/orders", ordersRouter);

// 5. "Catch-all" para la SPA (Single Page Application)
// Esto es crucial para que Vue Router funcione.
// Debe ir DESPUÉS de tus rutas de API.
// Cualquier solicitud GET que no coincida con un archivo estático (paso 3)
// o una ruta de API (paso 4), será respondida con tu 'index.html'.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

export default app;