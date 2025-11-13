/**
 * Script para probar la conexión a MongoDB Atlas
 * 
 * Uso:
 * 1. Crea un archivo .env.production con tus variables
 * 2. Ejecuta: npx tsx scripts/test-mongodb-connection.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env.production') });
// O para local:
// dotenv.config({ path: path.join(__dirname, '../.env.local') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'proyectos';

console.log('=== Test de Conexión MongoDB ===\n');

if (!uri) {
  console.error('❌ Error: MONGODB_URI no está definido');
  console.log('Asegúrate de tener un archivo .env.production con:');
  console.log('MONGODB_URI=mongodb+srv://...');
  process.exit(1);
}

// Ocultar password en el log
const uriForDisplay = uri.replace(/:([^@]+)@/, ':****@');
console.log('URI (password oculto):', uriForDisplay);
console.log('Database:', dbName);
console.log('\nIntentando conectar...\n');

async function testConnection() {
  let client: MongoClient | null = null;
  
  try {
    // Opciones de conexión recomendadas
    client = new MongoClient(uri!, {
      serverSelectionTimeoutMS: 5000, // 5 segundos de timeout
      connectTimeoutMS: 10000,
    });

    console.log('⏳ Conectando...');
    await client.connect();
    console.log('✅ Conexión exitosa!\n');

    // Probar acceso a la base de datos
    const db = client.db(dbName);
    console.log('⏳ Probando acceso a la base de datos...');
    
    // Listar colecciones
    const collections = await db.listCollections().toArray();
    console.log(`✅ Acceso a la base de datos OK! (${collections.length} colecciones)\n`);

    if (collections.length > 0) {
      console.log('Colecciones disponibles:');
      collections.forEach(coll => {
        console.log(`  - ${coll.name}`);
      });
    }

    // Probar una query simple
    console.log('\n⏳ Probando query en users...');
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`✅ Query exitosa! (${userCount} usuarios en la DB)\n`);

    console.log('=== ✅ TODO CORRECTO ===');
    console.log('La conexión funciona perfectamente.\n');

  } catch (error: any) {
    console.error('❌ ERROR DE CONEXIÓN:\n');
    
    if (error.code === 8000 || error.codeName === 'AtlasError') {
      console.error('Error de autenticación de MongoDB Atlas:');
      console.error('- Verifica que el usuario y contraseña sean correctos');
      console.error('- Si la contraseña tiene caracteres especiales, encodéalos (usa https://www.urlencoder.org/)');
      console.error('- Verifica que el usuario tenga permisos en la base de datos');
      console.error('\nEjemplo de URI correcta:');
      console.error('mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true&w=majority');
    } else if (error.code === 'ENOTFOUND' || error.message.includes('querySrv')) {
      console.error('Error de DNS/Hostname:');
      console.error('- Verifica que el hostname del cluster sea correcto');
      console.error('- Asegúrate de usar "mongodb+srv://" (con "srv")');
    } else if (error.message.includes('IP') || error.message.includes('not in whitelist')) {
      console.error('Error de IP Whitelist:');
      console.error('- Ve a MongoDB Atlas → Network Access');
      console.error('- Agrega tu IP o usa 0.0.0.0/0 para permitir todas');
    } else {
      console.error('Error desconocido:');
      console.error(error.message);
    }
    
    console.error('\nDetalles técnicos del error:');
    console.error(error);
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Conexión cerrada.');
    }
  }
}

testConnection();

