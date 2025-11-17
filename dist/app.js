"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path")); // 1. Importa el módulo 'path' de Node.js
const auth_routes_1 = require("./routes/auth.routes");
const products_routes_1 = require("./routes/products.routes");
const orders_routes_1 = require("./routes/orders.routes");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 2. Define la ruta a tu carpeta 'public' (el frontend)
// Usamos path.join para crear una ruta absoluta desde __dirname (la carpeta 'src')
// subiendo un nivel ('..') y entrando a 'public'.
const publicPath = path_1.default.join(__dirname, '..', 'public');
// 3. Sirve los archivos estáticos
// Esto le dice a Express que cualquier petición que coincida con un archivo
// en 'publicPath' (ej: /assets/index-CMHlxu4P.js) debe ser servida.
app.use(express_1.default.static(publicPath));
// 4. Rutas del API
// Tus rutas de API existentes.
app.use("/auth", auth_routes_1.authRouter);
app.use("/products", products_routes_1.productsRouter);
app.use("/orders", orders_routes_1.ordersRouter);
// 5. "Catch-all" para la SPA (Single Page Application)
// Esto es crucial para que Vue Router funcione.
// Debe ir DESPUÉS de tus rutas de API.
// Cualquier solicitud GET que no coincida con un archivo estático (paso 3)
// o una ruta de API (paso 4), será respondida con tu 'index.html'.
app.get(/.*/, (req, res) => {
    res.sendFile(path_1.default.join(publicPath, 'index.html'));
});
exports.default = app;
