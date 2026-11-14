const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const fs = require('fs');

const WINDOWS_BINARY = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
const DARWIN_BINARY = '/Users/deekshithsharma/Downloads/securedocket-main/node_modules/.cache/mongodb-memory-server/mongod-arm64-darwin-8.2.6';
let mongoServer = null;

async function connectToTestDb() {
  if (!mongoServer) {
    const createOpts = {
      replSet: {
        count: 1,
        dbName: 'secure-dms-jest',
        storageEngine: 'wiredTiger',
      },
    };

    if (fs.existsSync(WINDOWS_BINARY)) {
      createOpts.binary = { systemBinary: WINDOWS_BINARY };
    } else if (fs.existsSync(DARWIN_BINARY)) {
      createOpts.binary = { systemBinary: DARWIN_BINARY };
    }

    mongoServer = await MongoMemoryServer.create(createOpts);
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoServer.getUri('secure-dms-jest'), {
      retryWrites: false,
      serverSelectionTimeoutMS: 15000,
    });
  }

  return mongoose.connection;
}

async function closeTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

module.exports = {
  connectToTestDb,
  closeTestDb,
  getMongoServer: () => mongoServer,
};
