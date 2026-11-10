import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchBox } from "@/components/search-box";
import { ActionLink } from "@/components/action-link";
import { ListFilterBar } from "@/components/list-filter-bar";
import { formatCents } from "@/core/money";
import { listCatalogoBordadoItens } from "@/modules/catalogo-bordado/queries";
import {
  CATALOGO_DEFAULT_SORT,
  CATALOGO_FILTERS,
  CATALOGO_SORT_CHOICES,
  parseCatalogoListParams,
} from "@/modules/catalogo-bordado/list-config";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { CatalogoFacilHome } from "@/modules/catalogo-bordado/components/catalogo-facil";

export default async function CatalogoBordadoPage({
  searchParams,
}: PageProps<"/catalogo-bordado">) {
  const sp = await searchParams;
  const options = parseCatalogoListParams(sp);
  if ((await getCurrentUiMode()) === "facil") {
    return <CatalogoFacilHome options={options} showAll={sp.ver === "todos"} />;
  }

  const itens = await listCatalogoBordadoItens(options);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Package className="text-primary h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
        </div>
        <Button nativeButton={false} render={<Link href="/catalogo-bordado/novo" />}>
          <Plus className="h-4 w-4" />
          Novo item
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBox placeholder="Buscar por tipo de produto..." />
        <ListFilterBar
          filters={CATALOGO_FILTERS}
          sortOptions={CATALOGO_SORT_CHOICES}
          defaultSort={CATALOGO_DEFAULT_SORT}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo de produto</TableHead>
            <TableHead>Modelo padrão</TableHead>
            <TableHead>Tamanhos</TableHead>
            <TableHead>Cores</TableHead>
            <TableHead className="text-right">Preço padrão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center">
                Nenhum item de catálogo cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
          {itens.map((item) => (
            <TableRow key={item.id} className="cursor-pointer">
              <TableCell className="font-medium">
                <ActionLink href={`/catalogo-bordado/${item.id}`}>{item.tipoProduto}</ActionLink>
              </TableCell>
              <TableCell>{item.modeloPadrao ?? "—"}</TableCell>
              <TableCell>{item.tamanhosAceitos.join(", ") || "—"}</TableCell>
              <TableCell>{item.coresAceitas.join(", ") || "—"}</TableCell>
              <TableCell className="text-right">{formatCents(item.defaultPriceCents)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
