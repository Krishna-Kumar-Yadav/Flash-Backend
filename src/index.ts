import express, { Request, Response, NextFunction } from 'express';
import { expressMiddleware } from '@apollo/server/express4';
import apolloGraphqlServer from './graphql';
import cors from 'cors';
import UserService from './services/user';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import socketIo from './socket';
import dotenv from 'dotenv';
import multer, { DiskStorageOptions, Multer, StorageEngine } from 'multer';
import path from 'path';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${NODE_ENV}` });

async function mainServer(): Promise<void> {
    const app = express();

    // Load environment variables
    const PORT: number = Number(process.env.PORT) || 8000;
    const CORS_ORIGIN: string = process.env.CORS_ORIGIN || "http://localhost:5173";
    const GRAPHQL_PATH: string = process.env.GRAPHQL_PATH || "/graphql";

    // Apply global CORS middleware
    app.use(cors({
        origin: CORS_ORIGIN,
        credentials: true
    }));

    app.use(cookieParser());
    app.use(express.json());

    const imagesPath = path.resolve(__dirname, '../uploads/');
    app.use('/uploads', express.static(imagesPath));

    // Set CORS headers manually (if necessary)
    app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    });

    // Configure Multer storage for file uploads
    const storage: StorageEngine = multer.diskStorage({
        destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
            cb(null, 'uploads/');
        },
        filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
            const encodedFilename = file.originalname;
            cb(null, encodedFilename);
        }
    });

    const upload: Multer = multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10 MB
    });

    // Upload endpoint to handle file uploads
    app.post('/uploads', upload.single('file'), (req: Request, res: Response) => {
        if (req.file) {
            res.json({ message: 'File uploaded successfully', file: req.file });
        } else {
            res.status(400).json({ message: 'No file uploaded or file too large' });
        }
    });

    // GraphQL setup
    const gqlServer = await apolloGraphqlServer();

    // GraphQL middleware with context setup
    app.use(GRAPHQL_PATH, expressMiddleware(gqlServer, {
        context: async ({ req, res }: { req: Request; res: Response }) => {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader && authHeader.split(' ')[1];

                if (token) {
                    const user = await UserService.decodeToken(token);
                    if (!user) throw new Error('Invalid or expired token');
                    return { user, req, res, io };
                } else {
                    console.warn('No token provided in request headers.');
                    return { user: null, req, res, io };
                }
            } catch (error) {
                console.error('Error decoding token:', error);
                throw new Error('Authentication failed');
            }
        }
    }));

    // Initialize Socket.IO server
    const httpServer: HTTPServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: CORS_ORIGIN,
            methods: ["GET", "POST", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        socketIo(socket, io); // Handle socket events
    });

    // Start the server
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });
}

mainServer().catch((err) => {
    console.error('Error starting the server:', err);
});
