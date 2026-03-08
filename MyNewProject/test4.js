const dirtyJSON = require('dirty-json');
const text = `{\n  "test": "ab\ncd"\n}`;
const replaced = text.replace(/\n/g, '\\n');
try {
   console.log("Replaced:", replaced);
   console.log("Parsed Dirty:", dirtyJSON.parse(replaced));
} catch(e) {
   console.log("Dirty failed:", e.message);
}
