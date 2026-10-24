// DATOS DE CONTACTO DEL PROVEEDOR AL QUE SE LE COMPRA MERCANCIA.
class Proveedor {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.nombre = fila.name;
    this.correo = fila.email;
    this.telefono = fila.phone;
  }
}

module.exports = Proveedor;
