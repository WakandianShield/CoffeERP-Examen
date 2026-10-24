// GENERA EL COMPROBANTE XML ACADEMICO Y LO ENVIA COMO ARCHIVO ADJUNTO POR CORREO.
const baseDatos = require("../config/baseDatos").promise();
const { fallar } = require("../lib/validacion");

// ELIMINA CARACTERES NO VALIDOS Y REEMPLAZA SIGNOS ESPECIALES PARA NO ROMPER EL XML.
const escaparXml = (valor) =>
  String(valor)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
// ARMA EL XML ACADEMICO CON CLIENTE, PRODUCTOS, TOTAL, FECHA Y REFERENCIA DE PAGO.
function generarXml(venta, detalles) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Factura version="1.0" tipo="ACADEMICA_NO_FISCAL" folio="${escaparXml(venta.id)}" moneda="MXN" total="${(venta.totalCentavos / 100).toFixed(2)}" fecha="${new Date(venta.fechaCreacion).toISOString()}">
 <Emisor nombre="CoffeERP"/>
 <Receptor nombre="${escaparXml(venta.cliente)}" correo="${escaparXml(venta.correo)}"/>
 <Conceptos>${detalles.map((i) => `<Concepto producto="${escaparXml(i.nombre)}" cantidad="${i.cantidad}" precioUnitario="${(i.precioCentavos / 100).toFixed(2)}" importe="${((i.cantidad * i.precioCentavos) / 100).toFixed(2)}"/>`).join("")}</Conceptos>
 <Pago metodo="${venta.metodo}" referencia="${escaparXml(venta.idCaptura || venta.id)}"/>
</Factura>`;
}
// ENVIA EL XML ADJUNTO Y ACTUALIZA EL ESTADO DEL CORREO SEGUN LA RESPUESTA DEL PROVEEDOR.
async function enviarFactura(venta, detalles) {
  // SI EL PROVEEDOR YA ACEPTO LA FACTURA, NO VUELVE A ENVIARLA DESDE ESTA OPERACION.
  if (venta.estadoCorreo === "ENVIADA")
    return { mensaje: "Factura ya aceptada por el servicio de correo" };
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM)
    fallar("Configura BREVO_API_KEY y MAIL_FROM para enviar la factura", 503);
  try {
    const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      // LAS CLAVES EN INGLES SON LAS QUE EXIGE LA API DE CORREO.
      body: JSON.stringify({
        sender: { name: "CoffeERP", email: process.env.MAIL_FROM },
        to: [{ email: venta.correo, name: venta.cliente }],
        subject: `Factura académica ${venta.id}`,
        textContent:
          "Adjuntamos la factura XML de tu compra. Comprobante académico sin validez fiscal.",
        attachment: [
          {
            name: `factura-${venta.id}.xml`,
            // CONVIERTE EL XML A BASE64 PARA ENVIARLO COMO ARCHIVO ADJUNTO.
            content: Buffer.from(generarXml(venta, detalles)).toString(
              "base64",
            ),
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!respuesta.ok) fallar("El servicio de correo rechazó el envío", 502);
    const datos = await respuesta.json();
    // ENVIADA SIGNIFICA QUE EL PROVEEDOR ACEPTO EL CORREO, NO QUE YA LLEGO A LA BANDEJA DEL CLIENTE.
    await baseDatos.execute(
      "UPDATE sales SET email_status='ENVIADA',email_message_id=? WHERE id=?",
      [datos.messageId || null, venta.id],
    );
    return { mensaje: "Factura aceptada por el servicio de correo" };
  } catch (error) {
    await baseDatos.execute(
      "UPDATE sales SET email_status='ERROR' WHERE id=?",
      [venta.id],
    );
    throw error;
  }
}
module.exports = { generarXml, enviarFactura };
