// ORDEN EXTERNA DE PAYPAL Y FOLIO LOCAL PARA IDENTIFICAR LA VENTA PERSISTIDA.
export interface OrdenPaypal {
  id: string;
  idVenta: string;
  total: string;
}
