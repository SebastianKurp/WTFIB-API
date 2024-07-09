const {
    GraphQLID,
    GraphQLObjectType,
    GraphQLInterfaceType,
    GraphQLSchema,
    GraphQLList,
    GraphQLString,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLInputObjectType,
    ...graphql
  } = require("graphql");
  
  const gql = require("graphql-tag");
  const sanitize = require("./sanitize");
  
  const airtableImage = new GraphQLObjectType({
    name: "AirtableImage",
    fields: () => ({
      url: { type: GraphQLString },
      width: { type: GraphQLInt },
      height: { type: GraphQLInt }
    })
  });
  
  const airtableThumbnail = new GraphQLObjectType({
    name: "AirtableThumbnails",
    fields: () => ({
      small: { type: airtableImage },
      large: { type: airtableImage },
      full: { type: airtableImage }
    })
  });
  
  const airtableAttachment = new GraphQLObjectType({
    name: "AirtableAttachment",
    fields: () => ({
      id: { type: new GraphQLNonNull(GraphQLID) },
      url: { type: GraphQLString },
      filename: { type: GraphQLString },
      type: { type: GraphQLString },
      thumbnails: { type: airtableThumbnail }
    })
  });
  
  const airtableImageInput = new GraphQLInputObjectType({
    name: "AirtableImageInput",
    fields: () => ({
      url: { type: GraphQLString },
      width: { type: GraphQLInt },
      height: { type: GraphQLInt }
    })
  });
  
  const airtableThumbnailInput = new GraphQLInputObjectType({
    name: "AirtableThumbnailsInput",
    fields: () => ({
      small: { type: airtableImageInput },
      large: { type: airtableImageInput },
      full: { type: airtableImageInput }
    })
  });
  
  const airtableAttachmentInput = new GraphQLInputObjectType({
    name: "AirtableAttachmentInput",
    fields: () => ({
      id: { type: new GraphQLNonNull(GraphQLID) },
      url: { type: GraphQLString },
      filename: { type: GraphQLString },
      type: { type: GraphQLString },
      thumbnails: { type: airtableThumbnailInput }
    })
  });
  
  module.exports = (airtableSchema, columnSupport) => {
    const TYPES = [];
    const INPUTS = [];
  
    const mutationType = {
      name: "Mutation",
      fields: {}
    };
  
    const queryType = {
      name: "Query",
      fields: {}
    };
  
    const getInputType = name => {
      if (name === "multipleAttachment") return airtableAttachmentInput;
      return INPUTS[`Create${name}Input`];
    };
  
    const getTableType = name => {
      if (name === "multipleAttachment") return GraphQLList(airtableAttachment);
      return TYPES[name];
    };
  
    queryType.fields.tables = {
      type: new GraphQLList(GraphQLString)
    };
  
    const buildTableColumns = (table, columnSupport, inputPayload) => {
      return table.columns.reduce((columns, column) => {
        const typeBuilder = columnSupport[column.type] || columnSupport["text"];
        const fieldName = sanitize.toField(column.name);
  
        columns[fieldName] = typeBuilder.graphqlType(column, {
          getTableType,
          getInputType,
          inputPayload
        });
  
        return columns;
      }, {});
    };
  
    airtableSchema.tables.forEach(table => {
      const typeName = sanitize.toType(table.name);
      TYPES[table.name] = new GraphQLObjectType({
        name: typeName,
        fields: () => ({
          id: { type: GraphQLID },
          ...buildTableColumns(table, columnSupport)
        })
      });
  
      INPUTS[`Create${table.name}Input`] = new GraphQLInputObjectType({
        name: `Create${table.name}Input`,
        fields: () => ({
          ...buildTableColumns(table, columnSupport, true)
        })
      });
  
      INPUTS[`Update${table.name}Input`] = new GraphQLInputObjectType({
        name: `Update${table.name}Input`,
        fields: () => ({
          ...buildTableColumns(table, columnSupport, true)
        })
      });
  
      mutationType.fields[`delete${typeName}`] = {
        type: getTableType(table.name),
        args: {
          id: { type: new GraphQLNonNull(GraphQLID) }
        },
        resolve: (value, { id }) => {
          return GraphQLID;
        }
      };
  
      mutationType.fields[`create${typeName}`] = {
        type: getTableType(table.name),
        args: {
          input: { type: getInputType(table.name) }
        },
        resolve: (value, { id, input }) => {
          return getTableType(table.name);
        }
      };
  
      mutationType.fields[`update${typeName}`] = {
        type: getTableType(table.name),
        args: {
          id: { type: new GraphQLNonNull(GraphQLID) },
          input: { type: getInputType(table.name) }
        },
        resolve: (value, { id, input }) => {
          return getTableType(table.name);
        }
      };
  
      const all = sanitize.plural(sanitize.toField(table.name));
      queryType.fields[all] = {
        type: new GraphQLList(TYPES[table.name])
      };
  
      const single = sanitize.singular(sanitize.toField(table.name));
      queryType.fields[single] = {
        type: TYPES[table.name],
        args: {
          id: { type: new GraphQLNonNull(GraphQLID) }
        }
      };
    });
  
    return new GraphQLSchema({
      query: new GraphQLObjectType(queryType),
      mutation: new GraphQLObjectType(mutationType)
    });
  };
  