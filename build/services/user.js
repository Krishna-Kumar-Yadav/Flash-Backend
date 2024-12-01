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
const crypto_1 = require("crypto");
const db_1 = require("../models/db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tokenKey = process.env.JWT_SECRET_KEY || 'p@r@mpit@p@rm@shw@r';
class UserService {
    static getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return db_1.prismaClient.user.findUnique({ where: { email } });
        });
    }
    static generateHashedPassword(salt, password) {
        const hashedPassword = (0, crypto_1.createHmac)("sha256", salt).update(password).digest("hex");
        return hashedPassword;
    }
    static generateToken(payload, tokenKey) {
        const token = jsonwebtoken_1.default.sign(payload, tokenKey);
        return token;
    }
    static decodeToken(token) {
        const payload = jsonwebtoken_1.default.verify(token, tokenKey);
        return payload;
    }
    static signUp(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { fullName, mobileNumber, email, dateOfBirth, password } = payload;
            const userExist = yield db_1.prismaClient.user.findUnique({
                where: { email }
            });
            if (userExist) {
                throw new Error("User with this email already exists.");
            }
            const formattedDate = new Date(dateOfBirth).toISOString();
            const salt = (0, crypto_1.randomBytes)(32).toString('hex');
            const hashedPassword = UserService.generateHashedPassword(salt, password);
            return db_1.prismaClient.user.create({
                data: {
                    fullName,
                    mobileNumber,
                    email,
                    dateOfBirth: formattedDate,
                    password: hashedPassword,
                    salt
                }
            });
        });
    }
    static signIn(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = payload;
            const userExist = yield UserService.getUserByEmail(email);
            if (!userExist) {
                throw new Error("User not Exists");
            }
            const salt = userExist.salt;
            const storedPassword = userExist.password;
            const hashedPassword = UserService.generateHashedPassword(salt, password);
            if (storedPassword !== hashedPassword)
                throw new Error("Wrong Password");
            //generate token
            const token = UserService.generateToken({ id: userExist.id, email: userExist.email }, tokenKey);
            return token;
        });
    }
    static getUserById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = db_1.prismaClient.user.findUnique({ where: { id } });
            console.log(user);
            return user;
        });
    }
    static findChatRoom(senderId, receiverId) {
        if (!senderId || !receiverId) {
            throw new Error("Both senderId and receiverId must be provided.");
        }
        const chatRoom = db_1.prismaClient.chatRoom.findFirst({
            where: {
                AND: [
                    { users: { some: { id: senderId } } },
                    { users: { some: { id: receiverId } } }
                ]
            }
        });
        return chatRoom;
    }
    static findOrCreateChatRoom(userId1, userId2) {
        return __awaiter(this, void 0, void 0, function* () {
            let chatRoom = yield db_1.prismaClient.chatRoom.findFirst({
                where: {
                    users: {
                        every: {
                            id: { in: [userId1, userId2] }
                        }
                    }
                }
            });
            if (!chatRoom) {
                chatRoom = yield db_1.prismaClient.chatRoom.create({
                    data: {
                        name: `Chat between ${userId1} and ${userId2}`,
                        users: {
                            connect: [{ id: userId1 }, { id: userId2 }],
                        },
                    },
                });
            }
            return chatRoom;
        });
    }
    static findOrCreateGroupChatRoom(userIds, groupName, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!userIds || userIds.length < 2) {
                throw new Error("A group chat must have at least two users.");
            }
            const existingGroups = yield db_1.prismaClient.chatRoom.findUnique({
                where: {
                    name: groupName,
                    isGroup: true,
                },
                include: {
                    users: true
                },
            });
            if (existingGroups)
                return existingGroups;
            const newRoom = yield db_1.prismaClient.chatRoom.create({
                data: {
                    name: groupName,
                    isGroup: true,
                    users: {
                        connect: userIds.map((id) => ({ id }))
                    },
                    adminId: adminId
                },
                include: {
                    users: true
                }
            });
            return newRoom;
        });
    }
    static sendMessage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!payload.groupName) {
                // Single chat logic
                const receiverId = payload.recieverId[0];
                const chatRoom = yield UserService.findOrCreateChatRoom(payload.senderId, receiverId);
                if (!chatRoom) {
                    throw new Error("Chat room could not be created for the direct message.");
                }
                return yield db_1.prismaClient.message.create({
                    data: {
                        content: payload.content,
                        senderId: payload.senderId,
                        chatRoomId: chatRoom.id,
                    },
                });
            }
            else {
                // Group chat logic
                const chatRoom = yield UserService.findOrCreateGroupChatRoom(payload.recieverId, payload.groupName, payload.adminId);
                if (!chatRoom) {
                    throw new Error("Chat room could not be created or found for the group message.");
                }
                return yield db_1.prismaClient.message.create({
                    data: {
                        content: payload.content,
                        senderId: payload.senderId,
                        chatRoomId: chatRoom.id,
                    },
                });
            }
        });
    }
    static findGroupChatRoom(groupName) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield db_1.prismaClient.chatRoom.findMany({
                where: {
                    name: groupName,
                    isGroup: true,
                },
                include: {
                    users: true
                },
            });
        });
    }
    static fetchConversation(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!payload.groupName) {
                const chatRoom = yield UserService.findOrCreateChatRoom(payload.senderId, payload.recieverId[0]);
                if (!chatRoom) {
                    throw new Error("Chat room could not be created for the direct message.");
                }
                const messages = yield db_1.prismaClient.message.findMany({
                    where: { chatRoomId: chatRoom.id },
                    include: { sender: true }, // To include sender details
                    orderBy: { creationTime: 'asc' },
                });
                return messages;
            }
            else {
                const chatRoom = yield UserService.findGroupChatRoom(payload.groupName);
                if (!chatRoom) {
                    throw new Error("Chat room could not be created for the direct message.");
                }
                const messages = yield db_1.prismaClient.message.findMany({
                    where: { chatRoomId: chatRoom[0].id },
                    include: { sender: true },
                    orderBy: { creationTime: 'asc' },
                });
                return messages;
            }
        });
    }
    static getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            const users = yield db_1.prismaClient.user.findMany();
            return users;
        });
    }
    static deleteUsersById(senderId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db_1.prismaClient.message.deleteMany({
                where: {
                    senderId: senderId,
                }
            });
            const deletedUser = yield db_1.prismaClient.user.delete({
                where: {
                    id: senderId,
                },
            });
            return deletedUser;
        });
    }
    static getSocketIdByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!userId) {
                throw new Error("User ID is undefined or null");
            }
            const user = yield db_1.prismaClient.user.findUnique({
                where: { id: userId },
                select: { socketId: true },
            });
            return user === null || user === void 0 ? void 0 : user.socketId;
        });
    }
    static updateSocketId(userId, socketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (socketId) {
                    return yield db_1.prismaClient.user.update({
                        where: { id: userId },
                        data: { socketId: socketId },
                    });
                }
                else {
                    return yield db_1.prismaClient.user.update({
                        where: { id: userId },
                        data: { socketId: null },
                    });
                }
            }
            catch (error) {
                console.error(`Failed to update socket ID for user ${userId}:`, error);
                throw error;
            }
        });
    }
    static deleteMsgOfChatroom(senderId, recieverId) {
        return __awaiter(this, void 0, void 0, function* () {
            const chatRoom = yield UserService.findChatRoom(senderId, recieverId);
            return yield db_1.prismaClient.message.deleteMany({
                where: { chatRoomId: chatRoom === null || chatRoom === void 0 ? void 0 : chatRoom.id }
            });
        });
    }
    static getAllGroup(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const chatRoom = yield db_1.prismaClient.chatRoom.findMany({
                where: {
                    isGroup: true,
                    users: {
                        some: {
                            id: userId
                        }
                    }
                },
                include: {
                    users: true
                }
            });
            return chatRoom;
        });
    }
    static findGroupByName(groupName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const group = yield db_1.prismaClient.chatRoom.findUnique({
                    where: {
                        name: groupName,
                    },
                });
                if (!group) {
                    console.log(`Group with name ${groupName} not found.`);
                    return null;
                }
                return group;
            }
            catch (error) {
                console.error('Error fetching group by name:', error);
                throw new Error('Unable to find group');
            }
        });
    }
    static updateSocketIdBySocket(socketId, newSocketId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield db_1.prismaClient.user.updateMany({
                where: { socketId: socketId },
                data: { socketId: newSocketId }
            });
        });
    }
    static deleteGroupByName(groupName) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(groupName);
            const chatRoom = yield db_1.prismaClient.chatRoom.findUnique({
                where: {
                    name: groupName
                }
            });
            yield db_1.prismaClient.message.deleteMany({
                where: {
                    chatRoomId: chatRoom === null || chatRoom === void 0 ? void 0 : chatRoom.id
                }
            });
            yield db_1.prismaClient.chatRoom.delete({ where: { name: groupName } });
        });
    }
    static updateGroupByName(groupName, userIds, newGroupName) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {
                name: newGroupName || groupName,
            };
            if (userIds) {
                updateData.users = {
                    connect: userIds.map((id) => ({ id })),
                };
            }
            const group = yield db_1.prismaClient.chatRoom.update({
                where: { name: groupName },
                data: updateData,
                include: {
                    users: true,
                },
            });
        });
    }
    static removeUserFromGroup(groupName, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db_1.prismaClient.chatRoom.update({
                where: { name: groupName },
                data: {
                    users: {
                        disconnect: { id: userId }
                    }
                },
                include: {
                    users: true,
                }
            });
        });
    }
    static deleteChatById(chatId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db_1.prismaClient.message.delete({
                where: { id: chatId }
            });
        });
    }
}
exports.default = UserService;
