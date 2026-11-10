import Link from "next/link";
import { Plus, Users } from "lucide-react";
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
import { SpreadsheetMenu } from "@/components/spreadsheet-menu";
import { ActionLink } from "@/components/action-link";
import { ListFilterBar } from "@/components/list-filter-bar";
import { listClientes } from "@/modules/clientes/queries";
import {
  CLIENTE_DEFAULT_SORT,
  CLIENTE_FILTERS,
  CLIENTE_SORT_CHOICES,
  parseClienteListParams,
} from "@/modules/clientes/list-config";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { ClientesFacilHome } from "@/modules/clientes/components/clientes-facil";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const options = parseClienteListParams(sp);
  if ((await getCurrentUiMode()) === "facil") {
    return <ClientesFacilHome options={options} showAll={sp.ver === "todos"} />;
  }

  const clientes = await listClientes(options);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Users className="text-primary h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <SpreadsheetMenu importHref="/clientes/importar" exportHref="/clientes/exportar" />
          <Button nativeButton={false} render={<Link href="/clientes/novo" />}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBox placeholder="Buscar por nome ou telefone..." />
        <ListFilterBar
          filters={CLIENTE_FILTERS}
          sortOptions={CLIENTE_SORT_CHOICES}
          defaultSort={CLIENTE_DEFAULT_SORT}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>CPF/CNPJ</TableHead>
            <TableHead>Endereço</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-center">
                Nenhum cliente cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
          {clientes.map((cliente) => (
            <TableRow key={cliente.id} className="cursor-pointer">
              <TableCell className="font-medium">
                <ActionLink href={`/clientes/${cliente.id}`}>{cliente.name}</ActionLink>
              </TableCell>
              <TableCell>{cliente.phone}</TableCell>
              <TableCell>{cliente.document ?? "—"}</TableCell>
              <TableCell>{cliente.address ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
