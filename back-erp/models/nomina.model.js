// PAGO DE SALARIO DE UN EMPLEADO PARA UN MES DETERMINADO.

class Nomina {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.idEmpleado = fila.employee_id;
    this.periodo = fila.period;
    this.importeCentavos = fila.amount_cents;
    this.fechaCreacion = fila.created_at;
    this.nombre = fila.name;
  }
}

module.exports = Nomina;
