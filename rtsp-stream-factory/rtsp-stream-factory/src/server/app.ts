import express from 'express';
import { setRoutes } from './routes/index';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { authMiddleware } from './middlewares/auth.middleware';
import { config } from './config';

const app = express();
const PORT = config.port || 3000;

// Middleware
app.use(express.json());
app.use(loggerMiddleware);
app.use(authMiddleware);

// Routes
setRoutes(app);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});