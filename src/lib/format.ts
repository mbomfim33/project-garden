/** BRL money formatting with two decimals (matches the prototype). */
export function price(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** BRL thousands formatting with no decimals. */
export function int(value: number): string {
  return value.toLocaleString('pt-BR');
}
