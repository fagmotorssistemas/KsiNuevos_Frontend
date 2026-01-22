export const formatMoney = (val: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(val);
