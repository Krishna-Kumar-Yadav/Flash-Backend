import { User } from ".";
import UserService, { createUserPayload, getMessages, sendMessages, signInUserPayload } from "../../services/user";
import { Response } from "express";

const queries = {
    getCurrentLoggedInUser: async (_: any, parameters: any, context: any) => {
        try {

            if (!context || !context.user) {
                throw new Error("User not authenticated");
            }
            const user = await UserService.getUserById(context.user.id);
            //console.log(user);


            if (!user) {
                throw new Error("User not found");
            }
            return user;
        } catch (err) {
            console.error("Error retrieving current user:", err);
            return { success: false, message: err || "Failed to retrieve user" };
        }
    },

    getAllUsers: async () => {
        try {
            const users = await UserService.getAllUsers();
            return users;
        } catch (error) {
            console.error("Error fetching users:", error);
            throw new Error("Could not fetch users");
        }
    },

    getAllMessages: async (_: any, payload: getMessages) => {
        try {
            const messages = await UserService.fetchConversation(payload);
            return messages

        } catch (err) {
            console.log(err);

        }
    },

    getAllGroup: async (_: unknown, { userId }: { userId: string }) => {
        try {
            const chatRooms = await UserService.getAllGroup(userId);
            return chatRooms
        } catch (err) {
            console.log(err);

        }
    },

    getChatRoom: async (_: unknown, { senderId, recieverId, groupName }: { senderId: string, recieverId: string, groupName: string }) => {
        try {
            if (!groupName) {
                const chatRoom = await UserService.findChatRoom(senderId, recieverId);
                if (!chatRoom) throw new Error("Failed to fetch single chatroom")
                return chatRoom
            } else if (groupName) {
                const chatRoom = await UserService.findGroupByName(groupName);
                if (!chatRoom) throw new Error("Failed to fetch group chatroom")
                return chatRoom
            }
        } catch (err) {
            console.log(err);

        }
    }



};

const mutations = {
    signUp: async (_: any, payload: createUserPayload) => {
        try {
            const res = await UserService.signUp(payload);
            return { success: true, message: "New user created successfully", data: res };
        } catch (err) {
            console.error("Error during sign-up:", err);
            return { success: false, message: "Server Error" };
        }
    },


    signIn: async (_: any, payload: signInUserPayload, { res }: { res: Response }) => {
        try {
            const token = await UserService.signIn(payload);

            res.cookie("token", token, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
            });


            return { success: true, message: "User signed in successfully", token };
        } catch (err) {
            console.error("Error during sign-in:", err);

            return { success: false, message: "Failed to sign in. Invalid credentials or server error." };
        }
    },

    sendMsg: async (_: any, payload: sendMessages, { io }: { io: any }) => {
        try {
            const message = await UserService.sendMessage(payload);

            const isGroupChat = payload.groupName;

            if (isGroupChat) {

                const groupParticipants = payload.recieverId;
                for (const participant of groupParticipants) {

                    if (participant !== payload.senderId) {
                        const receiverSocketId = await UserService.getSocketIdByUserId(participant);

                        if (receiverSocketId) {
                            io.to(receiverSocketId).emit("receiveGroupMessage", {
                                groupId: payload.recieverId,
                                senderId: payload.senderId,
                                content: payload.content,
                                groupName: isGroupChat,
                                timestamp: new Date(),
                            });
                        } else {
                            console.log(`Participant with ID ${participant} is not connected or socketId not found.`);
                        }
                    }
                }
            } else {
                // Handle single chat
                const reciever = payload.recieverId[0]

                const receiverSocketId = await UserService.getSocketIdByUserId(reciever);

                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receiveSingleMessage", {
                        senderId: payload.senderId,
                        content: payload.content,
                        timestamp: new Date(),
                    });
                } else {
                    console.log(`Recipient with ID ${payload.recieverId} is not connected or socketId not found.`);
                }
            }

            return message; // Return the saved message
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },


    deleteUser: async (_: any, { senderId }: { senderId: string }) => {
        try {
            const deletedUser = UserService.deleteUsersById(senderId);
            return deletedUser;
        } catch (err) {
            console.log(err);

        }
    },

    deleteMsgOfChatroom: async (_: any, { senderId, recieverId }: { senderId: string, recieverId: string }) => {
        try {
            if (senderId && recieverId) {
                await UserService.deleteMsgOfChatroom(senderId, recieverId);
                return { success: true }
            } else {
                return { success: false }
            }
        } catch (err) {
            console.log(err);
            return { success: false }
        }
    },

    inGroup: async (_: any, { userIds, adminId, groupName }: { userIds: string[], adminId: string, groupName: string }, { io }: { io: any }) => {
        try {

            const chatRoom = await UserService.findOrCreateGroupChatRoom(userIds, groupName, adminId);

            for (const userId of userIds) {
                try {
                    const userSocketId = await UserService.getSocketIdByUserId(userId);

                    if (userSocketId) {
                        io.to(userSocketId).emit("joinGroup", {
                            userId,
                            groupName: chatRoom.name,
                            chatRoomId: chatRoom.id,
                            adminId: chatRoom.adminId,
                            timestamp: new Date(),
                        });
                    } else {
                        console.log(`Socket ID not found for user ID: ${userId}`);
                    }
                } catch (error) {
                    console.error(`Failed to notify user ${userId} about group creation:`, error);
                }
            }

            return chatRoom;
        } catch (err) {
            console.error("Error creating or finding group chat room:", err);
            throw new Error("Failed to create or notify group");
        }
    },

    deleteGroup: async (_: unknown, { groupName }: { groupName: string }) => {
        try {
            await UserService.deleteGroupByName(groupName);
            return { success: true }
        } catch (err) {
            console.log(err);
            return { success: false }

        }
    },

    updateGroup: async (_: unknown, { groupName, userIds, newGroupName }: { groupName: string, userIds: string[], newGroupName: string }) => {
        try {
            await UserService.updateGroupByName(groupName, userIds, newGroupName);
            return { success: true }
        } catch (err) {
            console.log(err);
            return { success: false }

        }
    },

    deleteUserFromGroup: async (_: unknown, { groupName, userId }: { groupName: string, userId: string }) => {
        try {
            await UserService.removeUserFromGroup(groupName, userId);
            return { success: true }
        } catch (err) {
            console.log(err);
            return { success: false }

        }
    },

    deleteChat: async (_: unknown, { chatId }: { chatId: string }) => {
        try {
            await UserService.deleteChatById(chatId);
            return { success: true, message: "Message Deleted" };
        } catch (err) {
            console.log(err);
            return { success: false, message: "Message Deletion Failed" };
        }
    }





};

export const resolvers = { queries, mutations };
