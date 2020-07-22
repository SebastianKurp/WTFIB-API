const fetch = require("node-fetch");
const fs = require("fs");

const BASE_HEADERS = {
  "cache-control": "no-cache",
  "Upgrade-Insecure-Requests": "1",
  Connection: "keep-alive",
  DNT: "1",
  "Accept-Language": "en-US,en;q=0.5",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:66.0) Gecko/20100101 Firefox/66.0"
};

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return "";
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

const clean = string => {
  return string.replace(/\W/g, "");
};

const toField = string => {
  return camelize(clean(string));
};

async function fetchSchema(options) {
  const url = `https://airtable.com/${options.base}/api/docs`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...BASE_HEADERS,
      Cookie: options.token
    }
  }).then(res => res.text());

  return res;
}

function keyTablesById(res) {
  const tablesById = res.tables.reduce((prev, table) => {
    const { id, name, columns, ...crap } = table;
    prev[id] = { id, name, columns };
    return prev;
  }, {});

  return {
    id: res.id,
    name: res.name,
    tablesById: tablesById
  };
}

function parseResponse(res) {
  const lines = res.split("\n");
  const line = lines.find(line => line.indexOf("window.application") !== -1);
  const json = line
    .split("window.application =")[1]
    .trim()
    .slice(0, -1);

  return JSON.parse(json);
}

function parse(data) {
  const tables = [];
  for (key in data.tablesById) {
    const table = data.tablesById[key];
    tables.push({
      id: table.id,
      name: table.name,
      columns: table.columns.map(column => {
        let options = {};

        if (column.type === "select") {
          options = {
            choices: Object.values(column.typeOptions.choices).map(c => {
              return c.name;
            })
          };
        }

        if (column.type === "foreignKey") {
          const foreignTable = data.tablesById[column.typeOptions.foreignTableId];
          options = {
            relationship: column.typeOptions.relationship,
            table: foreignTable.name
          };
        }

        if (column.type === "multiSelect") {
          options = {
            choices: Object.values(column.typeOptions.choices).map(c => {
              return c.name;
            })
          };
        }

        if (column.type === "number") {
          options = {
            format: column.typeOptions.format
          };
        }

        return {
          name: column.name,
          type: column.type,
          field: toField(column.name),
          options: options
        };
      })
    });
  }

  return {
    id: data.id,
    name: data.name,
    tables
  };
}

fetchSchema({
  base: "base goes here",
  token: ` brw=token goes here`
})
  .then(parseResponse)
  .then(keyTablesById)
  .then(parse)
  .then(json => fs.writeFileSync("schema.json", JSON.stringify(json, null, 2)));
