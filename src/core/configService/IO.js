const fs = require('fs');
const path = require('path');

const IO = {
  ls: (directory, extensionFilters) => {
    try {
      if (!_.isArray(extensionFilters)) extensionFilters = [extensionFilters];

      let files = fs.readdirSync(directory, { withFileTypes: true }); // list directory content
      files = _.filter(files, f => !f.isDirectory() && _.indexOf(extensionFilters, path.extname(f.name)) > -1); // filter by extension
      files = _.map(files, m => m.name); // get only names

      return files;
    } catch (e) {
      // TODO: log the error
      return [];
    }

  },
  cat: (filePath) => {
    try {
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      // TODO: log the error
      return '';
    }
  },
  nano: (filePath, fileContent) => {
    try {
      fs.writeFileSync(filePath, fileContent, { encoding: 'utf8', flag: 'w' });

      return true;
    } catch (e) {
      // TODO: log the error
      return false;
    }
  },
};

module.exports = IO;