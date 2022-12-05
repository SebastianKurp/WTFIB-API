require("dotenv").config();
const { PORT, BASE_ID, API_KEY } = process.env;

const { makeExecutableSchema } = require("graphql-tools");
const { printSchema } = require("graphql");
const { ApolloServer, gql } = require("apollo-server");
const AirtableGraphQL = require("@draftbit/airtable-graphql");

const schema = require("./schema.json");

const ag = new AirtableGraphQL({
  schema,
  base: BASE_ID,
  apiKey: API_KEY
});

const baseSchema = makeExecutableSchema({
  typeDefs: printSchema(ag.schema),
  resolvers: ag.resolvers
});

async function start() {
  const schema = baseSchema

  const server = new ApolloServer({
    schema,
    playground: true,
    introspection: true,
    cors: {
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      preflightContinue: false,
      optionsSuccessStatus: 204,
      credentials: true
    }
  });

  server.listen({ port: PORT || 8080 }).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
}

try {
  start();
} catch (error) {
  console.error(error);
  process.exit(1);
}
