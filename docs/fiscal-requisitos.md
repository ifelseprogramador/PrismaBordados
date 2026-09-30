# Requisitos fiscais do cliente (NF-e / NFS-e)

Checklist do que a emissão exige do **cliente** e onde cada dado vive. Os
provedores (Focus NFe, PlugNotas, eNotas, Nuvem Fiscal…) NÃO compartilham o
formato de transmissão: cada um tem seus nomes de campo (uns planos, como
`*_destinatario`, outros aninhados, outros espelhando o XML `dest/enderDest`).
Por isso o domínio usa `FiscalClientePayload` (`modules/fiscal/provider.ts`) e
a implementação concreta de cada provedor faz a tradução. Conferir a
documentação do provedor escolhido antes de implementar o adaptador.

## Cliente → NF-e (grupo destinatário)

| Dado                                 | Onde                              | Obrigatório    |
| ------------------------------------ | --------------------------------- | -------------- |
| CPF/CNPJ                             | `clientes.document`               | sim            |
| Nome / razão social                  | `name` / `legal_name` (PJ)        | sim            |
| Indicador de IE (`indIEDest` 1/2/9)  | `ie_indicator`                    | sim            |
| Inscrição Estadual                   | `ie` (se contribuinte)            | condicional    |
| Logradouro, número, bairro           | `cliente_enderecos`               | sim            |
| Município + código IBGE (`cMun`), UF | `cliente_enderecos`               | sim            |
| CEP                                  | `cliente_enderecos.zip`           | sim            |
| País (`cPais`, 1058 = Brasil)        | `country_code`                    | sim (padrão)   |
| Complemento, telefone, e-mail        | endereço / `phone` / `email`      | opcional       |
| Consumidor final (`indFinal`)        | derivado (PF ou não contribuinte) | sim (derivado) |

## Cliente → NFS-e (tomador)

CPF/CNPJ, nome/razão social, endereço com código IBGE do município, CEP e
e-mail. IM do tomador é opcional na maioria dos municípios.

## Já implementado (ver decisoes.md, 2026-09-30)

Emitente (tela Fiscal), dados fiscais do item do catálogo e validação pré-emissão.
Falta apenas o que está marcado abaixo como pendente.

## Fora do cadastro de cliente

- **Por nota:** natureza da operação, finalidade, presença do comprador
  (`indPres`), forma de pagamento, frete.
- **Por produto (NF-e):** NCM, CFOP, unidade, origem, CST/CSOSN e alíquotas.
- **Por serviço (NFS-e):** código do serviço (LC 116), CNAE, alíquota de ISS,
  retenções.
- **Emitente (`organizations`/`fiscal_credentials`):** IE, IM, regime (CRT),
  endereço estruturado com IBGE, certificado digital A1 (conforme o provedor).
- **Reforma tributária (IBS/CBS):** campos novos entram em fases pelas Notas
  Técnicas; conferir o cronograma vigente ao implementar.

## Endereço de entrega e de cobrança

NF-e só tem o grupo opcional de **entrega** (quando diverge do destinatário).
Não existe endereço de cobrança. A tabela aceita `entrega`/`cobranca` em
`kind`, mas o form edita só o `principal`; implementar a UI de entrega apenas
se surgir essa necessidade.
