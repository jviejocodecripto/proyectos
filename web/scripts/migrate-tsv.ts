import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';
import * as path from 'path';

interface TsvRow {
  name: string;
  email: string;
  course: string;
  edition: string;
  videoUrl: string;
  githubUrl: string;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'proyectos';

function extractGithubRepoUrl(url: string): string | null {
  if (!url || url.trim() === '') return null;

  // Si es una URL de GitHub, extraer el repo base
  const githubMatch = url.match(
    /https:\/\/github\.com\/([\w-]+)\/([\w.-]+)/
  );
  if (githubMatch) {
    return `https://github.com/${githubMatch[1]}/${githubMatch[2]}`;
  }

  return null;
}

function parseVideoUrl(url: string): string | null {
  if (!url || url.trim() === '') return null;

  // Limpiar la URL
  url = url.trim();

  // Si contiene "sharingbien" es un error de parseo del TSV
  if (url.includes('sharingbien')) {
    url = url.split('sharingbien')[0].trim();
  }

  // Si termina con punto, quitarlo
  if (url.endsWith('.')) {
    url = url.slice(0, -1);
  }

  // Verificar si es una URL válida de video
  const videoPatterns = [
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/,
    /^https?:\/\/(www\.)?vimeo\.com\/.+$/,
    /^https?:\/\/(www\.)?loom\.com\/.+$/,
    /^https?:\/\/(www\.)?drive\.google\.com\/.+$/,
    /^https?:\/\/(www\.)?dropbox\.com\/.+$/,
    /^https?:\/\/github\.com\/.+\.(mp4|mov|avi|webm)$/i, // Videos en GitHub
    /^https?:\/\/github\.com\/.+\/blob\/.+\/media\/.+$/i, // Carpeta media en GitHub
    /^https?:\/\/github\.com\/.+\/tree\/.+\/video$/i // Carpeta video en GitHub
  ];

  if (videoPatterns.some((pattern) => pattern.test(url))) {
    return url;
  }

  return null;
}

function parseTsvFile(filePath: string): TsvRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const rows: TsvRow[] = [];

  // Saltar el header (línea 1)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split('\t');

    // Estructura: ALUMNO EMAIL EDICION PFM ALUMNO(duplicado) VIDEO Comentarios
    // Índices:     0      1     2       3   4                5      6
    const name = columns[0]?.trim();
    const email = columns[1]?.trim();
    const course = columns[2]?.trim();
    const edition = columns[3]?.trim();
    const videoUrl = columns[6]?.trim() || '';

    if (!name || !email) continue;

    // Extraer URL de GitHub del video si está allí, o buscar en otras columnas
    let githubUrl = extractGithubRepoUrl(videoUrl);
    const cleanVideoUrl = parseVideoUrl(videoUrl);

    // Si no hay videoUrl válida, intentar buscar GitHub en el nombre (a veces está en la columna equivocada)
    if (!cleanVideoUrl && !githubUrl) {
      // Buscar en todas las columnas si hay una URL de GitHub
      for (const col of columns) {
        const potentialGithub = extractGithubRepoUrl(col);
        if (potentialGithub) {
          githubUrl = potentialGithub;
          break;
        }
      }
    }

    // Solo añadir si tiene al menos GitHub URL o video URL válida
    if (githubUrl || cleanVideoUrl) {
      rows.push({
        name,
        email: email.toLowerCase(),
        course: course || 'No especificado',
        edition: edition || 'No especificado',
        videoUrl: cleanVideoUrl || '',
        githubUrl: githubUrl || 'https://github.com/codecrypto-academy/pfm-default'
      });
    }
  }

  return rows;
}

async function migrate() {
  console.log('🚀 Iniciando migración de datos...\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    const projectsCollection = db.collection('projects');

    // Leer y parsear el archivo TSV
    const tsvPath = path.join(process.cwd(), 'proyectos.tsv');
    console.log(`📄 Leyendo archivo: ${tsvPath}\n`);

    const rows = parseTsvFile(tsvPath);
    console.log(`📊 Total de registros parseados: ${rows.length}\n`);

    let usersCreated = 0;
    let usersSkipped = 0;
    let projectsCreated = 0;
    let projectsSkipped = 0;

    for (const row of rows) {
      console.log(`\n👤 Procesando: ${row.name} (${row.email})`);

      // 1. Crear o verificar usuario
      const existingUser = await usersCollection.findOne({
        email: row.email
      });

      if (!existingUser) {
        await usersCollection.insertOne({
          email: row.email,
          name: row.name,
          role: 'student',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLogin: null
        });
        console.log(`  ✅ Usuario creado: ${row.email}`);
        usersCreated++;
      } else {
        console.log(`  ⏭️  Usuario ya existe: ${row.email}`);
        usersSkipped++;
      }

      // 2. Crear proyecto solo si tiene video URL
      if (row.videoUrl) {
        const existingProject = await projectsCollection.findOne({
          studentEmail: row.email,
          repositoryUrl: row.githubUrl
        });

        if (!existingProject) {
          await projectsCollection.insertOne({
            name: `Proyecto ${row.course} - ${row.name}`,
            studentEmail: row.email,
            repositoryUrl: row.githubUrl,
            videoUrl: row.videoUrl,
            course: row.course,
            edition: row.edition,
            status: 'submitted',
            submissionDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`  ✅ Proyecto creado`);
          console.log(`     - Repositorio: ${row.githubUrl}`);
          console.log(`     - Video: ${row.videoUrl}`);
          console.log(`     - Curso: ${row.course}`);
          console.log(`     - Edición: ${row.edition}`);
          projectsCreated++;
        } else {
          console.log(`  ⏭️  Proyecto ya existe`);
          projectsSkipped++;
        }
      } else {
        console.log(`  ⚠️  Sin video URL válida - proyecto no creado`);
        projectsSkipped++;
      }
    }

    console.log('\n\n📊 RESUMEN DE MIGRACIÓN:');
    console.log('═══════════════════════════════════════');
    console.log(`👥 Usuarios creados:     ${usersCreated}`);
    console.log(`👥 Usuarios existentes:  ${usersSkipped}`);
    console.log(`📁 Proyectos creados:    ${projectsCreated}`);
    console.log(`📁 Proyectos omitidos:   ${projectsSkipped}`);
    console.log('═══════════════════════════════════════');
    console.log('\n✅ Migración completada exitosamente!\n');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar migración
migrate().catch(console.error);
