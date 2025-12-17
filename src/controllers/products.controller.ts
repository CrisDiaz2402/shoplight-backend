import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// --- 1. CONFIGURACIÓN DEL CLIENTE S3 ---
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || "", // Vital para el Lab
  },
});

// --- 2. FUNCIÓN AUXILIAR PARA FIRMAR URLS ---
// Esta función decide: Si es link http (Cloudinary) -> Lo deja pasar.
// Si es una Key de S3 (texto simple) -> Genera URL firmada.
const procesarImagenUrl = async (imageUrl: string | null | undefined) => {
  if (!imageUrl) return null;

  // Si ya es un link completo (ej: Cloudinary o una imagen de internet), no hacemos nada
  if (imageUrl.startsWith("http") || imageUrl.startsWith("https")) {
    return imageUrl;
  }

  // Si no empieza con http, asumimos que es un KEY de S3 (ej: "productos/foto1.jpg")
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: imageUrl,
    });
    // Generamos una URL temporal válida por 1 hora (3600 segundos)
    const urlFirmada = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return urlFirmada;
  } catch (error) {
    console.error(`Error firmando imagen S3 (${imageUrl}):`, error);
    return imageUrl; // En caso de error, devolvemos el string original
  }
};

// --- CONTROLADORES ---

export const getProducts = async (req: Request, res: Response) => {
  try {
    // 1. Obtenemos los productos "crudos" de la BD
    const productsRaw = (await prisma.product.findMany({
      include: { /* @ts-ignore */ category: true } as any,
      orderBy: { createdAt: 'desc' },
    })) as any[];

    // 2. Procesamos cada producto para firmar su imagen si es necesario
    // Usamos Promise.all porque 'procesarImagenUrl' es asíncrona
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

    // Procesamos la imagen del producto individual
    product.imageUrl = await procesarImagenUrl(product.imageUrl);

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo el producto" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    // Nota: Aquí 'imageUrl' vendrá con el KEY de S3 (ej: "productos/123_foto.jpg")
    // que el frontend envió tras subir el archivo al endpoint de carga.
    const { name, description, price, imageUrl, stock, categoryId } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: "Faltan campos: name y price son requeridos" });
    }

    const stockValue = Number.isInteger(stock) ? stock : 0;
    
    const data: any = { 
        name, 
        description, 
        price: Number(price), 
        imageUrl, // Guardamos el Key (o URL) tal cual viene
        stock: stockValue 
    };

    if (categoryId != null) data.categoryId = Number(categoryId);

    const product = await prisma.product.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
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
    
    // Si actualizan la imagen, guardamos el nuevo Key
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    
    if (stock != null) updateData.stock = Number(stock);
    if (categoryId !== undefined) updateData.categoryId = categoryId ? Number(categoryId) : null;

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
      include: { category: true } as any,
    }) as any;

    // Opcional: Devolver la URL firmada en la respuesta del update para que el front la vea al instante
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

    // Nota: Idealmente, aquí también deberíamos borrar la imagen de S3
    // usando DeleteObjectCommand con el Key guardado en BD, 
    // pero para este proyecto no es estrictamente obligatorio si quieres simplificar.
    
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