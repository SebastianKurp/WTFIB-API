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
    cors: {
      origin: "https://www.sebastiankurpiel.com/",
      methods: "GET, POST",
      allowHeaders:[
         "Access-Control-Allow-Credentials",
         "true","Content-Type",
         "Access-Control-Allow-Origin",
         "Access-Control-Allow-Headers"
      ]
    },
    playground: true,
    introspection: true
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
