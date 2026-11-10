import { Banknote, Barcode, Pencil, Palette, Ruler, Shirt, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { FacilInfo } from "@/components/facil/facil-info";
import { FacilPage } from "@/components/facil/facil-page";
import { FacilActions, FacilTile } from "@/components/facil/facil-tile";
import { formatCents } from "@/core/money";
import { deleteCatalogoBordadoItem, updateCatalogoBordadoItem } from "../actions";
import type { CatalogoBordadoItem } from "../schema.types";
import { CatalogoItemForm } from "./catalogo-item-form";

/**
 * Ficha do produto do catálogo no modo Fácil. A edição completa (inclusive os
 * dados fiscais) reaproveita o `CatalogoItemForm` formal atrás de "Editar
 * dados" (`?editar=1`).
 */
export function CatalogoItemFacilDetail({
  item,
  editing,
}: {
  item: CatalogoBordadoItem;
  editing: boolean;
}) {
  return (
    <FacilPage
      title={item.tipoProduto}
      subtitle={item.modeloPadrao ?? undefined}
      icon={Shirt}
      backHref="/catalogo-bordado"
      backLabel="Catálogo"
    >
      <FacilInfo
        rows={[
          { icon: Tag, label: "Modelo padrão", value: item.modeloPadrao },
          { icon: Ruler, label: "Tamanhos", value: item.tamanhosAceitos.join(", ") },
          { icon: Palette, label: "Cores", value: item.coresAceitas.join(", ") },
          { icon: Banknote, label: "Preço padrão", value: formatCents(item.defaultPriceCents) },
          { icon: Barcode, label: "NCM", value: item.ncm },
        ]}
      />

      <FacilActions>
        <FacilTile
          href={editing ? `/catalogo-bordado/${item.id}` : `/catalogo-bordado/${item.id}?editar=1`}
          label={editing ? "Fechar edição" : "Editar dados"}
          icon={Pencil}
          size="lg"
          index={0}
        />
      </FacilActions>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Editar dados do produto</CardTitle>
          </CardHeader>
          <CardContent>
            <CatalogoItemForm item={item} action={updateCatalogoBordadoItem.bind(null, item.id)} />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pt-2">
        <ConfirmDeleteButton
          title="Remover item de catálogo"
          description={`Tem certeza que deseja remover "${item.tipoProduto}"? Essa ação não pode ser desfeita.`}
          onConfirm={deleteCatalogoBordadoItem.bind(null, item.id)}
          redirectTo="/catalogo-bordado"
        />
      </div>
    </FacilPage>
  );
}
