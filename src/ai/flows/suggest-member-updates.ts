
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting member status updates based on member data analysis.
 *
 * - suggestMemberUpdates - A function that triggers the member update suggestion flow.
 * - SuggestMemberUpdatesInput - The input type for the suggestMemberUpdates function.
 * - SuggestMemberUpdatesOutput - The output type for the suggestMemberUpdates function.
 */

import { ai } from '@/ai/genkit';
import type { Socio } from '@/types';
import { z } from 'zod';
import { formatDate } from '@/lib/helpers';


const SuggestionSchema = z.object({
  memberId: z.string().describe('The ID (numeroSocio) of the member for whom the update is suggested.'),
  memberName: z.string().describe('The full name of the member.'),
  updateType: z
    .string()
    .describe(
      'The type of update suggested, e.g., "Apto Médico Vencido", "Apto Médico Inválido", "Socio Inactivo".'
    ),
  reason: z.string().describe('The reason for the suggested update, explaining the data that triggered it.'),
  urgency: z
    .enum(['Alta', 'Media', 'Baja'])
    .describe(
      'The urgency of the suggested update.'
    ),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;


const SuggestMemberUpdatesInputSchema = z.object({
  socios: z.array(z.any()).describe('An array of member objects, each containing member details like medical evaluation status, account activity, etc.'),
});
export type SuggestMemberUpdatesInput = z.infer<typeof SuggestMemberUpdatesInputSchema>;

const SuggestMemberUpdatesOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('An array of suggested member updates.'),
});
export type SuggestMemberUpdatesOutput = z.infer<typeof SuggestMemberUpdatesOutputSchema>;


export async function suggestMemberUpdates(input: SuggestMemberUpdatesInput): Promise<SuggestMemberUpdatesOutput> {
  const today = new Date().toISOString();
  
  // Create a simplified data structure for the prompt to reduce token usage and improve clarity
  const simplifiedSocios = input.socios.map((socio: Socio) => ({
    id: socio.numeroSocio,
    nombre: `${socio.nombre} ${socio.apellido}`,
    estadoSocio: socio.estadoSocio,
    aptoMedico: {
      valido: socio.aptoMedico.valido,
      fechaVencimiento: socio.aptoMedico.fechaVencimiento ? formatDate(socio.aptoMedico.fechaVencimiento) : 'N/A',
      razonInvalidez: socio.aptoMedico.razonInvalidez,
    }
  }));

  const flowInput = {
    socios: simplifiedSocios,
    currentDate: today,
  };

  return suggestMemberUpdatesFlow(flowInput);
}

const SuggestMemberUpdatesInternalInputSchema = z.object({
  socios: z.array(z.any()),
  currentDate: z.string().describe('The current date in ISO format (YYYY-MM-DD).'),
});

const suggestMemberUpdatesPrompt = ai.definePrompt({
  name: 'suggestMemberUpdatesPrompt',
  input: { schema: SuggestMemberUpdatesInternalInputSchema },
  output: { schema: SuggestMemberUpdatesOutputSchema },
  prompt: `You are an expert administrative assistant for a sports club. Your task is to analyze a list of club members and suggest administrative actions based on their status. The current date is {{currentDate}}.

Analyze the provided JSON array of members and generate suggestions for the following cases:

1.  **Apto Médico Vencido**: If a member's "aptoMedico.valido" is true but "aptoMedico.fechaVencimiento" is before the current date, suggest an action. The urgency should be 'Alta'. The reason should state that their medical permit expired on the given date.
2.  **Apto Médico Inválido**: If a member's "aptoMedico.valido" is false, suggest an action. The urgency is 'Alta'. The reason should mention the "razonInvalidez" if available.
3.  **Socio Inactivo**: If a member's "estadoSocio" is 'Inactivo', suggest a review. The urgency is 'Media'. The reason is their inactive status.

For each suggestion, provide the member's ID, their full name, the type of update, a clear reason, and the urgency level.

Member Data:
\`\`\`json
{{{json anidado=true socios}}}
\`\`\`

Return ONLY the JSON object with the suggestions, in the specified format. Do not include any other text or explanation.`,
});


const suggestMemberUpdatesFlow = ai.defineFlow(
  {
    name: 'suggestMemberUpdatesFlow',
    inputSchema: SuggestMemberUpdatesInternalInputSchema,
    outputSchema: SuggestMemberUpdatesOutputSchema,
  },
  async (input) => {
    const { output } = await suggestMemberUpdatesPrompt(input);
    return output || { suggestions: [] };
  }
);
