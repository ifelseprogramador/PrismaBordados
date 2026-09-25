import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  getCatalogoBordadoItemById,
  deleteCatalogoBordadoItem,
  updateCatalogoBordadoItem,
} from "@/modules/catalogo-bordado";
import { CatalogoItemForm } from "@/modules/catalogo-bordado/components/catalogo-item-form";

export default async function CatalogoBordadoDetailPage({
  params,
}: PageProps<"/catalogo-bordado/[id]">) {
  const { id } = await params;
  const item = await getCatalogoBordadoItemById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BackButton href="/catalogo-bordado" />
          <h1 className="text-2xl font-semibold tracking-tight">{item.tipoProduto}</h1>
        </div>
        <ConfirmDeleteButton
          title="Remover item de catálogo"
          description={`Tem certeza que deseja remover "${item.tipoProduto}"? Essa ação não pode ser desfeita.`}
          onConfirm={deleteCatalogoBordadoItem.bind(null, item.id)}
          redirectTo="/catalogo-bordado"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do item</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogoItemForm item={item} action={updateCatalogoBordadoItem.bind(null, item.id)} />
        </CardContent>
      </Card>
    </div>
  );
}
