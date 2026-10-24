// DATOS DE UN PRODUCTO VENDIDO: VENTA, PRODUCTO, NOMBRE, CANTIDAD Y PRECIO UNITARIO.
class DetalleVenta {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.idVenta = fila.sale_id;
    this.idProducto = fila.product_id;
    this.nombre = fila.name;
    this.cantidad = fila.quantity;
    this.precioCentavos = fila.price_cents;
  }
}

module.exports = DetalleVenta;
