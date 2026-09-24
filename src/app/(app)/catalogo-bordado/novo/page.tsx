import { BackButton } from "@/components/back-button";
import { CatalogoItemForm } from "@/modules/catalogo-bordado/components/catalogo-item-form";

export default function NovoCatalogoBordadoItemPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <BackButton />
      <h1 className="text-2xl font-semibold tracking-tight">Novo item de catálogo</h1>
      <CatalogoItemForm />
    </div>
  );
}
