const text = `{"title": "Some \n String", "other": "No newline here"}`;

let sanitized = text;
sanitized = sanitized.replace(/\n/g, '\\n');
sanitized = sanitized.replace(/\r/g, '\\r');
sanitized = sanitized.replace(/\t/g, '\\t');

console.log("Input:", text);
console.log("Sanitized:", sanitized);
try {
  console.log("Parsed:", JSON.parse(sanitized));
} catch(e) {
  console.log("FAIL:", e.message);
}
