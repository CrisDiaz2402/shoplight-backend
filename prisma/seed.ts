import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando el Seed...");

  // ==========================================
  // 1. CREACIÓN DEL ADMIN
  // ==========================================
  const adminPassword = await bcrypt.hash("admin", 10);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@shoplight.com" }, // Email ficticio para el admin
    update: {}, // Si existe, no hacemos cambios
    create: {
      email: "admin@shoplight.com",
      name: "admin",
      password: adminPassword,
      role: Role.admin, // <--- AQUÍ ASIGNAMOS EL ROL DE ADMIN
    },
  });
  console.log("👤 Admin garantizado:", { id: admin.id, email: admin.email, role: admin.role });

  // ==========================================
  // 2. CREACIÓN DE USUARIO CLIENTE (usuario1)
  // ==========================================
  const email = "usuario1@gmail.com";
  const password = "usuario1";
  const name = "usuario1";

  const hashed = await bcrypt.hash(password, 10);

  // Al no especificar 'role', Prisma usará el @default(client) definido en el schema
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hashed },
    create: { email, name, password: hashed },
  });

  console.log("👤 Usuario cliente garantizado:", { id: user.id, email: user.email, role: user.role });

  // ==========================================
  // 3. CATEGORÍAS
  // ==========================================
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
    console.log("📦 Categoría:", { id: c.id, name: c.name });
  }

  // Mapear categorías por nombre a su id para asignarlas a los productos
  const categoryMap: Record<string, number> = {};
  for (const cat of categories) {
    const found = await prisma.category.findUnique({ where: { name: cat.name } });
    if (found) categoryMap[cat.name] = found.id;
  }

  // ==========================================
  // 4. PRODUCTOS
  // ==========================================
  const products = [
    {
      name: 'Laptop Pro 15"',
      stock: 12,
      categoryName: 'Iluminación', // Nota: Quizás debería ser Electrónica, pero mantengo tu data
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
    
    // Buscamos si existe por nombre (ya que name no es @unique en tu schema actual)
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
    console.log(' Producto procesado:', { id: prod.id, name: prod.name });
  }

  console.log("Seed completado correctamente.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });