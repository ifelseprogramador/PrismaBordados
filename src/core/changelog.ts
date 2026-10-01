/**
 * Histórico de versões mostrado pra pessoa usuária (selo "vX.Y.Z" no
 * canto do menu → clique abre o que mudou). Fonte ÚNICA da versão do
 * app: `APP_VERSION` é sempre a primeira entrada daqui, e o teste em
 * `__tests__/changelog.test.ts` garante que `package.json#version` bate
 * com ela.
 *
 * Toda mudança que a pessoa perceba usando o sistema ganha uma entrada
 * NOVA no topo (nunca editar uma versão já publicada — é histórico).
 * Texto em linguagem simples, não de programador: o que ela vai notar, não
 * como foi feito (o "como" fica em docs/decisoes.md).
 *
 * Semver simples: correção = patch, algo novo = minor.
 */

export type ChangeType = "novo" | "melhoria" | "correcao";

export interface ChangelogEntry {
  version: string;
  /** AAAA-MM-DD */
  date: string;
  changes: { type: ChangeType; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.8.1",
    date: "2026-10-01",
    changes: [
      {
        type: "correcao",
        text: "Na ficha do cliente, nomes muito grandes agora quebram em várias linhas em vez de desorganizar a tela e empurrar os botões.",
      },
      {
        type: "melhoria",
        text: "A logo da empresa no topo do menu lateral ficou maior e mais fácil de ver.",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: 'Em Perfil › "Dados da empresa", o responsável pela conta edita o nome que aparece nos orçamentos, pedidos e notas enviados ao cliente, além de CNPJ/CPF, telefone e endereço.',
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: "Importar e exportar clientes por planilha ficou bem mais fácil: baixe o modelo em Excel (com instruções e listas para escolher), preencha e envie. Antes de gravar, o sistema mostra quantos estão prontos, quais já existem e o que precisa ser corrigido, linha por linha.",
      },
      {
        type: "novo",
        text: 'O botão "Planilha" na lista de clientes exporta para Excel (.xlsx) ou CSV, no mesmo formato do modelo: dá para editar e importar de volta. Arquivos CSV também continuam funcionando na importação.',
      },
      {
        type: "melhoria",
        text: "Ao importar, quem já existe (mesmo CPF/CNPJ) pode ser pulado ou atualizado, e células em branco não apagam dados já cadastrados.",
      },
    ],
  },
  {
    version: "0.6.2",
    date: "2026-09-30",
    changes: [
      {
        type: "correcao",
        text: 'A janela "Enviar ao cliente" não passa mais do tamanho da tela: em telas pequenas ela rola por dentro e os botões ficam sempre dentro da janela.',
      },
    ],
  },
  {
    version: "0.6.1",
    date: "2026-09-30",
    changes: [
      {
        type: "melhoria",
        text: 'A janela "Enviar ao cliente" ficou mais clara, com botões nas cores do WhatsApp e do Telegram.',
      },
      {
        type: "novo",
        text: "A mensagem de envio agora é editável: toque nos botões (nome do cliente, número, valor, empresa) para inserir dados, veja a prévia e salve como seu texto padrão.",
      },
      {
        type: "correcao",
        text: "O link enviado ao cliente agora sai completo também quando o endereço do site não está configurado.",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: 'Botão "Enviar orçamento" / "Enviar ao cliente" no pedido: gera um link seguro e um PDF e envia por WhatsApp, e-mail ou compartilhamento do celular, com o PDF anexado.',
      },
      {
        type: "novo",
        text: "Notas fiscais emitidas também podem ser enviadas ao cliente com um clique.",
      },
      {
        type: "novo",
        text: "Em Perfil, opção avançada para o sistema enviar e-mails da sua empresa, com PDF anexo.",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: "Em Fiscal, agora dá para cadastrar os dados da sua empresa exigidos na nota: razão social, inscrições estadual e municipal, regime tributário, endereço (com preenchimento pelo CEP) e padrões de NCM, CFOP e serviço.",
      },
      {
        type: "novo",
        text: "No catálogo, cada peça ganhou uma seção de dados fiscais (NCM, CFOP, unidade, origem e CST/CSOSN).",
      },
      {
        type: "melhoria",
        text: "Ao emitir uma nota, se faltar algo na configuração fiscal ou no item, o sistema avisa exatamente o que completar.",
      },
      {
        type: "correcao",
        text: "Nos formulários de catálogo e fiscal, um erro em um campo não apaga mais o que já foi preenchido.",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: "Cadastro de cliente com os dados que a nota fiscal exige: tipo (pessoa física ou empresa), razão social, inscrição estadual e municipal e endereço completo.",
      },
      {
        type: "novo",
        text: "Ao digitar o CEP, rua, bairro, cidade, UF e código IBGE são preenchidos sozinhos.",
      },
      {
        type: "melhoria",
        text: "Se faltar algum dado do cliente na hora de emitir a nota, o sistema avisa exatamente o que completar.",
      },
      {
        type: "correcao",
        text: "Ao errar um campo do cliente, o formulário só marca o campo errado e mantém tudo o que já estava preenchido.",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-28",
    changes: [
      {
        type: "novo",
        text: "Em Perfil, a cor de destaque (botões) e a cor do menu lateral agora são dois controles separados — antes só dava pra mudar uma cor só.",
      },
      {
        type: "novo",
        text: "Botão para remover o logo enviado e voltar ao ícone padrão do sistema.",
      },
      {
        type: "novo",
        text: "Botão para mostrar/esconder a senha digitada, tanto no login quanto ao trocar a senha.",
      },
      {
        type: "novo",
        text: "O administrador da plataforma agora pode renomear uma organização depois de criada.",
      },
      {
        type: "novo",
        text: "Pedidos agora podem ser apagados. Se o pedido já tiver nota fiscal emitida, o sistema avisa antes de confirmar.",
      },
      {
        type: "novo",
        text: "O ícone na aba do navegador e a imagem que aparece ao compartilhar o link (ex.: no WhatsApp) agora mostram a marca do sistema.",
      },
      {
        type: "correcao",
        text: "Corrigido um erro que podia travar a tela ao abrir o menu de perfil.",
      },
      {
        type: "correcao",
        text: "A cor de destaque escolhida em Perfil agora aparece de verdade no seletor — antes o seletor sempre voltava pro azul, mesmo com outra cor salva.",
      },
      {
        type: "correcao",
        text: "Corrigido: ao errar a senha no login, os campos de e-mail e senha eram apagados, obrigando a digitar tudo de novo.",
      },
      {
        type: "correcao",
        text: "Corrigido: a logo aparecia esticada/deformada na tela de perfil.",
      },
      {
        type: "correcao",
        text: "Ao apagar definitivamente uma organização, a conta de acesso de cada pessoa dela também é removida agora — antes só os dados ficavam apagados.",
      },
      {
        type: "correcao",
        text: "Corrigido: em alguns casos, o backup gerado não conseguia ser restaurado por causa de um erro de formato de data.",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-28",
    changes: [
      {
        type: "novo",
        text: "Quem entra pela primeira vez com uma senha provisória (criada pelo administrador) agora é obrigado a trocar a senha antes de acessar qualquer tela. Se esquecer a senha depois, o administrador pode gerar uma nova senha provisória a qualquer momento, sem apagar nada do que já foi cadastrado.",
      },
      {
        type: "novo",
        text: "Chegou o menu Perfil (clique no seu nome, no canto superior direito): dá pra trocar o nome de exibição, o tema claro/escuro e a senha. Quem é dono da organização também escolhe ali a cor e o logo que aparecem pra toda a equipe.",
      },
      {
        type: "correcao",
        text: 'Na área do administrador, a lista de "Pessoas com acesso" de cada organização e o histórico de ações mostravam só um código longo (o identificador interno da conta). Agora mostram o nome da pessoa junto com esse código.',
      },
      {
        type: "correcao",
        text: "A cor e o logo escolhidos em Perfil não estavam sendo salvos de verdade, mesmo a tela avisando que tinha dado certo. Corrigido — agora salvam e aparecem no sistema pra toda a equipe.",
      },
      {
        type: "novo",
        text: 'Em Perfil, quem é dono da organização agora tem um botão "Restaurar cor padrão" para desfazer a personalização de cor e voltar à cor original do sistema.',
      },
      {
        type: "melhoria",
        text: "O cabeçalho agora mostra seu nome de exibição (definido em Perfil) em vez do e-mail.",
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-09-24",
    changes: [
      {
        type: "novo",
        text: "Primeira versão do template: login, painel administrativo da plataforma, suporte ao vivo e notificações.",
      },
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
