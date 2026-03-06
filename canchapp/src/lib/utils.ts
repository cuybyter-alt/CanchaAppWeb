export function formatPrice(price: number): string {
  return `$${(price / 1000).toFixed(0)}k`;
}

export function formatPriceFull(price: number): string {
  return `$${price.toLocaleString('es-CO')}`;
}
