// DATOS MOSTRADOS EN EL HISTORIAL DE VENTAS Y EL ESTADO DE SU FACTURA.
export interface Venta {
  id: string;
  cliente: string;
  correo: string;
  totalCentavos: number;
  metodo: string;
  estado: string;
  estadoCorreo: string;
  fechaCreacion: string;
}
