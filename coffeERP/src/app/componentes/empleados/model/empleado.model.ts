// EXPEDIENTE LABORAL; EL SALARIO SE RECIBE EN CENTAVOS.
export interface Empleado {
  id: number;
  nombre: string;
  puesto: string;
  correo: string;
  salarioCentavos: number;
  activo: boolean;
}
