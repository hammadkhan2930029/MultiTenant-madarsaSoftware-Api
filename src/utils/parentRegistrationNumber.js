export const buildParentRegistrationNumber = (parentId) =>
  `PAR-${String(parentId).padStart(6, '0')}`;

export const assignParentRegistrationNumber = async (tx, tenantId, parentId) => {
  const registrationNumber = buildParentRegistrationNumber(parentId);

  await tx.parent.update({
    where: { id: parentId, tenantId },
    data: { registrationNumber },
  });

  return registrationNumber;
};
