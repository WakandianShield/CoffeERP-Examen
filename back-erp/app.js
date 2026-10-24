// PUNTO DE ENTRADA DEL SERVIDOR: PREPARA EXPRESS, CONECTA LAS RUTAS Y ESCUCHA PETICIONES.
// CARGA LAS VARIABLES DEL ARCHIVO .ENV ANTES DE LEER CLAVES O ABRIR LA CONEXION.
require("dotenv").config();

const express = require("express");
const cors = require("cors");

// AL CARGAR ESTE ARCHIVO SE INTENTA CONECTAR A MYSQL.
require("./config/baseDatos");
const { verificarToken } = require("./middleware/autenticacion");
const manejarError = require("./middleware/errores");

// SIN ESTE SECRETO NO SE PUEDEN FIRMAR NI COMPROBAR LOS TOKENS DE SESION.
if (!process.env.JWT_SECRET) throw new Error("Configura JWT_SECRET");

const app = express();

// PERMITE PETICIONES DESDE OTROS ORIGENES, COMO LA APLICACION ANGULAR.
app.use(cors());
// CONVIERTE EL JSON RECIBIDO EN DATOS QUE LOS CONTROLADORES LEEN DE LA PETICION.
app.use(express.json());

// REGISTRA EL ACCESO ANTES DEL FILTRO GENERAL PARA PODER INICIAR SESION SIN TOKEN.
app.use("/api/autenticacion", require("./router/autenticacion.routes"));
// DESDE ESTE PUNTO, LAS RUTAS DE NEGOCIO NECESITAN UN TOKEN VALIDO.
app.use("/api", verificarToken);
app.use("/api", require("./router/productos.routes"));
app.use("/api", require("./router/compras.routes"));
app.use("/api", require("./router/empleados.routes"));
app.use("/api", require("./router/finanzas.routes"));
app.use("/api/ventas", require("./router/ventas.routes"));
// EL CHECKOUT USA ESTE PREFIJO PARA /ORDEN Y /CAPTURAR/:ORDERID.
app.use("/api/paypal", require("./router/paypal.routes"));

// SI NINGUNA RUTA ANTERIOR RESPONDIO, DEVUELVE UN ERROR 404 EN FORMATO JSON.
app.use((solicitud, respuesta) =>
  respuesta.status(404).json({ mensaje: "Ruta no encontrada" }),
);
// SE COLOCA AL FINAL PARA RECIBIR LOS ERRORES DE LAS RUTAS Y SUS SERVICIOS.
app.use(manejarError);

// ABRE EL PUERTO HTTP INDICADO EN .ENV Y DEJA EL SERVIDOR ESPERANDO PETICIONES.
app.listen(process.env.PORT, () => {
  console.log(`Servidor ejecutandose en puerto ${process.env.PORT}`);
});

module.exports = app;
