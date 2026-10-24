// REGISTRO DE CUANTAS UNIDADES ENTRARON O SALIERON Y POR QUE.
export interface MovimientoInventario {
  id: number;
  nombre: string;
  cantidad: number;
  motivo: string;
  fechaCreacion: string;
}
