// VENTA CON CLIENTE, IMPORTE, ESTADO DE PAGO Y ESTADO DEL CORREO DE LA FACTURA.
class Venta {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.idUsuario = fila.user_id;
    this.cliente = fila.customer;
    this.correo = fila.email;
    this.totalCentavos = fila.total_cents;
    this.estado = fila.status;
    this.metodo = fila.method;
    this.idPaypal = fila.paypal_id;
    this.idCaptura = fila.capture_id;
    this.estadoCorreo = fila.email_status;
    this.idMensajeCorreo = fila.email_message_id;
    this.fechaCreacion = fila.created_at;
  }
}

module.exports = Venta;
