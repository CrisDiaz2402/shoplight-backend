import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
// --- AWS SDK IMPORTS ---
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// Importamos Rekognition para la IA
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
// --- NUEVA LIBRERÍA DE TRADUCCIÓN ---
import { translate } from 'google-translate-api-x';

// --- 1. CONFIGURACIÓN DEL CLIENTE S3 --- [cite: 120]
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "", 
  },
});

// --- 2. CONFIGURACIÓN DEL CLIENTE REKOGNITION --- [cite: 121]
const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "", 
  },
});

// --- 3. FUNCIÓN AUXILIAR PARA FIRMAR URLS --- [cite: 123]
const procesarImagenUrl = async (imageUrl: string | null | undefined) => {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("http") || imageUrl.startsWith("https")) {
    return imageUrl;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: imageUrl,
    });
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
    const { search } = req.query;
    let productsRaw: any[];

    if (search) {
      const query = `%${String(search).trim()}%`;
      
      // SQL Nativo para búsqueda parcial en arreglos de PostgreSQL
      // El operador ILIKE busca coincidencias parciales sin importar mayúsculas
      productsRaw = await prisma.$queryRaw`
        SELECT p.* FROM "Product" p
        WHERE p.name ILIKE ${query}
           OR p.description ILIKE ${query}
           OR EXISTS (
              SELECT 1 FROM unnest(p."aiTags") AS tag 
              WHERE tag ILIKE ${query}
           )
        ORDER BY p."createdAt" DESC
      `;
    } else {
      // Si no hay búsqueda, usamos findMany estándar [cite: 130]
      productsRaw = (await prisma.product.findMany({
        include: { /* @ts-ignore */ category: true } as any,
        orderBy: { createdAt: 'desc' },
      })) as any[];
    }

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
    console.error("Error en getProducts:", error);
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
    const { name, description, price, imageUrl, stock, categoryId } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: "Faltan campos: name y price son requeridos" });
    }

    let detectedTags: string[] = [];

    // --- INTEGRACIÓN REKOGNITION (IA) --- [cite: 140, 141]
    if (imageUrl && !imageUrl.startsWith("http")) {
       console.log(`[Rekognition] Iniciando análisis para: ${imageUrl}`);
       
       try {
         const command = new DetectLabelsCommand({
           Image: { S3Object: { Bucket: process.env.S3_BUCKET_NAME, Name: imageUrl } },
           MaxLabels: 5,
           MinConfidence: 80
         });

         const response = await rekognition.send(command);
         const englishTags = response.Labels?.map(label => label.Name || "") || [];
         console.log(`[Rekognition] Etiquetas originales (EN): ${englishTags.join(", ")}`);

         // --- TRADUCCIÓN DE ETIQUETAS (Google Translate) --- [cite: 143, 144]
         if (englishTags.length > 0) {
            try {
                const resTranslate = await translate(englishTags.join(", "), { 
                    from: 'en', 
                    to: 'es' 
                });
                
                detectedTags = resTranslate.text.split(",").map(t => t.trim());
                console.log(`[Translate] Éxito: ${detectedTags.join(", ")}`);
            } catch (transError) {
                console.error("❌ [Google Translate] Error, usando inglés como fallback:", transError);
                detectedTags = englishTags;
            }
         }

       } catch (rekError) {
         console.error("❌ [Rekognition] Error al analizar imagen:", rekError);
       }
    }

    const stockValue = Number.isInteger(stock) ? stock : 0;
    
    console.log("==========================================");
    console.log("🛠️  VERIFICACIÓN PREVIA A GUARDADO BD 🛠️");
    console.log(`📦 Producto: ${name}`);
    console.log(`🏷️  Etiquetas Finales (aiTags):`, detectedTags);
    console.log("==========================================");
    
    const product = await prisma.product.create({
      data: { 
        name, 
        description: description || "",
        price: Number(price), 
        imageUrl, 
        stock: stockValue,
        aiTags: detectedTags,
        categoryId: categoryId ? Number(categoryId) : null
      } as any,
    });

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
    if (err?.code === "P2025") return res.status(404).json({ error: "Producto no encontrado" });
    res.status(500).json({ error: "Error al actualizar producto", details: err?.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ success: true, message: "Producto eliminado correctamente" });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2025") return res.status(404).json({ error: "Producto no encontrado" });
    res.status(500).json({ error: "Error al eliminar producto", details: err?.message });
  }
};