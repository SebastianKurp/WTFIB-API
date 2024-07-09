function isObject(obj) {
  return obj === Object(obj);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const groupByDate = (items) => {
  const obj = {};
  items.map((item) => {
    item.availableDates.map((key) => {
      if (Array.isArray(obj[key])) {
        obj[key].push(item);
      } else {
        obj[key] = [item];
      }
    });
  });
  return obj;
};

const mapFields = (mapper, response) => {
  return Object.entries(mapper).reduce((prev, [key, value]) => {
    if (isObject(value)) {
      const field = get(response, value.key, null);
      prev[key] = value.map(field);
    } else {
      prev[key] = get(response, value, null);
    }
    return prev;
  }, {});
};

const formatDate = (date) => {
  const month = new Date().getMonth() + 1;
  const monthStr = month < 10 ? `0${month}` : month;
  return `${new Date().getFullYear()}-${monthStr}-${date}`;
};

module.exports = {
  isObject,
  capitalizeFirstLetter,
  groupByDate,
  mapFields,
  formatDate,
};
