// RESULTADO CONFIRMADO POR EL SERVIDOR DESPUES DE VERIFICAR EL COBRO.
export interface ResultadoPago {
  mensaje: string;
  idVenta: string;
  orderId: string;
  captureId: string;
  estado: 'PAGADA';
  estadoCorreo: string;
}
