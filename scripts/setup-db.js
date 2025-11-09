// MongoDB Database Setup Script
// Run with: mongosh < scripts/setup-db.js

use proyectos;

print("=== Setting up Proyectos Database ===\n");

// ============================================================================
// Create Collections with Validation
// ============================================================================

print("Creating collections with validation...\n");

// Users Collection
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "role", "name", "createdAt", "isActive"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Email válido requerido"
        },
        role: {
          enum: ["pending", "student", "teacher", "admin"],
          description: "Rol debe ser uno de los valores permitidos"
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
  }
});
print("✓ Users collection created");

// Projects Collection
db.createCollection("projects", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "studentEmail", "repositoryUrl", "submissionDate", "createdAt", "status"],
      properties: {
        name: {
          bsonType: "string",
          minLength: 3,
          description: "Nombre del proyecto requerido"
        },
        studentEmail: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        repositoryUrl: {
          bsonType: "string",
          pattern: "^https://github\\.com/.+/.+$",
          description: "URL de GitHub válida"
        },
        submissionDate: {
          bsonType: "date"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        },
        status: {
          enum: ["pending", "submitted", "evaluated"],
          description: "Estado del proyecto"
        },
        evaluations: {
          bsonType: "object"
        }
      }
    }
  }
});
print("✓ Projects collection created");

// Magic Links Collection
db.createCollection("magiclinks", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "token", "createdAt", "expiresAt", "used"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        token: {
          bsonType: "string",
          minLength: 32,
          description: "Token único de 32+ caracteres"
        },
        createdAt: {
          bsonType: "date"
        },
        expiresAt: {
          bsonType: "date"
        },
        used: {
          bsonType: "bool"
        }
      }
    }
  }
});
print("✓ Magic Links collection created");

// AI Prompts Collection
db.createCollection("aiPrompts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "prompt", "isActive", "createdBy", "createdAt"],
      properties: {
        name: {
          bsonType: "string",
          minLength: 3,
          description: "Nombre descriptivo del prompt"
        },
        prompt: {
          bsonType: "string",
          minLength: 50,
          description: "Template del prompt"
        },
        isActive: {
          bsonType: "bool"
        },
        createdBy: {
          bsonType: "string"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        }
      }
    }
  }
});
print("✓ AI Prompts collection created\n");

// ============================================================================
// Create Indexes
// ============================================================================

print("Creating indexes...\n");

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
print("✓ Users indexes created");

// Projects indexes
db.projects.createIndex({ studentEmail: 1 });
db.projects.createIndex({ status: 1 });
db.projects.createIndex({ submissionDate: 1 });
db.projects.createIndex({ "evaluations.videoDemo.evaluatedBy": 1 });
db.projects.createIndex({ "evaluations.repository.evaluatedBy": 1 });
print("✓ Projects indexes created");

// Magic Links indexes
db.magiclinks.createIndex({ token: 1 }, { unique: true });
db.magiclinks.createIndex({ email: 1 });
db.magiclinks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
db.magiclinks.createIndex({ used: 1 });
print("✓ Magic Links indexes created (with TTL)");

// AI Prompts indexes
db.aiPrompts.createIndex({ isActive: 1 });
db.aiPrompts.createIndex({ createdBy: 1 });
db.aiPrompts.createIndex({ name: 1 });
print("✓ AI Prompts indexes created\n");

// ============================================================================
// Summary
// ============================================================================

print("=== Database Setup Complete ===\n");
print("Database: proyectos");
print("Collections created: 4");
print("  - users");
print("  - projects");
print("  - magiclinks");
print("  - aiPrompts");
print("\nIndexes created successfully");
print("\nNext step: Run 'mongosh < scripts/seed-db.js' to insert initial data");
