import { BackButton } from "@/components/back-button";
import { ClienteForm } from "@/modules/clientes/components/cliente-form";

export default function NovoClientePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <BackButton />
      <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
      <ClienteForm />
    </div>
  );
}
