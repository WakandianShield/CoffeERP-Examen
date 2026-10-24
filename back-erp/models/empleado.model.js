// EXPEDIENTE DEL EMPLEADO CON PUESTO, CORREO, SALARIO Y ESTADO ACTIVO.
class Empleado {
  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.nombre = fila.name;
    this.puesto = fila.position;
    this.correo = fila.email;
    this.salarioCentavos = fila.salary_cents;
    this.activo = fila.active;
  }
}

module.exports = Empleado;
