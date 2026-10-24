// PRODUCTO DEL CATALOGO CON PRECIO, EXISTENCIAS, RESERVAS Y MINIMO DE INVENTARIO.

class Producto {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.nombre = fila.name;
    this.precioCentavos = fila.price_cents;
    this.existencias = fila.stock;
    // SON UNIDADES APARTADAS PARA VENTAS PENDIENTES; NO SE DEBEN OFRECER A OTRO CLIENTE.
    this.reservado = fila.reserved;
    this.minimo = fila.minimum;
    this.activo = fila.active;
  }
}

module.exports = Producto;
