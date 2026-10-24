// DATOS DE UNA COMPRA CON SU PROVEEDOR, TOTAL Y FECHA.

class Compra {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.idProveedor = fila.supplier_id;
    this.totalCentavos = fila.total_cents;
    this.fechaCreacion = fila.created_at;
    this.proveedor = fila.supplier;
  }
}

module.exports = Compra;
