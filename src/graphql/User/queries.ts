export const queries = `
        getCurrentLoggedInUser: User
        getAllUsers: [User!]!
        getAllMessages(senderId: String!, recieverId: [ID!]!,groupName : String): [Message!] 
        getAllGroup(userId : String!): [Group!]!
        getChatRoom(senderId : String,recieverId : String,groupName : String) : ChatRoom!
`;
