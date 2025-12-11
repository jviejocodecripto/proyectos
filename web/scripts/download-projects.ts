import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { MongoClient, ObjectId, GridFSBucket } from 'mongodb';
import type { Project } from '../types';

const execAsync = promisify(exec);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'proyectos';

// Directorio base donde se descargarán los proyectos
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || path.join(process.cwd(), 'downloads');

/**
 * Sanitiza el nombre de carpeta para evitar caracteres inválidos
 */
function sanitizeFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/\./g, '_')
    .substring(0, 100); // Limitar longitud
}

/**
 * Crea el nombre de la carpeta: {email}-{id}
 */
function getFolderName(project: Project): string {
  const email = sanitizeFolderName(project.studentEmail);
  const id = project._id?.toString() || 'unknown';
  return `${email}-${id}`;
}

/**
 * Guarda el JSON con los datos del proyecto
 */
async function saveProjectJson(projectDir: string, project: Project): Promise<void> {
  const jsonPath = path.join(projectDir, 'project.json');
  
  // Convertir ObjectId a string para JSON
  const projectData = {
    ...project,
    _id: project._id?.toString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    submissionDate: project.submissionDate.toISOString(),
    evaluations: project.evaluations ? {
      videoDemo: project.evaluations.videoDemo ? {
        ...project.evaluations.videoDemo,
        evaluatedAt: project.evaluations.videoDemo.evaluatedAt.toISOString(),
        commentsFileId: project.evaluations.videoDemo.commentsFileId?.toString()
      } : undefined,
      repository: project.evaluations.repository ? {
        ...project.evaluations.repository,
        evaluatedAt: project.evaluations.repository.evaluatedAt.toISOString(),
        commentsFileId: project.evaluations.repository.commentsFileId?.toString(),
        aiAnalysisFileId: project.evaluations.repository.aiAnalysisFileId?.toString()
      } : undefined
    } : undefined
  };

  await fs.writeFile(jsonPath, JSON.stringify(projectData, null, 2), 'utf-8');
  console.log(`  ✓ JSON guardado: ${jsonPath}`);
}

/**
 * Clona el repositorio de GitHub
 */
async function cloneRepository(projectDir: string, repositoryUrl: string): Promise<void> {
  if (!repositoryUrl) {
    console.log(`  ⚠ No hay URL de repositorio`);
    return;
  }

  const repoDir = path.join(projectDir, 'repository');
  
  try {
    // Verificar si la carpeta ya existe
    try {
      await fs.access(repoDir);
      console.log(`  ⚠ Repositorio ya existe, omitiendo clone`);
      return;
    } catch {
      // La carpeta no existe, continuar
    }

    console.log(`  📦 Clonando repositorio: ${repositoryUrl}`);
    await execAsync(`git clone ${repositoryUrl} repository`, {
      cwd: projectDir,
      timeout: 300000 // 5 minutos timeout
    });
    console.log(`  ✓ Repositorio clonado`);
  } catch (error: any) {
    console.error(`  ✗ Error al clonar repositorio: ${error.message}`);
    // No lanzar error, continuar con el siguiente proyecto
  }
}

/**
 * Descarga contenido de GridFS
 */
async function downloadGridFSContent(
  db: any,
  fileId: ObjectId | string | undefined,
  outputPath: string,
  description: string
): Promise<void> {
  if (!fileId) return;

  try {
    const bucket = new GridFSBucket(db, { bucketName: 'evaluations' });
    const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

    return new Promise((resolve, reject) => {
      const downloadStream = bucket.openDownloadStream(id);
      const chunks: Buffer[] = [];

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', async () => {
        try {
          const content = Buffer.concat(chunks);
          await fs.writeFile(outputPath, content);
          console.log(`  ✓ ${description} descargado desde GridFS`);
          resolve();
        } catch (error: any) {
          reject(error);
        }
      });

      downloadStream.on('error', (error) => {
        console.error(`  ✗ Error descargando ${description}: ${error.message}`);
        resolve(); // No fallar el proceso completo
      });
    });
  } catch (error: any) {
    console.error(`  ✗ Error accediendo a GridFS para ${description}: ${error.message}`);
  }
}

/**
 * Descarga el video desde la URL
 */
