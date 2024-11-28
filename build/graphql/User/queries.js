"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queries = void 0;
exports.queries = `
        getCurrentLoggedInUser: User
        getAllUsers: [User!]!
        getAllMessages(senderId: String!, recieverId: [ID!]!,groupName : String): [Message!] 
        getAllGroup(userId : String!): [Group!]!
        getChatRoom(senderId : String,recieverId : String,groupName : String) : ChatRoom!
`;
