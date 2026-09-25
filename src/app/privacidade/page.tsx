import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Página pública EXPLICATIVA, não um aviso de privacidade de uma empresa
 * específica — o Prisma é multi-tenant (cada organização que usa o
 * sistema é uma empresa de bordado diferente, com seu próprio CNPJ e
 * encarregado), então não existe um único texto que sirva para todas.
 * O aviso de privacidade DE VERDADE de cada organização é gerado dentro
 * do app, a partir dos dados que ELA preenche — ver `/lgpd`
 * (`app/(app)/lgpd/page.tsx`) — e publicado pela própria organização nos
 * canais que ela usa com os clientes dela (site, WhatsApp, impresso).
 * Ver docs/lgpd-checklist.md.
 */
export default function PrivacidadePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Privacidade no Prisma</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Como o tratamento de dados pessoais funciona nesta plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Esta página não é o aviso de privacidade de uma empresa</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p>
            O Prisma é um sistema usado por várias empresas de bordado diferentes (cada uma é uma
            organização própria, com seu próprio CNPJ). Se você é cliente de uma dessas empresas e
            está procurando o aviso de privacidade dela, essa página não é o lugar — peça
            diretamente à empresa com quem você contratou o serviço; ela é a responsável (a
            &quot;controladora&quot;, no termo da lei) pelos seus dados, não o Prisma.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quem trata o quê</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p>
            Cada empresa que usa o Prisma cadastra e gerencia os dados dos próprios clientes (nome,
            CPF/CNPJ, telefone, endereço) para produzir pedidos e emitir nota fiscal — o Prisma é a
            ferramenta que ela usa para isso, funcionando como operador técnico. Os dados ficam
            armazenados em banco de dados hospedado no Brasil (Supabase, região São Paulo).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Para quem administra uma organização no Prisma</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p>
            Cadastre a razão social, CNPJ, endereço e o encarregado de dados da sua empresa em{" "}
            <strong>Privacidade (LGPD)</strong> no menu do app — o sistema gera automaticamente um
            texto de aviso de privacidade com os seus dados, pronto para você revisar (recomendado:
            com um advogado) e publicar nos canais que você usa com seus clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
