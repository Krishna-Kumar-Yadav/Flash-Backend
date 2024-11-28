import { queries } from "./queries";
import { resolvers } from "./resolvers";
import { typeDefs } from "./typeDefs";
import { mutation } from "./mutations";
import { SignUpResponse } from "./signUpResponse";

export const User = { queries, mutation, typeDefs, resolvers, SignUpResponse };