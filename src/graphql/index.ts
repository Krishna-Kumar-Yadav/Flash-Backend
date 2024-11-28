import { ApolloServer } from '@apollo/server';
import { User } from './User';

async function apolloGraphqlServer() {
    const server = new ApolloServer({
        typeDefs: `
            ${User.SignUpResponse}
            ${User.typeDefs}
            type Query {
                ${User.queries}
                
            }

            type Mutation {
                ${User.mutation}
            }
        `,
        resolvers: {
            Query: {
                ...User.resolvers.queries,

            },
            Mutation: {
                ...User.resolvers.mutations
            }
        }
    });

    await server.start()
    return server
}

export default apolloGraphqlServer