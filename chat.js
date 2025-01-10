import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("--your-gemini-key");

async function chatWithBook(userQuestion) {
  try {
    const pc = new Pinecone({ 
      apiKey: '--your-pinecone-key'
    });
    
    const index = pc.index('example-index');
    const queryEmbedding = await pc.inference.embed(
      'multilingual-e5-large',
      [userQuestion],
      { inputType: 'passage' }
    );

    const searchResults = await index.namespace('books').query({
      vector: queryEmbedding[0].values,
      topK: 5,
      includeMetadata: true
    });

    const context = searchResults.matches
      .map(match => match.metadata.text)
      .join('\n\n');

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Context from the book:
${context}

Question: ${userQuestion}

Please answer the question based on the context provided. If you're not sure about something, please say so.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function main() {
  try {
    const question = "What is the book about?";
    const answer = await chatWithBook(question);
    console.log('Question:', question);
    console.log('Answer:', answer);
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();