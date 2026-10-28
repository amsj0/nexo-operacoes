# Nexo mobile e integração da biblioteca

O cliente independente está em `/mobile`. A carteira é persistida em D1 por perfil fictício do piloto. Adicionar, remover e reordenar serviços altera atalhos; não concede permissões institucionais. Solicitações continuam acessíveis após remover um serviço.

Biblioteca, equipamentos e kits usam o banco do piloto. Salas, almoxarifado, chamados, documentos e atendimentos são exemplos selecionáveis, identificados na interface e sem operações externas implementadas.

## Biblioteca: um endereço, duas operações

Todas as chamadas ao ambiente publicado usam HTTPS e o acesso privado do Site. A seleção `usuarioId` serve à demonstração de perfis fictícios; não representa autenticação ou autorização institucional. Não há credencial institucional no navegador.

### Consultar

`GET /api/biblioteca` — opcionalmente `?busca=robótica`

```json
{"instituicao":"Instituto Horizonte","itens":[{"id":"i1","titulo":"Design de interfaces","autor":"Autor do título","disponiveis":2,"total":3}]}
```

Os números e o autor acima apenas ilustram o contrato; a API consulta os valores atuais do banco. Somente itens do tipo livro são retornados.

### Pré-reservar

`POST /api/biblioteca`, com `Content-Type: application/json`

```json
{"livroId":"i1","usuarioId":"p1"}
```

Resposta `201`:

```json
{"reserva":{"protocolo":"NX-ABC123","livroId":"i1","titulo":"Design de interfaces","usuarioId":"p1","situacao":"pre-reservado","retirarAte":"2026-10-23T18:00:00.000Z"}}
```

A resposta contém protocolo e prazo efetivos. Indisponibilidade, duplicidade e limite de empréstimos retornam `409`; livro inexistente ou de outro serviço retorna `404`; entrada inválida retorna `400`; origem externa retorna `403`. Regras e ocupação de estoque são reaproveitadas do servidor institucional do piloto.

## Cliente mobile

- `GET /api/mobile?person=p1`: perfil demonstrativo, carteira, catálogo e solicitações do perfil.
- `POST /api/mobile`: carteira (`wallet`, com `services` ordenados), reserva de outros serviços (`reserve`), cancelamento (`cancel`) e renovação (`renew`).
- Cancelar e renovar exigem que a operação pertença ao perfil selecionado. Retirada e devolução permanecem no painel da equipe.
- O mobile usa `GET /api/biblioteca` ao abrir a biblioteca e `POST /api/biblioteca` ao pré-reservar um livro.
- Carteira e circulação usam a API com TLS na publicação. A consulta opcional no inspetor preserva a demonstração adicional ECDH/AES-GCM do conector existente; não é um pré-requisito do endpoint simplificado.

## Integração externa

Os endpoints executam operações no banco do próprio piloto. Uma instituição real requer adaptador servidor a servidor para seu sistema, autenticação de serviço, vínculo entre identidade autenticada e cadastro e escopos por instituição. O Site permanece privado. Os perfis são explicitamente simulados e não constituem segregação de contas autenticadas.

## Verificação

`node scripts/verify-worker.mjs` executa os 12 testes anteriores e 15 testes mobile em banco efêmero, sem alterar registros publicados. A migração `0002` adiciona apenas `mobile_wallets`.
