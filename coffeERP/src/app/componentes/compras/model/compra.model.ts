// RESUMEN DE LA COMPRA CON PROVEEDOR, TOTAL EN CENTAVOS Y FECHA.
export interface Compra {
  id: number;
  proveedor: string;
  totalCentavos: number;
  fechaCreacion: string;
}
