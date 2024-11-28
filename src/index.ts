import express from 'express';
import { expressMiddleware } from '@apollo/server/express4';
import apolloGraphqlServer from './graphql';
import cors from 'cors';
import UserService from './services/user';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { createServer } from 'http';
import socketIo from './socket';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${NODE_ENV}` });


async function mainServer() {
    const app = express();

    // Load environment variables
    const PORT = Number(process.env.PORT) || 8000;
    const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
    const GRAPHQL_PATH = process.env.GRAPHQL_PATH || "/graphql";

    // Create HTTP server
    const httpServer = createServer(app);

    // Apply global CORS middleware
    app.use(cors({
        origin: CORS_ORIGIN,
        credentials: true
    }));

    app.use(cookieParser());
    app.use(express.json());

    app.get('/', (req, res) => {
        res.send(`Server is running in ${NODE_ENV} mode`);
    });

    // Initialize GraphQL server
    const gqlServer = await apolloGraphqlServer();

    app.use(GRAPHQL_PATH, expressMiddleware(gqlServer, {
        context: async ({ req, res }) => {
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
    const io = new Server(httpServer, {
        cors: {
            origin: CORS_ORIGIN,
            methods: ["GET", "POST"],
            allowedHeaders: ["Content-Type"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        socketIo(socket, io);
    });

    // Start server
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });
}

mainServer();
