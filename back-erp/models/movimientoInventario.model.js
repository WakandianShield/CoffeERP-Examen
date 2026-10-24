// ENTRADA O SALIDA DE PRODUCTOS CON CANTIDAD, MOTIVO Y FECHA.

class MovimientoInventario {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.idProducto = fila.product_id;
    this.cantidad = fila.quantity;
    this.motivo = fila.reason;
    this.fechaCreacion = fila.created_at;
    this.nombre = fila.name;
  }
}

module.exports = MovimientoInventario;
