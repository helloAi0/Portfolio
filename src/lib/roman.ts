export function toRoman(num: number): string {
  if (num <= 0) return '0';
  const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let n = num, out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}
