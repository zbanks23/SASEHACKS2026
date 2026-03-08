const dirtyJSON = require('dirty-json');

// This string has a LITERAL actual newline character inside the string value.
const text = `{"test": "ab
cd"}`;

console.log("Original text:");
console.log(text);

try {
    console.log("Parsed Standard:", JSON.parse(text));
} catch (e) {
    console.log("Standard failed:", e.message);
    try {
        console.log("Parsed Dirty:", dirtyJSON.parse(text));
    } catch (err) {
        console.log("Dirty failed:", err.message);
    }
}
