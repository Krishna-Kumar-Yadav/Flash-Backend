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
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
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
        // Apply global CORS middleware
        app.use((0, cors_1.default)({
            origin: CORS_ORIGIN,
            credentials: true
        }));
        app.use((0, cookie_parser_1.default)());
        app.use(express_1.default.json());
        const imagesPath = path_1.default.resolve(__dirname, '../uploads/');
        app.use('/uploads', express_1.default.static(imagesPath));
        // Set CORS headers manually (if necessary)
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
            res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            next();
        });
        // Configure Multer storage for file uploads
        const storage = multer_1.default.diskStorage({
            destination: (req, file, cb) => {
                cb(null, 'uploads/');
            },
            filename: (req, file, cb) => {
                const encodedFilename = file.originalname;
                cb(null, encodedFilename);
            }
        });
        const upload = (0, multer_1.default)({
            storage,
            limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10 MB
        });
        // Upload endpoint to handle file uploads
        app.post('/uploads', upload.single('file'), (req, res) => {
            if (req.file) {
                res.json({ message: 'File uploaded successfully', file: req.file });
            }
            else {
                res.status(400).json({ message: 'No file uploaded or file too large' });
            }
        });
        // GraphQL setup
        const gqlServer = yield (0, graphql_1.default)();
        // GraphQL middleware with context setup
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
        const httpServer = (0, http_1.createServer)(app);
        const io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: CORS_ORIGIN,
                methods: ["GET", "POST", "PUT", "DELETE"],
                allowedHeaders: ["Content-Type"],
                credentials: true,
            },
        });
        io.on("connection", (socket) => {
            (0, socket_1.default)(socket, io); // Handle socket events
        });
        // Start the server
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
        });
    });
}
mainServer().catch((err) => {
    console.error('Error starting the server:', err);
});
