import UserService from "../services/user";

const socketIo = async (socket: any, io: any) => {
  console.log(`User connected: ${socket.id}`);

  // Register user with their socket ID
  socket.on("register", async (userId: string) => {
    try {
      if (userId) {
        await UserService.updateSocketId(userId, socket.id); // Store the user's socket ID
        console.log(`User registered: ${userId} with socket ID: ${socket.id}`);
      }
    } catch (error) {
      console.error(`Error updating socket ID for user ${userId}:`, error);
    }
  });

  // Single chat message
  socket.on("newMessage", async (data: any) => {
    const { senderId, recieverId, content, chatRoomId } = data;

    try {
      const receiverSocketId = await UserService.getSocketIdByUserId(recieverId[0]);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveSingleMessage", {
          senderId,
          content,
          chatRoomId,
          timestamp: new Date(),
        });
        console.log(`Message sent to user ${recieverId}`);
      } else {
        console.log(`Recipient ${recieverId} is offline or not connected.`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // Group chat message
  socket.on("newGroupMessage", async (data: any) => {
    const { senderId, groupName, message, userIds } = data;

    try {
      const groupChatRoom = await UserService.findOrCreateGroupChatRoom(userIds, groupName, senderId);
      const chatRoomId = groupChatRoom.id;

      for (const userId of userIds) {
        const userSocketId = await UserService.getSocketIdByUserId(userId);

        if (userSocketId) {
          io.to(userSocketId).emit("receiveGroupMessage", {
            senderId,
            groupName,
            message,
            chatRoomId,
            timestamp: new Date(),
          });
          console.log(`Group message sent to user ${userId}`);
        } else {
          console.log(`User ${userId} is offline or not connected.`);
        }
      }
    } catch (error) {
      console.error("Error processing group chat message:", error);
    }
  });

  // User joins a group
  socket.on("joinGroup", async (data: any) => {
    const { userId, groupName } = data;

    try {
      const groupChatRoom = await UserService.findGroupByName(groupName);

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
      } else {
        console.log(`Group ${groupName} not found.`);
      }
    } catch (error) {
      console.error("Error adding user to group:", error);
    }
  });

  // User disconnects
  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.id}`);
    try {
      await UserService.updateSocketIdBySocket(socket.id, null);
    } catch (error) {
      console.error(`Error clearing socket ID for disconnected user ${socket.id}:`, error);
    }
  });
};

export default socketIo;
