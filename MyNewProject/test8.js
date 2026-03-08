const dirtyJSON = require('dirty-json');
try {
  console.log(dirtyJSON.parse('{"text": "He said "hello""}'));
} catch(e) {
  console.log("Error:", e.message);
}
