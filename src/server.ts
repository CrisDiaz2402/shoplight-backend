// Poner esto PRIMERO
import dotenv from "dotenv";
dotenv.config();

// Poner los otros imports DESPUÉS
import app from "./app";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});