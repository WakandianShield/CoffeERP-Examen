// AGRUPA CAMBIOS RELACIONADOS: SE GUARDAN TODOS O SE DESHACEN SI ALGUNO FALLA.
const conexion = require("../config/baseDatos");

// INICIA UNA TRANSACCION, EJECUTA LA OPERACION Y CONFIRMA O REVIERTE LOS CAMBIOS.
async function transaccion(operacion) {
  // ESTA VERSION DE LA CONEXION PERMITE ESPERAR LAS CONSULTAS CON AWAIT.
  const baseDatos = conexion.promise();
  // ABRE EL GRUPO DE CAMBIOS ANTES DE EJECUTAR LA OPERACION.
  await baseDatos.beginTransaction();
  try {
    const valor = await operacion(baseDatos);
    // SI TODOS LOS PASOS FUNCIONARON, CONFIRMA LOS CAMBIOS EN MYSQL.
    await baseDatos.commit();
    return valor;
  } catch (error) {
    // SI ALGUN PASO FALLO, DESHACE LOS CAMBIOS DE LA TRANSACCION Y PROPAGA EL ERROR.
    await baseDatos.rollback();
    throw error;
  }
}

module.exports = transaccion;
