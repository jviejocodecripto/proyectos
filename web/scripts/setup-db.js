// MongoDB Database Setup Script
// Run with: mongosh < scripts/setup-db.js

use proyectos

print("=== Setting up Proyectos Database ===\n");

// ============================================================================
// Create Collections (WITHOUT validation - validation done in app code)
// ============================================================================

print("Creating collections...\n");

// Users Collection
db.createCollection("users");
print("✓ Users collection created");

// Projects Collection
db.createCollection("projects");
print("✓ Projects collection created");

// Magic Links Collection
db.createCollection("magiclinks");
print("✓ Magic Links collection created");

// AI Prompts Collection
db.createCollection("aiPrompts");
print("✓ AI Prompts collection created\n");

// ============================================================================
// Create Indexes
// ============================================================================

print("Creating indexes...\n");

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ roles: 1 });
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
