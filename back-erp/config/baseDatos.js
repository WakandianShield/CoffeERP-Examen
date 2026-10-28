// COMPARTE CONEXIONES A MYSQL SIN MEZCLAR LAS TRANSACCIONES DE DOS PETICIONES.
const mysql = require("mysql2");

// USA HOST, USUARIO, CONTRASENA Y NOMBRE DE BASE; MYSQL CONSERVA SUS DEMAS VALORES PREDETERMINADOS.
const conexion = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// INFORMA EN CONSOLA SI LA CONEXION FUNCIONO O SI MYSQL DEVOLVIO UN ERROR.
conexion.getConnection((error, disponible) => {
  if (error) {
    console.log("Error de conexion: ", error);
    return;
  }
  console.log("Conectado");
  disponible.release();
});

// COMPARTE ESTA CONEXION CON LOS SERVICIOS Y EL MANEJO DE TRANSACCIONES.
module.exports = conexion;
