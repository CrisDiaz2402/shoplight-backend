import { Request, Response } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { prisma } from "../utils/prisma";

// 1. Configurar Cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN!, // ¡Vital para el Lab!
  },
});

// 2. Configurar Multer (Memoria temporal)
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

// --- LÓGICA DE SUBIDA (CREATE) ---
export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No se subió imagen' });

    // Generar nombre único: productos/timestamp_nombre.jpg
    const fileName = `productos/${Date.now()}_${file.originalname.replace(/\s/g, '_')}`;
    
    // Subir a S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    // AQUÍ ESTÁ EL TRUCO: Devolvemos el "Key" (nombre), no una URL http.
    res.json({ 
        message: 'Subido exitosamente', 
        imageKey: fileName // Esto es lo que guardarás en la BD
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error subiendo a AWS' });
  }
};

// --- LÓGICA DE LECTURA HÍBRIDA (GET) ---
// Esta función auxiliar la usarás dentro de tu 'getProducts' existente
export const firmarUrlSiEsS3 = async (imagenUrl: string | null) => {
    if (!imagenUrl) return null;

    // Si empieza con http, es Cloudinary o web externa -> Devolver tal cual
    if (imagenUrl.startsWith('http')) {
        return imagenUrl;
    }

    // Si NO empieza con http, asumimos que es un Key de S3 -> Firmar URL
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: imagenUrl,
        });
        // Generar URL temporal válida por 1 hora (3600 seg)
        const urlFirmada = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return urlFirmada;
    } catch (error) {
        console.error("Error firmando URL S3:", error);
        return imagenUrl; // Fallback
    }
};