export const normalizeStudentRegistrationNumber = (value) => {
  const registrationNumber = String(value ?? '').trim();
  if (!registrationNumber) return registrationNumber;
  return registrationNumber.replace(/^(?:RG-)+/i, 'RG-');
};
