export const KG_PER_LB = 0.45359237;

export const cmToFtIn = (cm) => {
  const totalIn = cm / 2.54;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return `${ft}′${inch}″`;
};

export const kgToLb = (kg) => Math.round(kg / KG_PER_LB);
export const lbToKg = (lb) => lb * KG_PER_LB;
export const nToKg  = (n) => n / 9.80665;
export const nToLb  = (n) => n / 4.4482216;
