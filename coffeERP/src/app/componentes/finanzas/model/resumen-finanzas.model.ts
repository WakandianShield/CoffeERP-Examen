// RESUMEN DE INGRESOS, EGRESOS Y MOVIMIENTOS EN CENTAVOS.
import { MovimientoContable } from './movimiento-contable.model';
export interface ResumenFinanzas {
  movimientos: MovimientoContable[];
  ingresos: number;
  egresos: number;
}
