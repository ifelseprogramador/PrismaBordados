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
import { listClientes } from "@/modules/clientes/queries";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const clientes = await listClientes(search);

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

      <SearchBox placeholder="Buscar por nome ou telefone..." />

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
            <TableRow key={cliente.id}>
              <TableCell className="font-medium">{cliente.name}</TableCell>
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
