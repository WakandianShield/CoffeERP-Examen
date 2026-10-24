import { ProductosService } from '../../services/productos.service';
import { InventarioService } from './servicios/inventario.service';
// PANTALLA DE INVENTARIO: CATALOGO, EXISTENCIAS Y AJUSTES DE ENTRADA O SALIDA.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoFormularioService } from '../../services/estado-formulario.service';
import { Producto } from '../../models/producto.model';
import { MovimientoInventario } from './model/movimiento-inventario.model';
@Component({
  selector: 'app-productos',
  providers: [EstadoFormularioService],
  imports: [FormsModule],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent implements OnInit {
  formulario = inject(EstadoFormularioService);
  productosService = inject(ProductosService);
  inventarioService = inject(InventarioService);
  productos = signal<Producto[]>([]);
  movimientos = signal<MovimientoInventario[]>([]);
  idEdicion = 0;
  precio = 0;
  producto = { nombre: '', minimo: 5, activo: true };
  movimiento = { idProducto: 0, cantidad: 1, motivo: '' };
  // AL ABRIR LA PANTALLA, CARGA LOS DATOS INICIALES DESDE EL SERVIDOR.
  ngOnInit() {
    void this.formulario.ejecutar(() => this.cargar(), '');
  }
  // RECARGA LOS LISTADOS DEL SERVIDOR PARA MOSTRAR LOS DATOS ACTUALES.
  async cargar() {
    this.productos.set(await this.productosService.listar());
    this.movimientos.set(await this.inventarioService.movimientos());
  }
  // VACIA EL FORMULARIO Y QUITA EL ID DE EDICION PARA PODER CREAR UN REGISTRO NUEVO.
  limpiar() {
    this.idEdicion = 0;
    this.precio = 0;
    this.producto = { nombre: '', minimo: 5, activo: true };
  }
  // COPIA EL REGISTRO AL FORMULARIO, CONVIERTE CENTAVOS A PESOS Y SUBE LA PAGINA PARA EDITARLO.
  editar(p: Producto) {
    this.idEdicion = p.id;
    this.precio = p.precioCentavos / 100;
    this.producto = { nombre: p.nombre, minimo: p.minimo, activo: !!p.activo };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // CONVIERTE EL IMPORTE A CENTAVOS Y CREA O ACTUALIZA EL REGISTRO; DESPUES RECARGA LOS DATOS.
  guardar() {
    void this.formulario.ejecutar(async () => {
      const datos = { ...this.producto, precioCentavos: Math.round(this.precio * 100) };
      if (this.idEdicion) await this.productosService.actualizar(this.idEdicion, datos);
      else await this.productosService.crear(datos);
      this.limpiar();
      await this.cargar();
    });
  }
  // ENVIA LA CANTIDAD Y EL MOTIVO DEL AJUSTE; DESPUES RECARGA EXISTENCIAS E HISTORIAL.
  ajustar() {
    void this.formulario.ejecutar(async () => {
      await this.inventarioService.ajustar(this.movimiento);
      this.movimiento.motivo = '';
      await this.cargar();
    }, 'Existencias actualizadas');
  }
}
