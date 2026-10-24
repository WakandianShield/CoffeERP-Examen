// CUENTA DE ACCESO CON DATOS PERSONALES, HASH DE CONTRASENA, ROL Y MODULOS.

class Usuario {
  static MODULOS = ["VENTAS", "COMPRAS", "INVENTARIO", "RRHH", "FINANZAS"];

  // CONVIERTE UNA FILA DE MYSQL A PROPIEDADES EN ESPANOL SIN CAMBIAR LOS NOMBRES DE LAS COLUMNAS EXISTENTES.
  constructor(fila) {
    this.id = fila.id;
    this.nombre = fila.name;
    this.correo = fila.email;
    this.hashContrasena = fila.password_hash;
    this.rol = fila.role;
    // MYSQL GUARDA LOS MODULOS SEPARADOS POR COMAS; AQUI SE CONVIERTEN EN UNA LISTA.
    this.modulos = String(fila.modules || "")
      .split(",")
      .filter(Boolean);
    this.activo = fila.active;
  }

  // ENTREGA TODOS LOS MODULOS AL ADMINISTRADOR Y SOLO LOS ASIGNADOS A LAS DEMAS CUENTAS.
  obtenerModulos() {
    return this.rol === "ADMIN" ? [...Usuario.MODULOS] : this.modulos;
  }

  // PREPARA EL PERFIL QUE SE ENVIA AL NAVEGADOR Y AL TOKEN; EXCLUYE EL HASH DE LA CONTRASENA.
  paraCliente() {
    return {
      id: this.id,
      nombre: this.nombre,
      correo: this.correo,
      rol: this.rol,
      modulos: this.obtenerModulos(),
    };
  }
}

module.exports = Usuario;
