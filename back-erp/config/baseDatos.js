// CREA LA CONEXION A MYSQL CON LOS DATOS PRIVADOS GUARDADOS EN EL ARCHIVO .ENV.
const mysql = require("mysql2");

// USA HOST, USUARIO, CONTRASENA Y NOMBRE DE BASE; MYSQL CONSERVA SUS DEMAS VALORES PREDETERMINADOS.
const conexion = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// INFORMA EN CONSOLA SI LA CONEXION FUNCIONO O SI MYSQL DEVOLVIO UN ERROR.
conexion.connect((error) => {
  if (error) {
    console.log("Error de conexion: ", error);
    return;
  }
  console.log("Conectado");
});

// COMPARTE ESTA CONEXION CON LOS SERVICIOS Y EL MANEJO DE TRANSACCIONES.
module.exports = conexion;
