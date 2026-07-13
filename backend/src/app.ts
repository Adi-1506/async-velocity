import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import teamsRoutes from './routes/teams.routes';
import standupsRoutes from './routes/standups.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/standups', standupsRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
app.use(errorHandler);

export default app;
