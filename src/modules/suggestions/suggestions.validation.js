import { z } from 'zod';

export const createSuggestionValidationSchema = z.object({
  body: z.object({
    type: z.string().trim().min(2, 'Suggestion type is required.').max(100, 'Suggestion type is too long.'),
    title: z.string().trim().min(3, 'Suggestion title is required.').max(180, 'Suggestion title is too long.'),
    priority: z.enum(['normal', 'important', 'urgent']).default('normal'),
    description: z.string().trim().min(5, 'Suggestion detail is required.').max(3000, 'Suggestion detail is too long.'),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listSuggestionsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['new', 'reviewed', 'closed']).optional(),
    priority: z.enum(['normal', 'important', 'urgent']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
