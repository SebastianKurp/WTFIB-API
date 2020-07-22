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
  base: "appzBfSapK8j4MP6R",
  token: ` brw=brwVrlUruacSgYBLm; ajs_user_id=null; ajs_group_id=null; lightstep_guid/liveapp=7c424db47f697488; lightstep_session_id=63c0db3d095d202b; ajs_anonymous_id=%222a7f2880-09f7-4acd-9f7b-6c5dd596d4e9%22; express:sess=eyJzZXNzaW9uSWQiOiJzZXM1Z1lSVWVua09KbU9tNSIsImNzcmZTZWNyZXQiOiJvaUJ5Z2thUVdHeC12LUxNNXhpVW1vdm0iLCJoaWdoU2VjdXJpdHlNb2RlRW5hYmxlZFRpbWUiOjE1NjUyMTcwMjMxNzcsInVzZXJJZCI6InVzckpHa3dnODgwTXpweW5ZIn0=; express:sess.sig=xeXLRY0wuoOQH-3TwfnY6K3F4xo; __Host-airtable-session=eyJzZXNzaW9uSWQiOiJzZXM1Z1lSVWVua09KbU9tNSIsImNzcmZTZWNyZXQiOiJvaUJ5Z2thUVdHeC12LUxNNXhpVW1vdm0iLCJoaWdoU2VjdXJpdHlNb2RlRW5hYmxlZFRpbWUiOjE1NjUyMTcwMjMxNzcsInVzZXJJZCI6InVzckpHa3dnODgwTXpweW5ZIn0=; __Host-airtable-session.sig=F_cNctiqrLtv7HCfBgj9qtlF9vLbzpH62wEJoUrMKqE; AWSELB=F5E9CFCB0C87D62DB5D03914FDC2A2D2D45FBECE92075869B3F7F698D732FCC7347AFF1CEA0BC1262B9940A7DF1D234855648842F32F5D8337B76D8F27CD1ED10202C16A19; intercom-session-wb1whb4b=dXFGcEdiZTVnS0Zsb25zZ21aVGk5NGZ4LzV4dHVkU1RjaUhwOWRScVVRZTFtd2lzZ3RmcTVJcXBSM0x6NVNhcy0tbjJONnFGWThlV2QvNVl1NmY5SXExdz09--0868f8fb9e7e9c00c018f91e119b04fbae028fa1; userSignature=usrJGkwg880MzpynY2019-09-04T20:41:10.000Z; userSignature.sig=USP2ks8j51OOSrbsDQecXZiSPHa8LAUhLMMe2tDD8Uk`
})
  .then(parseResponse)
  .then(keyTablesById)
  .then(parse)
  .then(json => fs.writeFileSync("schema.json", JSON.stringify(json, null, 2)));
