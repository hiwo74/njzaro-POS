// U+2066 (LRI) / U+2069 (PDI) force this value to always render left-to-right
// as a unit — without them, the Arabic (RTL) bidi context reorders it into
// "IQD 59,000" instead of "59,000 IQD".
const LRI = "⁦";
const PDI = "⁩";

export function formatIqd(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${LRI}${sign}${Math.round(Math.abs(amount)).toLocaleString("en-US")} IQD${PDI}`;
}
