// DATOS DE UN PRODUCTO COMPRADO: COMPRA, PRODUCTO, CANTIDAD Y COSTO UNITARIO.
class DetalleCompra {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.idCompra = fila.purchase_id;
    this.idProducto = fila.product_id;
    this.cantidad = fila.quantity;
    this.costoCentavos = fila.cost_cents;
  }
}

module.exports = DetalleCompra;
