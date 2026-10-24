// MOVIMIENTO DE DINERO CON SU TIPO, CONCEPTO, IMPORTE Y REFERENCIA DE ORIGEN.

class LibroContable {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.tipo = fila.kind;
    this.concepto = fila.concept;
    this.importeCentavos = fila.amount_cents;
    this.referencia = fila.reference;
    this.fechaCreacion = fila.created_at;
  }
}

module.exports = LibroContable;
