const dirtyJSON = require('dirty-json');
const text = `{"test": "ab\\_cd"}`;
try {
    console.log("Parsed Dirty:", dirtyJSON.parse(text));
} catch (err) {
    console.log("Dirty failed:", err.message);
}
