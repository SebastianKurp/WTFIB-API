const sanitize = require("./sanitize");

module.exports = (airtableSchema, api, columnSupport) => {
  const fetchRecord = (api, table, id) =>
    new Promise((resolve, reject) => {
      api(table).find(id, (err, record) => {
        if (err) {
          reject(err);
        }
        resolve(record);
      });
    });

  const createRecord = (api, table, input) =>
    new Promise((resolve, reject) => {
      const t = airtableSchema.tables.find(t => t.name === table);
      const payload = {};

      Object.keys(input).map(key => {
        t.columns.map(column => {
          if (column.field === key) {
            payload[column.name] = input[key];
          }
        });
      });

      api(table).create(payload, (err, record) => {
        if (err) {
          reject(err);
        }

        resolve(record);
      });
    });

  const updateRecord = (api, table, args) =>
    new Promise((resolve, reject) => {
      const t = airtableSchema.tables.find(t => t.name === table);
      const payload = {};

      Object.keys(args.input).map(key => {
        t.columns.map(column => {
          if (column.field === key) {
            payload[column.name] = args.input[key];
          }
        });
      });

      api(table).update(args.id, payload, (err, record) => {
        if (err) {
          reject(err);
        }

        resolve(record);
      });
    });

  const deleteRecord = (api, table, id) =>
    new Promise((resolve, reject) => {
      api(table).destroy(id, (err, record) => {
        if (err) {
          reject(err);
        }

        resolve(record);
      });
    });

  const resolversForTable = (table, api) => {
    return table.columns.reduce((resolvers, column) => {
      let columnBuilder = columnSupport[column.type];
      if (!columnBuilder || !columnBuilder.resolver) {
        columnBuilder = columnSupport["text"];
      }
      resolvers[sanitize.toField(column.name)] = columnBuilder.resolver(
        column,
        api
      );
      return resolvers;
    }, {});
  };

  const resolverForAll = (table, api) => () =>
    new Promise((resolve, reject) => {
      let results = [];
      api(table.name)
        .select()
        .eachPage(
          (records, nextPage) => {
            results = [...results, ...records];
            nextPage();
          },
          err => {
            resolve(results);
          }
        );
    });

  const resolverForSingle = (table, api) => async (_, args) => {
    return fetchRecord(api, table.name, args.id);
  };

  const resolverForDelete = (table, api) => (_, args) => {
    return deleteRecord(api, table.name, args.id);
  };

  const resolverForUpdate = (table, api) => (_, args) => {
    return updateRecord(api, table.name, args);
  };

  const resolverForCreate = (table, api) => async (_, args) => {
    return createRecord(api, table.name, args.input);
  };

  const resolvers = {
    Query: {},
    Mutation: {}
  };

  resolvers.Query.tables = () => {
    return airtableSchema.tables.map(t => t.name);
  };

  airtableSchema.tables.forEach(table => {
    const all = sanitize.plural(sanitize.toField(table.name));
    resolvers.Query[all] = resolverForAll(table, api);

    const single = sanitize.singular(sanitize.toField(table.name));
    resolvers.Query[single] = resolverForSingle(table, api);

    const typeName = sanitize.toType(table.name);
    resolvers[typeName] = resolversForTable(table, api);

    resolvers.Mutation[`delete${typeName}`] = resolverForDelete(table, api);
    resolvers.Mutation[`create${typeName}`] = resolverForCreate(table, api);
    resolvers.Mutation[`update${typeName}`] = resolverForUpdate(table, api);
  });

  return resolvers;
};