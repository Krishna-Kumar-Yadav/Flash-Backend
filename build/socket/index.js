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
const user_1 = __importDefault(require("../services/user"));
const socketIo = (socket, io) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`User connected: ${socket.id}`);
    // Register user with their socket ID
    socket.on("register", (userId) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (userId) {
                yield user_1.default.updateSocketId(userId, socket.id); // Store the user's socket ID
                console.log(`User registered: ${userId} with socket ID: ${socket.id}`);
            }
        }
        catch (error) {
            console.error(`Error updating socket ID for user ${userId}:`, error);
        }
    }));
    // Single chat message
    socket.on("newMessage", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { senderId, recieverId, content, chatRoomId } = data;
        try {
            const receiverSocketId = yield user_1.default.getSocketIdByUserId(recieverId[0]);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receiveSingleMessage", {
                    senderId,
                    content,
                    chatRoomId,
                    timestamp: new Date(),
                });
                console.log(`Message sent to user ${recieverId}`);
            }
            else {
                console.log(`Recipient ${recieverId} is offline or not connected.`);
            }
        }
        catch (error) {
            console.error("Error sending message:", error);
        }
    }));
    // Group chat message
    socket.on("newGroupMessage", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { senderId, groupName, message, userIds } = data;
        try {
            const groupChatRoom = yield user_1.default.findOrCreateGroupChatRoom(userIds, groupName, senderId);
            const chatRoomId = groupChatRoom.id;
            for (const userId of userIds) {
                const userSocketId = yield user_1.default.getSocketIdByUserId(userId);
                if (userSocketId) {
                    io.to(userSocketId).emit("receiveGroupMessage", {
                        senderId,
                        groupName,
                        message,
                        chatRoomId,
                        timestamp: new Date(),
                    });
                    console.log(`Group message sent to user ${userId}`);
                }
                else {
                    console.log(`User ${userId} is offline or not connected.`);
                }
            }
        }
        catch (error) {
            console.error("Error processing group chat message:", error);
        }
    }));
    // User joins a group
    socket.on("joinGroup", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { userId, groupName } = data;
        try {
            const groupChatRoom = yield user_1.default.findGroupByName(groupName);
            if (groupChatRoom) {
                socket.join(groupChatRoom.id);
                console.log(`${userId} joined group ${groupName}`);
                socket.emit("joinedGroup", { groupName, chatRoomId: groupChatRoom.id });
                // Notify all group members about the new user
                io.to(groupChatRoom.id).emit("userJoinedGroup", {
                    userId,
                    groupName,
                    timestamp: new Date(),
                });
            }
            else {
                console.log(`Group ${groupName} not found.`);
            }
        }
        catch (error) {
            console.error("Error adding user to group:", error);
        }
    }));
    // User disconnects
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`User disconnected: ${socket.id}`);
        try {
            yield user_1.default.updateSocketIdBySocket(socket.id, null);
        }
        catch (error) {
            console.error(`Error clearing socket ID for disconnected user ${socket.id}:`, error);
        }
    }));
});
exports.default = socketIo;
