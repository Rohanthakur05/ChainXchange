const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

/**
 * Test Setup
 * ──────────
 * Uses MongoMemoryReplSet (not MongoMemoryServer) so that tests
 * can exercise MongoDB multi-document transactions — exactly as
 * production does. A single-node replica set (rs0) is started
 * in-memory before any test file runs and torn down after all.
 */
let mongoReplSet;

beforeAll(async () => {
  mongoReplSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, name: 'rs0' }   // single-node replica set
  });
  const uri = mongoReplSet.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoReplSet.stop();
});

afterEach(async () => {
  // Clean all collections between test cases for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
