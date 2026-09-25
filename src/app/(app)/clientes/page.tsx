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
import { ActionLink } from "@/components/action-link";
import { ListFilterBar } from "@/components/list-filter-bar";
import { listClientes, CLIENTE_SORT_OPTIONS, type ClienteSort } from "@/modules/clientes/queries";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { q, sort } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const sortParam = typeof sort === "string" ? (sort as ClienteSort) : undefined;
  const clientes = await listClientes({ search, sort: sortParam });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Users className="text-primary h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        </div>
        <Button nativeButton={false} render={<Link href="/clientes/novo" />}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBox placeholder="Buscar por nome ou telefone..." />
        <ListFilterBar
          filters={[]}
          sortOptions={Object.entries(CLIENTE_SORT_OPTIONS).map(([value, label]) => ({
            value,
            label,
          }))}
          defaultSort="name_asc"
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
