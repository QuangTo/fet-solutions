export function digitsOnly(value) {
  return value.replace(/\D/g, "");
}

export function number(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

export function money(value, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    currency: currency || "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value || 0));
}

export function compactAxisNumber(value) {
  const numericValue = Number(value || 0);
  const absoluteValue = Math.abs(numericValue);

  if (absoluteValue >= 1_000_000) {
    return `${number(Math.round(numericValue / 100_000) / 10)}tr`;
  }
  if (absoluteValue >= 1_000) {
    return `${number(Math.round(numericValue / 100) / 10)}k`;
  }
  return number(numericValue);
}

