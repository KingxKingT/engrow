// Quick test to verify your Gemini API key works
// Run with: node test-gemini.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ No GEMINI_API_KEY found in environment or .env file');
    process.exit(1);
  }

  console.log('✓ API key found:', process.env.GEMINI_API_KEY.slice(0, 8) + '...');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `A student answered a comprehension question.
The question: "How did Maria's feelings about London change?"
Expected: "She went from feeling lonely and unhappy to loving it and not wanting to leave"
Student wrote: "at first she was sad and lonely but then she liked it"

Does the student's answer contain the key idea?
Respond ONLY in JSON: {"correct": true/false, "feedback": "one sentence", "correction": "key idea in simple words"}`;

    console.log('Calling Gemini...');
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    console.log('✅ Raw response:', text);
    const parsed = JSON.parse(text);
    console.log('✅ Parsed JSON:', parsed);
    console.log('\n✅ Gemini is working correctly!');
  } catch (err) {
    console.error('\n❌ Gemini call failed:');
    console.error(err.message || err);
    if (err.message?.includes('API key')) {
      console.error('\n→ Your GEMINI_API_KEY is invalid or not authorized');
    } else if (err.message?.includes('429')) {
      console.error('\n→ Rate limit hit — wait 1 minute and try again');
    } else if (err.message?.includes('systemInstruction')) {
      console.error('\n→ SDK version too old — run: npm install @google/generative-ai@latest');
    }
  }
}

test();
