"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const prisma_1 = require("../utils/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: "Faltan campos: email, password y name son requeridos" });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { email, password: hashed, name },
        });
        // No devolver el password al cliente
        const safeUser = { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt };
        return res.status(201).json({ success: true, message: "Usuario registrado correctamente", user: safeUser });
    }
    catch (err) {
        console.error(err);
        if ((err === null || err === void 0 ? void 0 : err.code) === "P2002") {
            return res.status(400).json({ success: false, message: "El email ya está registrado" });
        }
        res.status(500).json({ success: false, message: "Error al registrar usuario" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ success: false, message: "Usuario no encontrado" });
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: "2h",
        });
        // No devolver el password al cliente
        const safeUser = { id: user.id, email: user.email, name: user.name };
        res.json({ success: true, message: "Inicio de sesión exitoso", token, user: safeUser });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error al iniciar sesión" });
    }
};
exports.login = login;
