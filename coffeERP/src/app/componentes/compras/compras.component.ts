import { ProductosService } from '../../services/productos.service';
import { ProveedoresService } from './servicios/proveedores.service';
import { ComprasService } from './servicios/compras.service';
// PANTALLA DE COMPRAS: CAPTURA PROVEEDORES Y MERCANCIA QUE YA SE RECIBIO Y PAGO.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoFormularioService } from '../../services/estado-formulario.service';
import { Producto } from '../../models/producto.model';
import { Proveedor } from './model/proveedor.model';
import { Compra } from './model/compra.model';
@Component({
  selector: 'app-compras',
  providers: [EstadoFormularioService],
  imports: [FormsModule],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.css',
})
export class ComprasComponent implements OnInit {
  formulario = inject(EstadoFormularioService);
  comprasService = inject(ComprasService);
  proveedoresService = inject(ProveedoresService);
  productosService = inject(ProductosService);
  Math = Math;
  proveedores = signal<Proveedor[]>([]);
  productos = signal<Producto[]>([]);
  compras = signal<Compra[]>([]);
  proveedor = { nombre: '', correo: '', telefono: '' };
  idProveedor = 0;
  idProducto = 0;
  cantidad = 1;
  costo = 0;
  // AL ABRIR LA PANTALLA, CARGA LOS DATOS INICIALES DESDE EL SERVIDOR.
  ngOnInit() {
    void this.formulario.ejecutar(() => this.cargar(), '');
  }
  // RECARGA LOS LISTADOS DEL SERVIDOR PARA MOSTRAR LOS DATOS ACTUALES.
  async cargar() {
    this.proveedores.set(await this.proveedoresService.listar());
    this.productos.set((await this.productosService.listar()).filter((p) => p.activo));
    this.compras.set(await this.comprasService.listar());
  }
  // GUARDA EL NUEVO PROVEEDOR, LIMPIA SUS CAMPOS Y ACTUALIZA LAS OPCIONES DEL FORMULARIO.
  guardarProveedor() {
    void this.formulario.ejecutar(async () => {
      await this.proveedoresService.crear(this.proveedor);
      this.proveedor = { nombre: '', correo: '', telefono: '' };
      await this.cargar();
    });
  }
  // ENVIA PROVEEDOR, PRODUCTO, CANTIDAD Y COSTO EN CENTAVOS PARA REGISTRAR LA RECEPCION Y EL PAGO.
  guardarCompra() {
    void this.formulario.ejecutar(async () => {
      await this.comprasService.crear({
        idProveedor: this.idProveedor,
        productos: [
          {
            id: this.idProducto,
            cantidad: this.cantidad,
            costoCentavos: Math.round(this.costo * 100),
          },
        ],
      });
      this.cantidad = 1;
      this.costo = 0;
      await this.cargar();
    }, 'Compra registrada; inventario y finanzas actualizados');
  }
}
