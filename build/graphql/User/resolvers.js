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
exports.resolvers = void 0;
const user_1 = __importDefault(require("../../services/user"));
const queries = {
    getCurrentLoggedInUser: (_, parameters, context) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!context || !context.user) {
                throw new Error("User not authenticated");
            }
            const user = yield user_1.default.getUserById(context.user.id);
            //console.log(user);
            if (!user) {
                throw new Error("User not found");
            }
            return user;
        }
        catch (err) {
            console.error("Error retrieving current user:", err);
            return { success: false, message: err || "Failed to retrieve user" };
        }
    }),
    getAllUsers: () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const users = yield user_1.default.getAllUsers();
            return users;
        }
        catch (error) {
            console.error("Error fetching users:", error);
            throw new Error("Could not fetch users");
        }
    }),
    getAllMessages: (_, payload) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const messages = yield user_1.default.fetchConversation(payload);
            return messages;
        }
        catch (err) {
            console.log(err);
        }
    }),
    getAllGroup: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { userId }) {
        try {
            const chatRooms = yield user_1.default.getAllGroup(userId);
            return chatRooms;
        }
        catch (err) {
            console.log(err);
        }
    }),
    getChatRoom: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { senderId, recieverId, groupName }) {
        try {
            if (!groupName) {
                const chatRoom = yield user_1.default.findChatRoom(senderId, recieverId);
                if (!chatRoom)
                    throw new Error("Failed to fetch single chatroom");
                return chatRoom;
            }
            else if (groupName) {
                const chatRoom = yield user_1.default.findGroupByName(groupName);
                if (!chatRoom)
                    throw new Error("Failed to fetch group chatroom");
                return chatRoom;
            }
        }
        catch (err) {
            console.log(err);
        }
    })
};
const mutations = {
    signUp: (_, payload) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const res = yield user_1.default.signUp(payload);
            return { success: true, message: "New user created successfully", data: res };
        }
        catch (err) {
            console.error("Error during sign-up:", err);
            return { success: false, message: "Server Error" };
        }
    }),
    signIn: (_1, payload_1, _a) => __awaiter(void 0, [_1, payload_1, _a], void 0, function* (_, payload, { res }) {
        try {
            const token = yield user_1.default.signIn(payload);
            res.cookie("token", token, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
            });
            return { success: true, message: "User signed in successfully", token };
        }
        catch (err) {
            console.error("Error during sign-in:", err);
            return { success: false, message: "Failed to sign in. Invalid credentials or server error." };
        }
    }),
    sendMsg: (_1, payload_1, _a) => __awaiter(void 0, [_1, payload_1, _a], void 0, function* (_, payload, { io }) {
        try {
            const message = yield user_1.default.sendMessage(payload);
            const isGroupChat = payload.groupName;
            if (isGroupChat) {
                const groupParticipants = payload.recieverId;
                for (const participant of groupParticipants) {
                    if (participant !== payload.senderId) {
                        const receiverSocketId = yield user_1.default.getSocketIdByUserId(participant);
                        if (receiverSocketId) {
                            io.to(receiverSocketId).emit("receiveGroupMessage", {
                                groupId: payload.recieverId,
                                senderId: payload.senderId,
                                content: payload.content,
                                groupName: isGroupChat,
                                timestamp: new Date(),
                            });
                        }
                        else {
                            console.log(`Participant with ID ${participant} is not connected or socketId not found.`);
                        }
                    }
                }
            }
            else {
                // Handle single chat
                const reciever = payload.recieverId[0];
                const receiverSocketId = yield user_1.default.getSocketIdByUserId(reciever);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receiveSingleMessage", {
                        senderId: payload.senderId,
                        content: payload.content,
                        timestamp: new Date(),
                    });
                }
                else {
                    console.log(`Recipient with ID ${payload.recieverId} is not connected or socketId not found.`);
                }
            }
            return message; // Return the saved message
        }
        catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    }),
    deleteUser: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { senderId }) {
        try {
            const deletedUser = user_1.default.deleteUsersById(senderId);
            return deletedUser;
        }
        catch (err) {
            console.log(err);
        }
    }),
    deleteMsgOfChatroom: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { senderId, recieverId }) {
        try {
            if (senderId && recieverId) {
                yield user_1.default.deleteMsgOfChatroom(senderId, recieverId);
                return { success: true };
            }
            else {
                return { success: false };
            }
        }
        catch (err) {
            console.log(err);
            return { success: false };
        }
    }),
    inGroup: (_1, _a, _b) => __awaiter(void 0, [_1, _a, _b], void 0, function* (_, { userIds, adminId, groupName }, { io }) {
        try {
            const chatRoom = yield user_1.default.findOrCreateGroupChatRoom(userIds, groupName, adminId);
            for (const userId of userIds) {
                try {
                    const userSocketId = yield user_1.default.getSocketIdByUserId(userId);
                    if (userSocketId) {
                        io.to(userSocketId).emit("joinGroup", {
                            userId,
                            groupName: chatRoom.name,
                            chatRoomId: chatRoom.id,
                            adminId: chatRoom.adminId,
                            timestamp: new Date(),
                        });
                    }
                    else {
                        console.log(`Socket ID not found for user ID: ${userId}`);
                    }
                }
                catch (error) {
                    console.error(`Failed to notify user ${userId} about group creation:`, error);
                }
            }
            return chatRoom;
        }
        catch (err) {
            console.error("Error creating or finding group chat room:", err);
            throw new Error("Failed to create or notify group");
        }
    }),
    deleteGroup: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { groupName }) {
        try {
            yield user_1.default.deleteGroupByName(groupName);
            return { success: true };
        }
        catch (err) {
            console.log(err);
            return { success: false };
        }
    }),
    updateGroup: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { groupName, userIds, newGroupName }) {
        try {
            yield user_1.default.updateGroupByName(groupName, userIds, newGroupName);
            return { success: true };
        }
        catch (err) {
            console.log(err);
            return { success: false };
        }
    }),
    deleteUserFromGroup: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { groupName, userId }) {
        try {
            yield user_1.default.removeUserFromGroup(groupName, userId);
            return { success: true };
        }
        catch (err) {
            console.log(err);
            return { success: false };
        }
    }),
    deleteChat: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { chatId }) {
        try {
            yield user_1.default.deleteChatById(chatId);
            return { success: true, message: "Message Deleted" };
        }
        catch (err) {
            console.log(err);
            return { success: false, message: "Message Deletion Failed" };
        }
    })
};
exports.resolvers = { queries, mutations };
