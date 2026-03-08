const text = `{"title": "Some \n String", "other": "No newline here"}`;

// Let's replace any actual newline character (\n) that is NOT part of a \n escape
// JSON parse hates literal newlines inside strings.
let sanitized = text.replace(/\n(.*)/g, '\\n$1'); // simple test

console.log("Input:", text);
console.log("Sanitized:", sanitized);
try {
  console.log(JSON.parse(sanitized));
} catch(e) {
  console.log("FAIL:", e.message);
}
