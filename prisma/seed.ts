import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

const hoursFromNow = (hours: number): Date =>
  new Date(Date.now() + hours * 60 * 60 * 1000);

const image = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/800/600`;

async function main(): Promise<void> {
  await prisma.bid.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash("Admin123!", 10);
  const userHash = await bcrypt.hash("User12345", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@bidhub.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const [ana, carlos, lucia, mateo] = await Promise.all(
    [
      { name: "Ana Torres", email: "ana@bidhub.com" },
      { name: "Carlos Mejía", email: "carlos@bidhub.com" },
      { name: "Lucía Ramos", email: "lucia@bidhub.com" },
      { name: "Mateo Pérez", email: "mateo@bidhub.com" },
    ].map((u) => prisma.user.create({ data: { ...u, passwordHash: userHash } }))
  );

  const [cartas, relojes, vinilos, figuras] = await Promise.all(
    [
      { name: "Cartas", slug: "cartas" },
      { name: "Relojes", slug: "relojes" },
      { name: "Vinilos", slug: "vinilos" },
      { name: "Figuras", slug: "figuras" },
    ].map((c) => prisma.category.create({ data: c }))
  );

  // ACTIVA con ofertas
  await prisma.auction.create({
    data: {
      title: "Carta Charizard primera edición",
      description: "Carta en excelente estado, con funda protectora.",
      imageUrl: image("charizard"),
      initialPrice: 500,
      minIncrement: 25,
      closesAt: hoursFromNow(48),
      sellerId: ana.id,
      categoryId: cartas.id,
      bids: {
        create: [
          { amount: 500, bidderId: lucia.id, createdAt: hoursFromNow(-6) },
          { amount: 525, bidderId: mateo.id, createdAt: hoursFromNow(-2) },
        ],
      },
    },
  });

  // ACTIVA sin ofertas
  await prisma.auction.create({
    data: {
      title: "Reloj Casio vintage",
      description: "Reloj digital de los 90, funcionando perfectamente.",
      imageUrl: image("casio"),
      initialPrice: 80,
      minIncrement: 5,
      closesAt: hoursFromNow(120),
      sellerId: carlos.id,
      categoryId: relojes.id,
    },
  });

  // ACTIVA sin ofertas
  await prisma.auction.create({
    data: {
      title: "Vinilo The Dark Side of the Moon",
      description: "Edición de colección, portada sin marcas.",
      imageUrl: image("darkside"),
      initialPrice: 60,
      minIncrement: 5,
      closesAt: hoursFromNow(72),
      sellerId: ana.id,
      categoryId: vinilos.id,
    },
  });

  // CERRADA con ofertas (gana Lucía)
  await prisma.auction.create({
    data: {
      title: "Figura Optimus Prime 1984",
      description: "Figura original, completa y con caja.",
      imageUrl: image("optimus"),
      initialPrice: 80,
      minIncrement: 10,
      createdAt: hoursFromNow(-120),
      closesAt: hoursFromNow(-24),
      sellerId: carlos.id,
      categoryId: figuras.id,
      bids: {
        create: [
          { amount: 80, bidderId: lucia.id, createdAt: hoursFromNow(-72) },
          { amount: 95, bidderId: mateo.id, createdAt: hoursFromNow(-48) },
          { amount: 110, bidderId: lucia.id, createdAt: hoursFromNow(-30) },
        ],
      },
    },
  });

  // DESIERTA (cerró sin ofertas)
  await prisma.auction.create({
    data: {
      title: "Vinilo Abbey Road",
      description: "Edición original en buen estado.",
      imageUrl: image("abbeyroad"),
      initialPrice: 70,
      minIncrement: 5,
      createdAt: hoursFromNow(-96),
      closesAt: hoursFromNow(-24),
      sellerId: ana.id,
      categoryId: vinilos.id,
    },
  });

  // CANCELADA por el vendedor (sin ofertas)
  await prisma.auction.create({
    data: {
      title: "Reloj Seiko automático",
      description: "Publicación cancelada por el vendedor.",
      imageUrl: image("seiko"),
      initialPrice: 150,
      minIncrement: 10,
      closesAt: hoursFromNow(96),
      isCancelled: true,
      sellerId: carlos.id,
      categoryId: relojes.id,
    },
  });

  // CANCELADA por el administrador (con ofertas y motivo)
  await prisma.auction.create({
    data: {
      title: "Carta Pikachu holográfica",
      description: "Cancelada por moderación.",
      imageUrl: image("pikachu"),
      initialPrice: 200,
      minIncrement: 20,
      closesAt: hoursFromNow(60),
      isCancelled: true,
      cancelReason: "Se sospecha que la carta es falsificada",
      sellerId: ana.id,
      categoryId: cartas.id,
      bids: {
        create: [
          { amount: 200, bidderId: mateo.id, createdAt: hoursFromNow(-10) },
        ],
      },
    },
  });

  console.log(`Seed completado. Admin: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());