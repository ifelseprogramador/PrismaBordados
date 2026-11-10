import { BackButton } from "@/components/back-button";
import { ClienteForm } from "@/modules/clientes/components/cliente-form";
import { NewClienteFacil } from "@/modules/clientes/components/new-cliente-facil";
import { FacilPage } from "@/components/facil/facil-page";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { UserPlus } from "lucide-react";

export default async function NovoClientePage() {
  if ((await getCurrentUiMode()) === "facil") {
    return (
      <FacilPage title="Novo cliente" icon={UserPlus} backHref="/clientes" backLabel="Clientes">
        <NewClienteFacil />
      </FacilPage>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <BackButton />
      <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
      <ClienteForm />
    </div>
  );
}
