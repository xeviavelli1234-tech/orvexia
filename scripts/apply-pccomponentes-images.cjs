const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

function parseUpdatesFromTs(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const updates = [];

  const blockRe = /slug:\s*"([^"]+)"[\s\S]*?images:\s*\[([\s\S]*?)\]\s*,?\s*}/g;
  let blockMatch;
  while ((blockMatch = blockRe.exec(src)) !== null) {
    const slug = blockMatch[1];
    const imagesBlock = blockMatch[2];
    const images = [];

    const imageRe = /"([^"]+)"/g;
    let imageMatch;
    while ((imageMatch = imageRe.exec(imagesBlock)) !== null) {
      images.push(imageMatch[1]);
    }

    if (images.length > 0) updates.push({ slug, images });
  }

  return updates;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no encontrada en .env.local/.env");
  }

  const sourceFile = path.join(__dirname, "update-images-pccomponentes.ts");
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`No existe ${sourceFile}`);
  }

  const updates = parseUpdatesFromTs(sourceFile);
  if (updates.length === 0) {
    throw new Error("No se pudieron extraer updates del archivo TS");
  }

  const client = new Client({ connectionString });
  await client.connect();

  let updated = 0;
  let missing = 0;

  try {
    for (const { slug, images } of updates) {
      const result = await client.query(
        `UPDATE "Product"
         SET "image" = $1, "images" = $2::text[]
         WHERE "slug" = $3`,
        [images[0], images, slug]
      );

      if (result.rowCount > 0) {
        updated += result.rowCount;
        console.log(`OK  ${slug} -> ${images.length} imagenes`);
      } else {
        missing += 1;
        console.log(`MISS ${slug}`);
      }
    }
  } finally {
    await client.end();
  }

  console.log(`\nResumen: ${updated} actualizados, ${missing} no encontrados, ${updates.length} intentados.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

