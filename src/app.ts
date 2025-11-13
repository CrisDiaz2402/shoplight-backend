import express from "express";
import cors from "cors";
import path from "path"; // <-- IMPORTANTE
import { authRouter } from "./routes/auth.routes";
import { productsRouter } from "./routes/products.routes";
import { ordersRouter } from "./routes/orders.routes";

const app = express();

app.use(cors());
app.use(express.json());

// --- SIRVE EL FRONTEND ESTÁTICO ---
// __dirname estará en 'dist', así que subimos un nivel a la raíz del proyecto
const frontendPath = path.join(__dirname, '..', 'public');
app.use(express.static(frontendPath));

// --- RUTAS DE LA API ---
app.use("/auth", authRouter);
app.use("/products", productsRouter);
app.use("/orders", ordersRouter);

// --- RUTA "CATCH-ALL" ---
// Esto es clave para Vue Router. Cualquier ruta que no sea API
// debe devolver el index.html para que Vue maneje la ruta.
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

export default app;