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
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const User_1 = require("./User");
function apolloGraphqlServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const server = new server_1.ApolloServer({
            typeDefs: `
            ${User_1.User.SignUpResponse}
            ${User_1.User.typeDefs}
            type Query {
                ${User_1.User.queries}
                
            }

            type Mutation {
                ${User_1.User.mutation}
            }
        `,
            resolvers: {
                Query: Object.assign({}, User_1.User.resolvers.queries),
                Mutation: Object.assign({}, User_1.User.resolvers.mutations)
            }
        });
        yield server.start();
        return server;
    });
}
exports.default = apolloGraphqlServer;
