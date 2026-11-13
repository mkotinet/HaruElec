const fs = require('fs');
const path = require('path');

const sub1 = require('./sub1');
const sub2 = require('./sub2');
const sub3 = require('./sub3');
const sub4 = require('./sub4');
const sub5 = require('./sub5');

console.log(`Loaded subjects:`);
console.log(`- Sub 1 (전기자기학): ${sub1.length}`);
console.log(`- Sub 2 (전력공학): ${sub2.length}`);
console.log(`- Sub 3 (전기기기): ${sub3.length}`);
console.log(`- Sub 4 (회로이론 및 제어공학): ${sub4.length}`);
console.log(`- Sub 5 (전기설비기술기준): ${sub5.length}`);

const allRaw = [...sub1, ...sub2, ...sub3, ...sub4, ...sub5];
console.log(`Total questions loaded: ${allRaw.length}`);

const finalQuestions = allRaw.map((item, index) => {
  return {
    id: index + 1,
    ...item
  };
});

const outputPath = path.join(__dirname, '..', 'data', 'questions.json');
fs.writeFileSync(outputPath, JSON.stringify(finalQuestions, null, 2), 'utf8');

console.log(`Successfully written ${finalQuestions.length} questions to ${outputPath}!`);
