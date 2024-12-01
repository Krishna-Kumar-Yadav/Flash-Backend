import { randomBytes, createHmac } from "crypto";
import { prismaClient } from "../models/db";
import JWT from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { connect } from "http2";
import { disconnect } from "process";



export interface createUserPayload {
    fullName: string
    mobileNumber: string
    email: string
    dateOfBirth: string
    password: string
}

export interface signInUserPayload {
    email: string,
    password: string
}

export interface getMessages {
    senderId: string,
    recieverId: string[],
    groupName?: string
}

export interface sendMessages {
    senderId: string;
    recieverId: string[];
    content: string;
    groupName?: string;
    adminId?: any;
}

const tokenKey = process.env.JWT_SECRET_KEY || 'p@r@mpit@p@rm@shw@r';

class UserService {


    private static async getUserByEmail(email: string) {
        return prismaClient.user.findUnique({ where: { email } });
    }

    private static generateHashedPassword(salt: string, password: string) {
        const hashedPassword = createHmac("sha256", salt).update(password).digest("hex");
        return hashedPassword;
    }

    private static generateToken(payload: object, tokenKey: string) {
        const token = JWT.sign(payload, tokenKey);
        return token;
    }

    public static decodeToken(token: string) {
        const payload = JWT.verify(token, tokenKey)
        return payload
    }

    public static async signUp(payload: createUserPayload) {
        const { fullName, mobileNumber, email, dateOfBirth, password } = payload;

        const userExist = await prismaClient.user.findUnique({
            where: { email }
        });

        if (userExist) {
            throw new Error("User with this email already exists.");
        }

        const formattedDate = new Date(dateOfBirth).toISOString();


        const salt = randomBytes(32).toString('hex');
        const hashedPassword = UserService.generateHashedPassword(salt, password)
        return prismaClient.user.create({
            data: {
                fullName,
                mobileNumber,
                email,
                dateOfBirth: formattedDate,
                password: hashedPassword,
                salt

            }

        })
    }


    public static async signIn(payload: signInUserPayload) {
        const { email, password } = payload;
        const userExist = await UserService.getUserByEmail(email)
        if (!userExist) {
            throw new Error("User not Exists")

        }

        const salt = userExist.salt;
        const storedPassword = userExist.password;

        const hashedPassword = UserService.generateHashedPassword(salt, password)

        if (storedPassword !== hashedPassword) throw new Error("Wrong Password")

        //generate token


        const token = UserService.generateToken({ id: userExist.id, email: userExist.email }, tokenKey);
        return token;




    }

    public static async getUserById(id: string) {
        const user = prismaClient.user.findUnique({ where: { id } })
        console.log(user);

        return user
    }


    public static findChatRoom(senderId: string, receiverId: string) {

        if (!senderId || !receiverId) {
            throw new Error("Both senderId and receiverId must be provided.");
        }

        const chatRoom = prismaClient.chatRoom.findFirst({
            where: {
                AND: [
                    { users: { some: { id: senderId } } },
                    { users: { some: { id: receiverId } } }
                ]
            }

        });

        return chatRoom;

    }


    private static async findOrCreateChatRoom(userId1: string, userId2: string) {
        let chatRoom = await prismaClient.chatRoom.findFirst({
            where: {
                users: {
                    every: {
                        id: { in: [userId1, userId2] }
                    }
                }
            }
        });

        if (!chatRoom) {
            chatRoom = await prismaClient.chatRoom.create({
                data: {
                    name: `Chat between ${userId1} and ${userId2}`,
                    users: {
                        connect: [{ id: userId1 }, { id: userId2 }],
                    },
                },
            });
        }

        return chatRoom;
    }

    public static async findOrCreateGroupChatRoom(userIds: any, groupName: string, adminId: string) {
        if (!userIds || userIds.length < 2) {
            throw new Error("A group chat must have at least two users.");
        }

        const existingGroups = await prismaClient.chatRoom.findUnique({
            where: {
                name: groupName,
                isGroup: true,
            },
            include: {
                users: true
            },
        })

        if (existingGroups) return existingGroups;

        const newRoom = await prismaClient.chatRoom.create({
            data: {
                name: groupName,
                isGroup: true,
                users: {
                    connect: userIds.map((id: string) => ({ id }))
                },
                adminId: adminId
            },
            include: {
                users: true
            }
        });

        return newRoom;
    }

