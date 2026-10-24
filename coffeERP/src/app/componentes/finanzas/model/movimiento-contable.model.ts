// INGRESO O EGRESO DEL LIBRO DE FINANZAS CON SU IMPORTE EN CENTAVOS.
export interface MovimientoContable {
  id: number;
  tipo: string;
  concepto: string;
  importeCentavos: number;
  fechaCreacion: string;
}
