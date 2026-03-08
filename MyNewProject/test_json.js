const dirtyJSON = require('dirty-json');

const text = `{
  "title": "Calculus Integration Tests",
  "script": "Topic 1: Ever wondered if an infinite series adds up to a finite number? Let's dive into the Integral Test for series convergence!\\n\\nImagine you have a series, like the sum of 1 over n squared. We can use the Integral Test t\\\\_ \\\\e"
}`;

console.log("Original text:");
console.log(text);

try {
    let sanitizedText = text;
    // sanitizedText = sanitizedText.replace(/(?<!\\)\n/g, '\\n'); // this was causing issues
    
    // We can't safely use lookbehind in all JS engines.
    // Let's just manually replace NEWLINES with \\n IF they are actual newlines (not \n).
    // Actually the text variable above has literal newlines in the formatting!
    
    console.log("Parsed Standard:", JSON.parse(text));
} catch (e) {
    console.log("Standard failed:", e.message);
    try {
        console.log("Parsed Dirty:", dirtyJSON.parse(text));
    } catch (err) {
        console.log("Dirty failed:", err.message);
    }
}
