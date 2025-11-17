"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Poner esto PRIMERO
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Poner los otros imports DESPUÉS
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 3000;
app_1.default.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
