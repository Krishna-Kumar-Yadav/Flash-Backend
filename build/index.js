"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express4_1 = require("@apollo/server/express4");
const graphql_1 = __importDefault(require("./graphql"));
const cors_1 = __importDefault(require("cors"));
const user_1 = __importDefault(require("./services/user"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const socket_1 = __importDefault(require("./socket"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv_1.default.config({ path: `.env.${NODE_ENV}` });
function mainServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = (0, express_1.default)();
        // Load environment variables
        const PORT = Number(process.env.PORT) || 8000;
        const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
        const GRAPHQL_PATH = process.env.GRAPHQL_PATH || "/graphql";
        // Create HTTP server
        const httpServer = (0, http_1.createServer)(app);
        // Apply global CORS middleware
        app.use((0, cors_1.default)({
            origin: CORS_ORIGIN,
            credentials: true
        }));
        app.use((0, cookie_parser_1.default)());
        app.use(express_1.default.json());
        app.get('/', (req, res) => {
            res.send(`Server is running in ${NODE_ENV} mode`);
        });
        // Initialize GraphQL server
        const gqlServer = yield (0, graphql_1.default)();
        app.use(GRAPHQL_PATH, (0, express4_1.expressMiddleware)(gqlServer, {
            context: (_a) => __awaiter(this, [_a], void 0, function* ({ req, res }) {
                try {
                    const authHeader = req.headers.authorization;
                    const token = authHeader && authHeader.split(' ')[1];
                    if (token) {
                        const user = yield user_1.default.decodeToken(token);
                        if (!user)
                            throw new Error('Invalid or expired token');
                        return { user, req, res, io };
                    }
                    else {
                        console.warn('No token provided in request headers.');
                        return { user: null, req, res, io };
                    }
                }
                catch (error) {
                    console.error('Error decoding token:', error);
                    throw new Error('Authentication failed');
                }
            })
        }));
        // Initialize Socket.IO server
        const io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: CORS_ORIGIN,
                methods: ["GET", "POST"],
                allowedHeaders: ["Content-Type"],
                credentials: true,
            },
        });
        io.on("connection", (socket) => {
            (0, socket_1.default)(socket, io);
        });
        // Start server
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
        });
    });
}
mainServer();
