import { ArrowDown, ArrowUp, Edit, Loader, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type PreregistroManageItem = {
  id: string;
  cantidad: number;
  producto?: { nombre?: string; codigo?: string };
};

interface PreregistroManageProductListProps {
  items: PreregistroManageItem[];
  emptyMessage: string;
  isReordering?: boolean;
  isDeletingId?: string | null;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onEdit: (item: PreregistroManageItem) => void;
  onDelete: (id: string) => void;
}

function ProductActions({
  rowIndex,
  total,
  item,
  isReordering,
  isDeletingId,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  rowIndex: number;
  total: number;
  item: PreregistroManageItem;
  isReordering?: boolean;
  isDeletingId?: string | null;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onEdit: (item: PreregistroManageItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5 shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Subir una fila"
        disabled={isReordering || rowIndex === 0}
        onClick={() => onMoveUp(rowIndex)}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Bajar una fila"
        disabled={isReordering || rowIndex >= total - 1}
        onClick={() => onMoveDown(rowIndex)}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Editar producto"
        onClick={() => onEdit(item)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Eliminar producto"
        onClick={() => onDelete(item.id)}
        disabled={isDeletingId === item.id}
      >
        {isDeletingId === item.id ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 text-destructive" />
        )}
      </Button>
    </div>
  );
}

/** Lista de productos del diálogo Gestionar: tarjetas en móvil, tabla en pantallas grandes. */
export function PreregistroManageProductList({
  items,
  emptyMessage,
  isReordering,
  isDeletingId,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: PreregistroManageProductListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Móvil: tarjetas sin scroll horizontal */}
      <div className="space-y-2 sm:hidden">
        {items.map((item, rowIndex) => (
          <div key={item.id} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <p className="font-medium text-sm leading-snug break-words min-w-0 flex-1">
                {item.producto?.nombre || 'N/A'}
              </p>
              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">
                {item.cantidad}
              </span>
            </div>
            <ProductActions
              rowIndex={rowIndex}
              total={items.length}
              item={item}
              isReordering={isReordering}
              isDeletingId={isDeletingId}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>

      {/* Escritorio / tablet: tabla */}
      <div className="hidden sm:block rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="text-right w-24">Cantidad</TableHead>
              <TableHead className="text-right w-40">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, rowIndex) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-[200px]">
                  <span className="line-clamp-2">{item.producto?.nombre || 'N/A'}</span>
                </TableCell>
                <TableCell>{item.producto?.codigo || 'N/A'}</TableCell>
                <TableCell className="text-right tabular-nums">{item.cantidad}</TableCell>
                <TableCell className="text-right">
                  <ProductActions
                    rowIndex={rowIndex}
                    total={items.length}
                    item={item}
                    isReordering={isReordering}
                    isDeletingId={isDeletingId}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
