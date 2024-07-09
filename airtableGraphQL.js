const fs = require("fs");
const path = require("path");
const airtable = require("airtable");

const convertSchema = require("./helpers/convertSchema");
const createResolvers = require("./helpers/createResolvers");

class AirtableGraphQL {
  constructor({ apiKey, base, schema }) {
    this.columns = {};
    this.loadColumns();
    airtable.configure({ apiKey });

    this.api = airtable.base(base);
    this.schema = convertSchema(schema, this.columns);
    this.resolvers = createResolvers(schema, this.api, this.columns);
  }

  loadColumns() {
    const normalizedPath = path.join(__dirname, "columns");
    fs.readdirSync(normalizedPath).forEach((file) => {
      require("./columns/" + file)(this);
    });
  }

  addColumnSupport(columnType, config) {
    this.columns = {
      ...this.columns,
      [columnType]: config,
    };
  }
}

module.exports = AirtableGraphQL;
