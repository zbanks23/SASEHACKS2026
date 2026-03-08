const dirtyJSON = require('dirty-json');
const text = `{\n  "title": "foo"\n}`;
let sanitizedText = text.replace(/\n/g, '\\n');
try {
  console.log(dirtyJSON.parse(sanitizedText));
} catch(e) {
  console.log("Error:", e.message);
}
