// MongoDB Schema Fix Script - Update users collection from role to roles
// Run with: mongosh proyectos < scripts/fix-users-schema.js

use proyectos;

print("=== Fixing Users Collection Schema ===\n");

// Step 1: Migrate existing users from 'role' (singular) to 'roles' (array)
print("Step 1: Migrating existing users...");
const usersWithOldSchema = db.users.find({ role: { $exists: true } });
let migratedCount = 0;

usersWithOldSchema.forEach(user => {
  db.users.updateOne(
    { _id: user._id },
    {
      $set: { roles: [user.role] },
      $unset: { role: "" }
    }
  );
  migratedCount++;
});

print(`✓ Migrated ${migratedCount} users from 'role' to 'roles'\n`);

// Step 2: Drop old index on 'role'
print("Step 2: Updating indexes...");
try {
  db.users.dropIndex({ role: 1 });
  print("✓ Dropped old 'role' index");
} catch (e) {
  print("✗ Old 'role' index not found (this is ok)");
}

// Create new index on 'roles'
try {
  db.users.createIndex({ roles: 1 });
  print("✓ Created new 'roles' index\n");
} catch (e) {
  print("✗ 'roles' index may already exist (this is ok)\n");
}

// Step 3: Update collection validator
print("Step 3: Updating collection validator...");
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "roles", "name", "createdAt", "isActive"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Email válido requerido"
        },
        roles: {
          bsonType: "array",
          items: {
            enum: ["pending", "student", "teacher", "admin"]
          },
          minItems: 1,
          description: "Roles debe ser un array con al menos un rol válido"
        },
        name: {
          bsonType: "string",
          minLength: 2,
          description: "Nombre es requerido"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        },
        lastLogin: {
          bsonType: ["date", "null"]
        },
        isActive: {
          bsonType: "bool"
        }
      }
    }
  },
  validationLevel: "strict"
});

print("✓ Collection validator updated\n");

// Step 4: Verify the changes
print("Step 4: Verifying changes...");
const sampleUser = db.users.findOne();
if (sampleUser) {
  print("Sample user document:");
  printjson({
    email: sampleUser.email,
    roles: sampleUser.roles,
    name: sampleUser.name,
    isActive: sampleUser.isActive
  });
}

print("\n=== Schema Fix Complete ===");
print("Users collection now uses 'roles' (array) instead of 'role' (string)");
print("You can now create new users successfully!\n");

