import { Upload } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { SpreadsheetImportWizard } from "@/components/spreadsheet-import-wizard";
import { confirmClientesImport, previewClientesImport } from "@/modules/clientes/import-actions";

export default function ImportarClientesPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton href="/clientes" />
        <Upload className="text-primary h-5 w-5" />
        <h1 className="text-2xl font-semibold tracking-tight">Importar clientes</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <SpreadsheetImportWizard
            entityPlural="clientes"
            templateHref="/clientes/modelo"
            exportHref="/clientes/exportar"
            previewAction={previewClientesImport}
            confirmAction={confirmClientesImport}
            doneHref="/clientes"
            doneLabel="Ver clientes"
            duplicateHint="mesmo CPF/CNPJ"
          />
        </CardContent>
      </Card>
    </div>
  );
}
