import { prisma } from '../config/prisma.js';

const DEFAULT_FAMILY_NUMBER = 'F-0001';

const parseSequencedNumber = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^(.*?)(\d+)$/);

  if (!match) return null;

  return {
    prefix: match[1],
    number: Number(match[2]),
    width: match[2].length,
  };
};

const buildFamilyNumber = ({ prefix, number, width }) => `${prefix}${String(number).padStart(width, '0')}`;

const buildNextFamilyNumber = (seed, existingFamilyNumbers = []) => {
  const parsedSeed = parseSequencedNumber(seed) || parseSequencedNumber(DEFAULT_FAMILY_NUMBER);

  const highestMatchingNumber = existingFamilyNumbers
    .map(parseSequencedNumber)
    .filter((item) => item && item.prefix === parsedSeed.prefix)
    .reduce((highest, item) => {
      if (!highest || item.number > highest.number) return item;
      return highest;
    }, null);

  if (!highestMatchingNumber) return buildFamilyNumber(parsedSeed);

  return buildFamilyNumber({
    ...highestMatchingNumber,
    number: highestMatchingNumber.number + 1,
  });
};

export const getNextFamilyNumber = async (tenantId, tx = prisma) => {
  const profile = await tx.madrassaProfile.findUnique({
    where: { tenantId },
    select: { familyNoSeq: true },
  });

  const parents = await tx.parent.findMany({
    where: {
      tenantId,
      familyNumber: { not: null },
    },
    select: { familyNumber: true },
  });

  return buildNextFamilyNumber(
    profile?.familyNoSeq || DEFAULT_FAMILY_NUMBER,
    parents.map((parent) => parent.familyNumber)
  );
};
