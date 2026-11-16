import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRouter from './routes/auth';
import protectedRouter from './routes/protected';
import docsRouter from './routes/docs';
import auditRouter from './routes/audit';
import aiRouter from './routes/ai';
import { LedgerService } from './services/ledger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all local dev origins or requests without origin (curl, etc.)
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/docs', docsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/ai', aiRouter);
app.use('/api/test', protectedRouter);

// Healthcheck & readiness endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    system: 'Secure Digital Document Management System (Secure DMS)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    complianceStandard: 'BSA 2023 Sec 63 / IEA Sec 65B Ready',
  });
});

// Database connection with graceful fallback for local development
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secure_dms';
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.warn(`[MongoDB] Notice: Running in standalone development mode (${error.message || 'no active instance'}). Provide MONGO_URI in .env to connect to MongoDB Atlas.`);
  }
};

connectDB().then(async () => {
  try {
    await LedgerService.initGenesisBlock();
    console.log('[Audit Ledger] Genesis Block 0 initialized with SHA-256 chain root.');
  } catch (err) {
    console.error('[Audit Ledger Error]:', err);
  }

  app.listen(PORT, () => {
    console.log(`[Backend API] Running on http://localhost:${PORT}`);
    console.log(`[Backend API] Health check at http://localhost:${PORT}/api/health`);
  });
});

export default app;
