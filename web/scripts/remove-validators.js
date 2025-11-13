// MongoDB Remove Validators Script
// Run with: mongosh proyectos < scripts/remove-validators.js
// 
// Este script elimina todos los validadores de schema de MongoDB.
// La validación se hará únicamente en el código de la aplicación.

use proyectos;

print("=== Eliminando Validadores de Schema ===\n");

const collections = ['users', 'projects', 'magiclinks', 'aiPrompts'];

collections.forEach(collName => {
  try {
    db.runCommand({
      collMod: collName,
      validator: {},
      validationLevel: 'off'
    });
    print(`✓ Validador de ${collName} eliminado`);
  } catch (error) {
    if (error.codeName === 'NamespaceNotFound') {
      print(`⚠ Colección ${collName} no existe (ok)`);
    } else {
      print(`✗ Error en ${collName}:`, error.message);
    }
  }
});

print("\n=== Verificación ===\n");

collections.forEach(collName => {
  const collInfo = db.getCollectionInfos({ name: collName })[0];
  if (collInfo) {
    const hasValidator = collInfo.options && 
                         collInfo.options.validator && 
                         Object.keys(collInfo.options.validator).length > 0;
    print(`${collName}: ${hasValidator ? '✗ Con validador' : '✓ Sin validador'}`);
  } else {
    print(`${collName}: ⚠ No existe`);
  }
});

print("\n=== Completado ===");
print("MongoDB ahora acepta cualquier estructura.");
print("La validación se hace únicamente en el código (Zod schemas).\n");

