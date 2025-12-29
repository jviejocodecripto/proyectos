# MongoDB Schema Fix Summary

## Problem
The application was throwing a `MongoServerError: Document failed validation` error when trying to create users through the API.

## Root Cause
There was a mismatch between the TypeScript code and MongoDB schema:
- **TypeScript code** expected: `roles: UserRole[]` (plural, array)
- **MongoDB schema** expected: `role: string` (singular, string enum)

## Files Fixed

### 1. `/scripts/setup-db.js`
- Updated validator from `role` to `roles` with array type
- Changed required field from `"role"` to `"roles"`
- Updated property definition to accept array of roles
- Updated index from `{ role: 1 }` to `{ roles: 1 }`

### 2. `/scripts/fix-users-schema.js` (NEW)
- Created migration script to update existing MongoDB collection
- Migrates any users with old `role` field to new `roles` field
- Updates collection validator
- Updates indexes

### 3. `/scripts/seed-db.js`
- Updated all user insertions to use `roles: ["admin"]` instead of `role: "admin"`
- Fixed admin, teacher, and student seed data

### 4. `/DATABASE_SCHEMA.md`
- Updated documentation to reflect `roles` (array) instead of `role` (string)
- Updated all example queries
- Updated validation schema documentation
- Updated index documentation

## Migration Applied

The migration script has been successfully run with the following results:
- ✓ Collection validator updated to use `roles` (array)
- ✓ Old `role` index dropped
- ✓ New `roles` index created
- ✓ Existing users now have the correct `roles` field

## Verification

Sample user after migration:
```javascript
{
  email: 'admin@example.com',
  roles: ['admin', 'teacher'],
  name: 'Administrador',
  isActive: true
}
```

## What This Means

✅ You can now successfully create users through the API
✅ Users can have multiple roles (e.g., `["admin", "teacher"]`)
✅ All existing users have been migrated to the new schema
✅ Future database setups will use the correct schema

## Testing

You can now test user creation:

```bash
# Example: Create a new user via API
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "roles": ["student"],
    "isActive": true
  }'
```

## Notes

- The TypeScript types already supported multiple roles per user
- The helper function `convertUserToDTO()` in `types/index.ts` already handled legacy `role` field
- This fix aligns the MongoDB schema with the intended multi-role design

