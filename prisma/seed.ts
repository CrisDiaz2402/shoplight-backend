import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "usuario1@gmail.com";
  const password = "usuario1";
  const name = "usuario1";

  const hashed = await bcrypt.hash(password, 10);

  // upsert para que el seed sea idempotente (usuario)
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hashed },
    create: { email, name, password: hashed },
  });

  console.log("Seed: usuario creado/actualizado:", { id: user.id, email: user.email });

  // Crear 2 categorías si no existen (idempotente, usa name como unique)
  const categories = [
    { name: "Iluminación", description: "Lámparas y accesorios de iluminación" },
    { name: "Electrónica", description: "Dispositivos electrónicos y accesorios" },
  ];

  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: { name: cat.name, description: cat.description },
    });
    console.log("Seed: categoría creada/actualizada:", { id: c.id, name: c.name });
  }

  // Mapear categorías por nombre a su id para asignarlas a los productos
  const categoryMap: Record<string, number> = {};
  for (const cat of categories) {
    const found = await prisma.category.findUnique({ where: { name: cat.name } });
    if (found) categoryMap[cat.name] = found.id;
  }

  // Productos iniciales (idempotente usando upsert por name)
  const products = [
    {
      name: 'Laptop Pro 15"',
      stock: 12,
      categoryName: 'Iluminación',
      description: 'Potente laptop para profesionales con procesador de última generación',
      price: 1299.99,
      imageUrl: 'https://res.cloudinary.com/dlezkbbxn/image/upload/v1762117963/laptop_af16gp.jpg',
    },
    {
      name: 'Auriculares Inalámbricos',
      stock: 25,
      categoryName: 'Iluminación',
      description: 'Auriculares con cancelación de ruido y sonido premium',
      price: 100.99,
      imageUrl: 'https://res.cloudinary.com/dlezkbbxn/image/upload/v1762117962/audifonos-inalambricos_tu1hmy.jpg',
    },
    {
      name: 'Smartwatch Fitness',
      stock: 0,
      categoryName: 'Iluminación',
      description: 'Reloj inteligente con monitor de salud y GPS integrado',
      price: 149.99,
      imageUrl: 'https://res.cloudinary.com/dlezkbbxn/image/upload/v1762117964/smartwatch_q7oxjv.jpg',
    },
    {
      name: 'Cámara DSLR',
      stock: 4,
      categoryName: 'Iluminación',
      description: 'Cámara profesional con lente de 24MP y grabación 4K',
      price: 899.99,
      imageUrl: 'https://res.cloudinary.com/dlezkbbxn/image/upload/v1762117962/camara_s1ynsg.jpg',
    },
    {
      name: 'Teclado Mecánico',
      stock: 18,
      categoryName: 'Electrónica',
      description: 'Teclado mecánico retroiluminado con switches táctiles',
      price: 49.99,
      imageUrl: 'https://res.cloudinary.com/dlezkbbxn/image/upload/v1762117966/teclado_sdzhhy.png',
    },
    {
      name: 'Monitor 27" 4K',
      stock: 7,
      categoryName: 'Iluminación',
      description: 'Monitor 4K con HDR y panel IPS para colores precisos',
      price: 299.99,
      imageUrl: 'https://res.cloudinary.com/dlezkbbxn/image/upload/v1762117963/monitor_bhmqz7.png',
    },
    {
      name: 'Smartphone X',
      stock: 5,
      categoryName: 'Iluminación',
      description: 'Smartphone con cámara múltiple y batería de larga duración',
      price: 999.0,
      imageUrl: 'https://res.cloudinary.com/dlezkbbxn/image/upload/v1762117962/celular_zosti8.jpg',
    },
    {
      name: 'Altavoz Bluetooth',
      stock: 30,
      categoryName: 'Electrónica',
      description: 'Altavoz portátil con sonido potente y resistencia al agua',
      price: 50.99,
      imageUrl: 'https://res.cloudinary.com/dlezkbbxn/image/upload/v1762117964/parlante_uwavas.jpg',
    },
  ];

  for (const p of products) {
    const categoryId = p.categoryName ? categoryMap[p.categoryName] ?? null : null;
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    let prod;
    if (existing) {
      prod = await prisma.product.update({
        where: { id: existing.id },
        data: {
          stock: p.stock,
          categoryId,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
        },
      });
    } else {
      prod = await prisma.product.create({
        data: {
          name: p.name,
          stock: p.stock,
          categoryId,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
        },
      });
    }
    console.log('Seed: producto creado/actualizado:', { id: prod.id, name: prod.name });
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });