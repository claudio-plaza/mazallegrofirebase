'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting member status updates based on member data analysis.
 *
 * - suggestMemberUpdates - A function that triggers the member update suggestion flow.
 * - SuggestMemberUpdatesInput - The input type for the suggestMemberUpdates function.
 * - SuggestMemberUpdatesOutput - The output type for the suggestMemberUpdates function.
 */
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
const SuggestionSchema = z.object({
    memberId: z.string().describe('The ID of the member for whom the update is suggested.'),
    updateType: z
        .string()
        .describe('The type of update suggested, e.g., medical_evaluation_expired, account_inactivity, etc.'),
    reason: z.string().describe('The reason for the suggested update.'),
    urgency: z
        .string()
        .describe('The urgency of the suggested update, e.g., high, medium, low.'),
});
const SuggestMemberUpdatesInputSchema = z.object({
    memberData: z.string().describe('A stringified JSON array of member objects, each containing member details like medical evaluation status, account activity, etc.'),
});
const SuggestMemberUpdatesOutputSchema = z.object({
    suggestions: z.array(SuggestionSchema).describe('An array of suggested member updates.'),
});
export async function suggestMemberUpdates(input) {
    return suggestMemberUpdatesFlow(input);
}
const suggestMemberUpdatesPrompt = ai.definePrompt({
    name: 'suggestMemberUpdatesPrompt',
    model: googleAI.model('gemini-1.5-flash'),
    input: { schema: SuggestMemberUpdatesInputSchema },
    output: { schema: SuggestMemberUpdatesOutputSchema },
    prompt: `You are an AI assistant tasked with analyzing member data and suggesting updates to member statuses.

  Analyze the provided member data and identify members who may require updates to their status based on the following criteria:
  
  - Expired Medical Evaluations: Identify members whose medical evaluations have expired and suggest a status update to inactive until a new evaluation is submitted.
  - Account Inactivity: Identify members who have been inactive for a significant period (e.g., more than 6 months) and suggest account deactivation.
  
  Provide a list of suggestions, including the member ID, the type of update suggested, the reason for the suggestion, and the urgency of the update.
  
  Here is the member data:
  {{{memberData}}}
  
  Return ONLY the JSON object with the suggestions.`,
});
const suggestMemberUpdatesFlow = ai.defineFlow({
    name: 'suggestMemberUpdatesFlow',
    inputSchema: SuggestMemberUpdatesInputSchema,
    outputSchema: SuggestMemberUpdatesOutputSchema,
}, async (input) => {
    const { output } = await suggestMemberUpdatesPrompt(input);
    return output || { suggestions: [] };
});
