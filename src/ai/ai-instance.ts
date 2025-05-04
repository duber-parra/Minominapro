import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: 'AIzaSyBEdaK17t-QaB-yvUuP6--aZiBj-tNRiHk',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