    public static async sendMessage(payload: sendMessages) {
        if (!payload.groupName) {
            // Single chat logic
            const receiverId = payload.recieverId[0];

            const chatRoom = await UserService.findOrCreateChatRoom(payload.senderId, receiverId);

            if (!chatRoom) {
                throw new Error("Chat room could not be created for the direct message.");
            }

            return await prismaClient.message.create({
                data: {
                    content: payload.content,
                    senderId: payload.senderId,
                    chatRoomId: chatRoom.id,

                },
            });
        } else {
            // Group chat logic
            const chatRoom = await UserService.findOrCreateGroupChatRoom(payload.recieverId, payload.groupName, payload.adminId);

            if (!chatRoom) {
                throw new Error("Chat room could not be created or found for the group message.");
            }

            return await prismaClient.message.create({
                data: {
                    content: payload.content,
                    senderId: payload.senderId,
                    chatRoomId: chatRoom.id,

                },
            });
        }
    }


    private static async findGroupChatRoom(groupName: string) {
        return await prismaClient.chatRoom.findMany({
            where: {
                name: groupName,
                isGroup: true,

            },
            include: {
                users: true
            },
        })
    }

    public static async fetchConversation(payload: getMessages) {
        if (!payload.groupName) {
            const chatRoom = await UserService.findOrCreateChatRoom(payload.senderId, payload.recieverId[0]);

            if (!chatRoom) {
                throw new Error("Chat room could not be created for the direct message.");
            }

            const messages = await prismaClient.message.findMany({
                where: { chatRoomId: chatRoom.id },
                include: { sender: true },                        // To include sender details
                orderBy: { creationTime: 'asc' },
            });

            return messages;
        } else {
            const chatRoom = await UserService.findGroupChatRoom(payload.groupName)

            if (!chatRoom) {
                throw new Error("Chat room could not be created for the direct message.");
            }

            const messages = await prismaClient.message.findMany({
                where: { chatRoomId: chatRoom[0].id },
                include: { sender: true },
                orderBy: { creationTime: 'asc' },
            })

            return messages
        }

    }

    public static async getAllUsers() {
        const users = await prismaClient.user.findMany();

        return users;
    }

    public static async deleteUsersById(senderId: string) {
        await prismaClient.message.deleteMany({
            where: {
                senderId: senderId,
            }
        })

        const deletedUser = await prismaClient.user.delete({
            where: {
                id: senderId,
            },
        });
        return deletedUser;
    }

    public static async getSocketIdByUserId(userId: string | undefined) {

        if (!userId) {
            throw new Error("User ID is undefined or null");
        }

        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: { socketId: true },
        });
        return user?.socketId;
    }

    public static async updateSocketId(userId: string, socketId: string) {
        try {
            if (socketId) {
                return await prismaClient.user.update({
                    where: { id: userId },
                    data: { socketId: socketId },
                });
            } else {
                return await prismaClient.user.update({
                    where: { id: userId },
                    data: { socketId: null },
                });
            }
        } catch (error) {
            console.error(`Failed to update socket ID for user ${userId}:`, error);
            throw error;
        }
    }

    public static async deleteMsgOfChatroom(senderId: string, recieverId: string) {
        const chatRoom = await UserService.findChatRoom(senderId, recieverId)

        return await prismaClient.message.deleteMany({
            where: { chatRoomId: chatRoom?.id }
        })
    }

    public static async getAllGroup(userId: string) {
        const chatRoom = await prismaClient.chatRoom.findMany({
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
        return chatRoom
    }

    public static async findGroupByName(groupName: string) {
        try {
            const group = await prismaClient.chatRoom.findUnique({
                where: {
                    name: groupName,
                },
            });

            if (!group) {
                console.log(`Group with name ${groupName} not found.`);
                return null;
            }

            return group;
        } catch (error) {
            console.error('Error fetching group by name:', error);
            throw new Error('Unable to find group');
        }
    }

    public static async updateSocketIdBySocket(socketId: string, newSocketId: string | null) {
        return await prismaClient.user.updateMany({
            where: { socketId: socketId },
            data: { socketId: newSocketId }
        })
    }

    public static async deleteGroupByName(groupName: string) {
        console.log(groupName);

        const chatRoom = await prismaClient.chatRoom.findUnique({
            where: {
                name: groupName
            }
        })

        await prismaClient.message.deleteMany({
            where: {
                chatRoomId: chatRoom?.id
            }
        })

        await prismaClient.chatRoom.delete({ where: { name: groupName } });
    }

    public static async updateGroupByName(groupName: string, userIds: string[], newGroupName: string | null) {

        const updateData: any = {
            name: newGroupName || groupName,
        };

        if (userIds) {
            updateData.users = {
                connect: userIds.map((id) => ({ id })),
            };
        }

        const group = await prismaClient.chatRoom.update({
            where: { name: groupName },
            data: updateData,
            include: {
                users: true,
            },
        });

    }

    public static async removeUserFromGroup(groupName: string, userId: string) {
        await prismaClient.chatRoom.update({
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


    }

    public static async deleteChatById(chatId: string) {
        await prismaClient.message.delete({
            where: { id: chatId }
        })

    }



}

export default UserService;