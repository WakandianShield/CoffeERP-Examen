// DATOS DEL CATALOGO Y SUS UNIDADES DISPONIBLES; PRECIO EXPRESADO EN CENTAVOS.
export interface Producto {
  id: number;
  nombre: string;
  precioCentavos: number;
  existencias: number;
  reservado: number;
  minimo: number;
  activo: boolean;
}
