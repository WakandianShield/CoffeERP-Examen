// ESTOS NOMBRES SON PARTE DEL SDK EXTERNO Y SE CONSERVAN COMO LOS EXIGE PAYPAL.
export interface SesionPaypal {
  start(opciones: { presentationMode: string }, orden: Promise<{ orderId: string }>): Promise<void>;
}
