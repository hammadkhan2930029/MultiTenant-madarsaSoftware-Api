import { z } from 'zod';

export const URDU_RELATIONSHIP_MESSAGE = 'رشتہ صرف اردو میں درج کریں۔';

const URDU_RELATIONSHIP_PATTERN = /^[\p{Script=Arabic}\p{Mark}\s،؛؟۔]+$/u;
const URDU_LETTER_PATTERN = /(?=\p{Script=Arabic})\p{Letter}/u;

export const isValidUrduRelationship = (value) => {
  const relationship = String(value ?? '').trim();
  if (!relationship || /[A-Za-z]|\p{Number}/u.test(relationship)) return false;
  return URDU_LETTER_PATTERN.test(relationship) && URDU_RELATIONSHIP_PATTERN.test(relationship);
};

export const urduRelationshipField = () => z
  .string({ required_error: 'رشتہ لازمی درج کریں۔' })
  .trim()
  .min(1, 'رشتہ لازمی درج کریں۔')
  .max(50, 'رشتہ بہت لمبا ہے۔')
  .refine(isValidUrduRelationship, URDU_RELATIONSHIP_MESSAGE);
