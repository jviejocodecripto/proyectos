// Test MongoDB Connection Script
// Run with: npx tsx scripts/test-db.ts

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { getDatabase, getClient } from '../lib/db/mongodb';
import { findUserByEmail } from '../lib/db/users';
import { findAllPrompts } from '../lib/db/prompts';

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Connecting to MongoDB...');
    const client = await getClient();
    console.log('✅ Connected successfully\n');

    // Test 2: Database access
    console.log('Test 2: Accessing database...');
    const db = await getDatabase();
    const dbName = db.databaseName;
    console.log(`✅ Database: ${dbName}\n`);

    // Test 3: List collections
    console.log('Test 3: Listing collections...');
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    console.log('');

    // Test 4: Find admin user
    console.log('Test 4: Finding admin user...');
    const admin = await findUserByEmail('admin@example.com');
    if (admin) {
      console.log(`✅ Admin user found: ${admin.name} (${admin.email})`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}`);
    } else {
      console.log('❌ Admin user not found');
    }
    console.log('');

    // Test 5: Find AI prompts
    console.log('Test 5: Finding AI prompts...');
    const prompts = await findAllPrompts();
    console.log(`✅ Found ${prompts.length} AI prompt(s)`);
    prompts.forEach(prompt => {
      console.log(`   - ${prompt.name} (Active: ${prompt.isActive})`);
    });
    console.log('');

    // Test 6: Count documents
    console.log('Test 6: Counting documents...');
    const usersCount = await db.collection('users').countDocuments();
    const projectsCount = await db.collection('projects').countDocuments();
    const promptsCount = await db.collection('aiPrompts').countDocuments();

    console.log(`✅ Document counts:`);
    console.log(`   Users: ${usersCount}`);
    console.log(`   Projects: ${projectsCount}`);
    console.log(`   AI Prompts: ${promptsCount}`);
    console.log('');

    console.log('✅ All tests passed!\n');
    console.log('🎉 MongoDB is ready to use!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();
