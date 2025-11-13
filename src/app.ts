import express from "express";
import cors from "cors";
import path from "path"; // <-- 1. Importa 'path'
import { authRouter } from "./routes/auth.routes";
import { productsRouter } from "./routes/products.routes";
import { ordersRouter } from "./routes/orders.routes";

const app = express();

app.use(cors());
app.use(express.json());

// --- 2. Sirve los archivos estáticos del Frontend ---
// Le dice a Express que sirva los archivos de la carpeta 'public'
const frontendPath = path.join(__dirname, '..', 'public');
app.use(express.static(frontendPath));

// --- 3. Rutas de la API ---
app.use("/auth", authRouter);
app.use("/products", productsRouter);
app.use("/orders", ordersRouter);

// --- 4. Ruta "Catch-All" ---
// Esto es para que Vue Router funcione.
// Cualquier ruta GET que no sea una API, servirá tu app de Vue (index.html).
app.get("*", (req, res) => {
res.sendFile(path.join(frontendPath, 'index.html'));
});

export default app;