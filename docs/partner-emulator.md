# Emulador de servidor parceiro

Painel: `/admin/parceiro`. Cliente Nexo dedicado: `/mobile/parceiro`.

O cliente de teste envia operações à API do parceiro. O parceiro verifica a sessão e as permissões antes de chamar um adaptador institucional. Os três componentes são executados no mesmo Site/Worker, com separação lógica; o adaptador não acessa uma rede externa. As reservas do emulador usam tabelas próprias e não modificam a circulação original do Nexo.

## Acesso administrativo real

- A hospedagem mantém o Site privado.
- Páginas e APIs exigem a identidade fornecida pela autenticação do Sites. A aplicação não confia em usuário, função ou e-mail enviados no corpo da requisição.
- `NEXO_PARTNER_ADMIN_EMAILS` contém a lista administrativa, configurada como segredo de runtime. Atualmente autoriza o proprietário confirmado do piloto.
- Todos os endpoints do emulador recusam visitantes não autenticados e contas fora da lista. A ausência de configuração bloqueia o acesso; não existe fallback administrativo.
- Os cabeçalhos `oai-authenticated-user-*` são a fronteira de confiança do Sites. Ao portar a aplicação, é necessário substituí-los por autenticação verificada no servidor e impedir cabeçalhos de identidade enviados pelo visitante.
- Um token de acesso de serviço ao Site, isoladamente, não estabelece identidade administrativa e é recusado.

## Sessão institucional simulada

O administrador escolhe um dos três perfis fictícios. O servidor emite um JWT HS256 com emissor `nexo-partner-demo`, destinatário `nexo-partner-gateway`, perfil, identificador da sessão, visitante autenticado, validade de cinco minutos e campos explícitos `authentication: simulated` e `mfa_simulated`.

O JWT é assinado de fato com HMAC-SHA256. Ele não é um token do Google e seu segundo fator não comprova MFA real. A chave é gerada com Web Crypto e mantida somente no banco do servidor. Uma implantação institucional deve usar gestão de segredos, chaves e rotação apropriadas.

O token é entregue em cookie `HttpOnly; SameSite=Lax; Path=/api/parceiro`, com `Secure` em HTTPS. A UI e os logs não exibem o token ou a chave. A sessão também existe no banco para permitir revogação imediata e vínculo ao visitante real. Cada operação verifica assinatura, emissor, destinatário, validade, revogação, vínculo institucional, política de MFA simulado e escopo da operação.

## Duas instituições

| Perfil fictício | Horizonte | Aurora |
|---|---|---|
| Marina Oliveira | Biblioteca | Sem vínculo |
| Rafael Lima | Biblioteca | Biblioteca |
| Luiza Costa | Sem vínculo | Biblioteca |

Cada instituição tem seu próprio acervo, disponibilidade e reservas. As consultas e a gravação de reservas recebem o usuário a partir da sessão verificada e são filtradas pela instituição autorizada. Alterar `subject` no pedido não altera a identidade. A carteira geral em `/mobile` continua sendo o piloto anterior; o cliente conectado ao parceiro fica em `/mobile/parceiro`.

## Endpoints

| Endpoint | Finalidade |
|---|---|
| `GET /api/admin/parceiro` | Políticas, sessões recentes e decisões, sem credenciais |
| `POST /api/admin/parceiro` | Preparar dados fictícios, emitir/revogar sessão, alterar políticas e executar testes |
| `GET /api/parceiro/sessao` | Verificar sessão e consultar vínculos do perfil |
| `POST /api/parceiro/operacoes` | Consultar acervo ou criar pré-reserva por meio do parceiro |

Corpo de uma consulta:

```json
{"institutionId":"horizonte","operation":"catalog.read"}
```

Corpo de uma pré-reserva:

```json
{"institutionId":"horizonte","operation":"reservations.create","itemId":"h-book-1"}
```

Os endpoints POST validam a origem. O servidor institucional emulado grava reservas com controle atômico de estoque e recusa duplicidades. O histórico apresenta até 30 decisões recentes; não é um registro inviolável.

## Criptografia e próximos passos

- Cliente → parceiro: HTTPS/TLS na publicação. O parceiro interpreta o JSON e o JWT; a assinatura do JWT não cifra o corpo da requisição.
- Parceiro → adaptador institucional: chamada interna no mesmo Worker. Não existe uma segunda conexão de rede para demonstrar TLS neste trecho.
- Banco: D1 da infraestrutura existente. A proteção do provedor é independente de Google Account.
- A demonstração AES-GCM anterior do Nexo permanece independente desse fluxo.
- Login Google, MFA real, QR institucional e uma API institucional externa ainda precisam ser integrados. A futura autenticação externa deve substituir o emissor fictício sem remover os controles administrativos e de autorização.

## Verificação

`node scripts/verify-worker.mjs`: 27 verificações anteriores e 22 verificações do parceiro, em runtime de produção com banco efêmero. Os testes usam cabeçalhos de identidade de fixtures apenas no dispatcher isolado. Eles não alteram a autenticação hospedada nem os dados publicados.

A prévia local não recebe a sessão real do Sites: o bloqueio sem identidade foi verificado nela. A revisão visual usa uma rota temporária com fixtures identificadas e controles de escrita desabilitados; essa rota não integra a publicação.
