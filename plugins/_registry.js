// internal registry — index.js populate karta hai
let allPlugins = [];
module.exports = {
  set: (list) => { allPlugins = list; },
  all: () => allPlugins,
};
