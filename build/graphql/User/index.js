"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const queries_1 = require("./queries");
const resolvers_1 = require("./resolvers");
const typeDefs_1 = require("./typeDefs");
const mutations_1 = require("./mutations");
const signUpResponse_1 = require("./signUpResponse");
exports.User = { queries: queries_1.queries, mutation: mutations_1.mutation, typeDefs: typeDefs_1.typeDefs, resolvers: resolvers_1.resolvers, SignUpResponse: signUpResponse_1.SignUpResponse };
