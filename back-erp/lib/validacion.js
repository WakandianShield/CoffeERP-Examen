// REVISA LOS DATOS RECIBIDOS ANTES DE USARLOS EN COMPRAS, VENTAS Y OTROS REGISTROS.

// INTERRUMPE LA OPERACION CON UN MENSAJE Y UN CODIGO HTTP; SI NO SE INDICA OTRO, USA 400.
function fallar(mensaje, estado = 400) {
  throw Object.assign(new Error(mensaje), { status: estado });
}
// EXIGE UN TEXTO ENTRE DOS CARACTERES Y EL MAXIMO PERMITIDO; QUITA LOS ESPACIOS DE LOS EXTREMOS.
function texto(valor, etiqueta, maximo = 100) {
  if (
    typeof valor !== "string" ||
    valor.trim().length < 2 ||
    valor.trim().length > maximo
  )
    fallar(`${etiqueta}: longitud inválida`);
  return valor.trim();
}
// REVISA EL FORMATO DEL CORREO Y LO PASA A MINUSCULAS PARA COMPARARLO DE FORMA CONSISTENTE.
function correo(valor) {
  const resultado = texto(valor, "Correo", 190).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resultado)) fallar("Correo inválido");
  return resultado;
}
// ACEPTA SOLO NUMEROS ENTEROS DENTRO DEL RANGO INDICADO; RECHAZA DECIMALES Y TEXTOS.
function entero(valor, etiqueta, minimo = 1, maximo = 100000000) {
  if (!Number.isSafeInteger(valor) || valor < minimo || valor > maximo)
    fallar(`${etiqueta}: entero fuera de rango`);
  return valor;
}
// SOLO EXIGE UN MINIMO DE TRES CARACTERES, SIN OBLIGAR A COMBINAR TIPOS DE CARACTERES.
function contrasena(valor) {
  if (typeof valor !== "string" || valor.length < 3)
    fallar("La contraseña debe tener al menos 3 caracteres");
  return valor;
}
// REVISA PRODUCTOS Y CANTIDADES, RECHAZA REPETIDOS Y LOS ORDENA POR ID ANTES DE PROCESARLOS.
function carrito(detalles) {
  if (!Array.isArray(detalles) || !detalles.length || detalles.length > 50)
    fallar("Carrito vacío o demasiado grande");
  // RECUERDA LOS IDS YA REVISADOS PARA NO ACEPTAR EL MISMO PRODUCTO DOS VECES.
  const ids = new Set();
  // PROCESAR LOS PRODUCTOS EN EL MISMO ORDEN AYUDA A REDUCIR CONFLICTOS AL BLOQUEAR SUS FILAS.
  return detalles
    .map((detalle) => {
      const id = entero(detalle.id, "Producto");
      const cantidad = entero(detalle.cantidad, "Cantidad", 1, 100);
      if (ids.has(id)) fallar("Producto repetido en el carrito");
      ids.add(id);
      return { id, cantidad };
    })
    .sort((primero, segundo) => primero.id - segundo.id);
}
module.exports = { fallar, texto, correo, entero, contrasena, carrito };
