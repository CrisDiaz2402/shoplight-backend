import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
// --- AWS SDK IMPORTS ---
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// Importamos Rekognition para la IA
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";

// --- 1. CONFIGURACIÓN DEL CLIENTE S3 ---
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "", 
  },
});

// --- 2. CONFIGURACIÓN DEL CLIENTE REKOGNITION ---
const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "", 
  },
});

// --- 3. FUNCIÓN AUXILIAR PARA FIRMAR URLS ---
const procesarImagenUrl = async (imageUrl: string | null | undefined) => {
  if (!imageUrl) return null;

  // Si ya es un link completo (ej: Cloudinary o una imagen de internet), no hacemos nada
  if (imageUrl.startsWith("http") || imageUrl.startsWith("https")) {
    return imageUrl;
  }

  // Si no empieza con http, asumimos que es un KEY de S3
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME, // Asegúrate de tener esto en tu .env
      Key: imageUrl,
    });
    // Generamos una URL temporal válida por 1 hora
    const urlFirmada = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return urlFirmada;
  } catch (error) {
    console.error(`Error firmando imagen S3 (${imageUrl}):`, error);
    return imageUrl;
  }
};

// --- CONTROLADORES ---

export const getProducts = async (req: Request, res: Response) => {
  try {
    const productsRaw = (await prisma.product.findMany({
      include: { /* @ts-ignore */ category: true } as any,
      orderBy: { createdAt: 'desc' },
    })) as any[];

    const productsProcessed = await Promise.all(
      productsRaw.map(async (prod) => {
        return {
          ...prod,
          imageUrl: await procesarImagenUrl(prod.imageUrl),
        };
      })
    );

    res.json(productsProcessed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo productos" });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = (await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { /* @ts-ignore */ category: true } as any,
    })) as any;

    if (!product) return res.status(404).json({ error: "Producto no encontrado" });

    product.imageUrl = await procesarImagenUrl(product.imageUrl);

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo el producto" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    // imageUrl aquí es el KEY de S3 (ej: "zapatos/nike.jpg")
    const { name, description, price, imageUrl, stock, categoryId } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: "Faltan campos: name y price son requeridos" });
    }

    let detectedTags: string[] = [];

    // --- INTEGRACIÓN REKOGNITION (IA) ---
    // Si tenemos una imagen (Key de S3), la analizamos antes de guardar
    if (imageUrl && !imageUrl.startsWith("http")) {
       console.log(`[Rekognition] Iniciando análisis para: ${imageUrl}`);
       
       try {
         const command = new DetectLabelsCommand({
           Image: {
             S3Object: {
               Bucket: process.env.S3_BUCKET_NAME,
               Name: imageUrl // El Key del archivo en S3
             }
           },
           MaxLabels: 5,     // Top 5 etiquetas
           MinConfidence: 80 // Confianza mínima 80%
         });

         const response = await rekognition.send(command);
         
         // Extraemos los nombres de las etiquetas
         detectedTags = response.Labels?.map(label => label.Name || "") || [];
         console.log(`[Rekognition] Etiquetas encontradas: ${detectedTags.join(", ")}`);

       } catch (rekError) {
         console.error("[Rekognition] Error al analizar imagen (continuando sin tags):", rekError);
         // No fallamos la request completa si la IA falla, solo logueamos el error
       }
    }

    const stockValue = Number.isInteger(stock) ? stock : 0;
    
    // Preparar objeto de datos para Prisma
    const data: any = { 
        name, 
        description: description || "", // Descripción original limpia
        price: Number(price), 
        imageUrl, 
        stock: stockValue,
        // Guardamos los tags en su propia columna (Array de Strings)
        // Si no hay tags, guardamos array vacío []
        aiTags: detectedTags 
    };

    if (categoryId != null) data.categoryId = Number(categoryId);

    const product = await prisma.product.create({
      data: data as any,
    });

    // Devolvemos el producto completo (Prisma ya incluye 'aiTags' en el objeto 'product')
    res.status(201).json(product);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear producto" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, imageUrl, stock, categoryId } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price != null) updateData.price = Number(price);
    
    // Si actualizan la imagen, guardamos el nuevo Key
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    
    if (stock != null) updateData.stock = Number(stock);
    if (categoryId !== undefined) updateData.categoryId = categoryId ? Number(categoryId) : null;

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
      include: { category: true } as any,
    }) as any;

    product.imageUrl = await procesarImagenUrl(product.imageUrl);

    res.json(product);
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(500).json({ error: "Error al actualizar producto", details: err?.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id: Number(id) },
    });

    res.json({ success: true, message: "Producto eliminado correctamente" });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(500).json({ error: "Error al eliminar producto", details: err?.message });
  }
};