async function downloadVideo(projectDir: string, videoUrl: string | undefined): Promise<void> {
  if (!videoUrl) {
    console.log(`  ⚠ No hay URL de video`);
    return;
  }

  try {
    // Verificar si es una URL directa de video o un enlace a plataforma
    const directVideoPatterns = [
      /\.(mp4|webm|ogg|mov|avi|mkv)$/i,
      /^https?:\/\/.*\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i
    ];

    const isDirectVideo = directVideoPatterns.some(pattern => pattern.test(videoUrl));

    if (!isDirectVideo) {
      // Es una URL de YouTube, Vimeo, etc. - guardar la URL en un archivo
      const urlPath = path.join(projectDir, 'video-url.txt');
      await fs.writeFile(urlPath, videoUrl, 'utf-8');
      console.log(`  ⚠ Video URL guardada (no es descarga directa): ${videoUrl}`);
      return;
    }

    // Intentar descargar el video
    console.log(`  📹 Descargando video: ${videoUrl}`);
    
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const extension = contentType.includes('video/') 
      ? contentType.split('/')[1].split(';')[0]
      : 'mp4';

    const videoPath = path.join(projectDir, `video.${extension}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(videoPath, buffer);
    console.log(`  ✓ Video descargado: ${videoPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error: any) {
    console.error(`  ✗ Error al descargar video: ${error.message}`);
    // Guardar la URL en un archivo como fallback
    try {
      const urlPath = path.join(projectDir, 'video-url.txt');
      await fs.writeFile(urlPath, videoUrl, 'utf-8');
      console.log(`  ⚠ URL de video guardada en video-url.txt`);
    } catch (writeError) {
      console.error(`  ✗ Error al guardar URL de video: ${writeError}`);
    }
  }
}

/**
 * Procesa un proyecto individual
 */
async function processProject(
  project: Project,
  index: number,
  total: number,
  db: any
): Promise<void> {
  const folderName = getFolderName(project);
  const projectDir = path.join(DOWNLOAD_DIR, folderName);

  console.log(`\n[${index + 1}/${total}] Procesando: ${project.name}`);
  console.log(`  📁 Carpeta: ${folderName}`);

  try {
    // Crear directorio del proyecto
    await fs.mkdir(projectDir, { recursive: true });
    console.log(`  ✓ Carpeta creada`);

    // Guardar JSON
    await saveProjectJson(projectDir, project);

    // Clonar repositorio
    await cloneRepository(projectDir, project.repositoryUrl);

    // Descargar video
    await downloadVideo(projectDir, project.videoUrl);

    // Descargar contenido de evaluaciones desde GridFS si existe
    if (project.evaluations) {
      const evaluationsDir = path.join(projectDir, 'evaluations');
      await fs.mkdir(evaluationsDir, { recursive: true });

      // Video evaluation comments
      if (project.evaluations.videoDemo?.commentsFileId) {
        await downloadGridFSContent(
          db,
          project.evaluations.videoDemo.commentsFileId,
          path.join(evaluationsDir, 'video-comments.md'),
          'Comentarios de evaluación de video'
        );
      }

      // Repository evaluation comments
      if (project.evaluations.repository?.commentsFileId) {
        await downloadGridFSContent(
          db,
          project.evaluations.repository.commentsFileId,
          path.join(evaluationsDir, 'repository-comments.md'),
          'Comentarios de evaluación de repositorio'
        );
      }

      // AI Analysis
      if (project.evaluations.repository?.aiAnalysisFileId) {
        await downloadGridFSContent(
          db,
          project.evaluations.repository.aiAnalysisFileId,
          path.join(evaluationsDir, 'ai-analysis.md'),
          'Análisis de IA'
        );
      }
    }

    console.log(`  ✅ Proyecto completado: ${folderName}`);
  } catch (error: any) {
    console.error(`  ✗ Error procesando proyecto: ${error.message}`);
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando descarga de proyectos...\n');
  console.log(`📂 Directorio de descarga: ${DOWNLOAD_DIR}`);
  console.log(`🔗 MongoDB URI: ${MONGODB_URI}`);
  console.log(`💾 Base de datos: ${MONGODB_DB}\n`);

  let client: MongoClient | null = null;

  try {
    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');

    const db = client.db(MONGODB_DB);
    const projectsCollection = db.collection<Project>('projects');

    // Obtener todos los proyectos
    console.log('📋 Obteniendo proyectos...');
    const projects = await projectsCollection.find({}).toArray();
    console.log(`✓ Encontrados ${projects.length} proyectos\n`);

    if (projects.length === 0) {
      console.log('⚠ No hay proyectos para descargar');
      return;
    }

    // Crear directorio base
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    console.log(`✓ Directorio base creado: ${DOWNLOAD_DIR}\n`);

    // Procesar cada proyecto
    for (let i = 0; i < projects.length; i++) {
      await processProject(projects[i], i, projects.length, db);
    }

    console.log(`\n✅ Proceso completado! ${projects.length} proyectos procesados`);
    console.log(`📂 Proyectos descargados en: ${DOWNLOAD_DIR}`);
  } catch (error: any) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Desconectado de MongoDB');
    }
  }
}

// Ejecutar
main().catch(console.error);

