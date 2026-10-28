// HABLA CON PAYPAL EN SU ENTORNO DE PRUEBAS Y REVISA QUE EL COBRO CORRESPONDA A LA VENTA.
const { fallar } = require("../lib/validacion");
const BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

// INTERCAMBIA LAS CREDENCIALES DEL SERVIDOR POR UN TOKEN DE ACCESO DE PAYPAL.
async function obtenerToken() {
  // LIMITA LAS PETICIONES AL ENTORNO DE PRUEBAS PARA NO REALIZAR COBROS DE PRODUCCION.
  if (BASE_URL !== "https://api-m.sandbox.paypal.com")
    fallar("Este proyecto utiliza PayPal Sandbox", 503);
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
    fallar("Configura PayPal Sandbox en el backend", 503);
  const credenciales = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");
  // INTERCAMBIA LAS CREDENCIALES PRIVADAS POR UN TOKEN; ESTE PROCESO OCURRE SOLO EN EL SERVIDOR.
  const respuesta = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credenciales}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000),
  });
  if (!respuesta.ok) fallar("PayPal rechazó la autenticación", 502);
  const datos = await respuesta.json();
  if (!datos.access_token) fallar("PayPal no devolvió un token de acceso", 502);
  return datos.access_token;
}

// ENVIA PETICIONES A PAYPAL CON SU TOKEN PRIVADO Y UN ID PARA RECONOCER REINTENTOS.
async function paypalRequest(ruta, metodo = "GET", datos, idSolicitud) {
  try {
    const token = await obtenerToken();
    // USA EL TOKEN PARA LA OPERACION Y UN TIEMPO LIMITE PARA NO ESPERAR INDEFINIDAMENTE.
    const respuesta = await fetch(`${BASE_URL}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        // REUTILIZAR EL ID DE LA VENTA AYUDA A QUE PAYPAL RECONOZCA UN REINTENTO DE LA MISMA OPERACION.
        ...(idSolicitud ? { "PayPal-Request-Id": idSolicitud } : {}),
      },
      ...(datos !== undefined ? { body: JSON.stringify(datos) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok)
      fallar(
        "PayPal no confirmó la operación. Consulta su estado antes de repetir el pago.",
        502,
      );
    return resultado;
  } catch (error) {
    if (error.status) throw error;
    fallar(
      "PayPal no confirmó la operación. Verifica el estado del pago antes de reintentar.",
      502,
    );
  }
}

// SOLO ACEPTA UN COBRO COMPLETADO QUE COINCIDA EN ORDEN, MONEDA E IMPORTE CON LA VENTA LOCAL.
function verificarCaptura(orden, venta) {
  if (!orden || !Array.isArray(orden.purchase_units)) return null;
  // JUNTA LOS COBROS DEVUELTOS POR PAYPAL; ESTA VENTA ESPERA EXACTAMENTE UNO.
  const capturas = orden.purchase_units.flatMap((unidad) =>
    Array.isArray(unidad?.payments?.captures) ? unidad.payments.captures : [],
  );
  if (
    orden.id !== venta.idPaypal ||
    orden.status !== "COMPLETED" ||
    capturas.length !== 1
  )
    return null;
  const captura = capturas[0];
  if (
    !captura ||
    captura.status !== "COMPLETED" ||
    !captura.id ||
    captura.amount?.currency_code !== "MXN" ||
    captura.amount?.value !== (venta.totalCentavos / 100).toFixed(2)
  )
    return null;
  return captura;
}
// SOLO PERMITE LIBERAR UNA RESERVA CON UNA RESPUESTA COMPLETA Y SIN COBROS NI AUTORIZACIONES.
function ordenSinPago(orden, venta) {
  return (
    orden?.id === venta.idPaypal &&
    ["CREATED", "SAVED", "PAYER_ACTION_REQUIRED", "VOIDED"].includes(
      orden.status,
    ) &&
    Array.isArray(orden.purchase_units) &&
    orden.purchase_units.length > 0 &&
    orden.purchase_units.every((unidad) => {
      if (!unidad || typeof unidad !== "object") return false;
      const pagos = unidad.payments;
      if (pagos === undefined) return true;
      return (
        pagos &&
        typeof pagos === "object" &&
        (pagos.captures === undefined ||
          (Array.isArray(pagos.captures) && pagos.captures.length === 0)) &&
        (pagos.authorizations === undefined ||
          (Array.isArray(pagos.authorizations) &&
            pagos.authorizations.length === 0))
      );
    })
  );
}
module.exports = { paypalRequest, verificarCaptura, ordenSinPago };
