# Firebase e Vercel — Car Vault

## Configuração no console

Projeto: `car-vault-816ba`. Site: `https://car-vault-one.vercel.app`.

1. Em **Authentication → Sign-in method**, habilite **Google** e escolha o e-mail de suporte.
2. Em **Authentication → Settings → Authorized domains**, adicione `car-vault-one.vercel.app` (sem protocolo). Para testar localmente, adicione `localhost` e abra o Vite por esse hostname.
3. Em **Firestore Database**, crie o banco **(default)**, edição **Standard**, em modo de produção, caso ainda não exista. Para um banco novo no Canadá, Toronto (`northamerica-northeast2`) é uma opção. A região não pode ser alterada depois.
4. Em **Firestore → Rules**, cole o conteúdo de `firestore.rules` da raiz e publique. As regras permitem acesso apenas ao UID proprietário e validam os tipos dos registros.
5. Não é necessário configurar Analytics, Firebase Hosting ou Cloud Storage para os recursos atuais. Anexos binários ainda não são enviados; documentos armazenam metadados/referências.

As configurações acima e a publicação das regras não são executadas automaticamente por este repositório. Se preferir CLI, na raiz do repositório:

```powershell
firebase login
firebase deploy --only firestore:rules --project car-vault-816ba
```

## Variáveis de ambiente

Copie `frontend/.env.example` para `frontend/.env.local` para desenvolvimento. Esse arquivo local é ignorado pelo Git. A configuração recebida já foi colocada no `.env.local` desta máquina.

Na Vercel, abra **Project → Settings → Environment Variables** e cadastre os seis nomes abaixo, usando os valores do `.env.example`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Mantenha `authDomain` como `car-vault-816ba.firebaseapp.com`. O login usa popup do Google. Se bloqueado, o app pede para permitir popups. Variáveis `VITE_*` são públicas no bundle: nunca inclua chave privada ou conta de serviço nelas.

Use **Root Directory: frontend**, instalação `npm ci --include=dev`, build `npm run build`, saída `dist`. Após cadastrar as variáveis, faça um **Redeploy**: elas são incorporadas no build. Sem configuração Firebase, o app continua no modo local.

### Erro `vite: command not found`

Em **Vercel → Project → Settings → Build and Deployment**, confirme:

| Campo | Valor |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | `Vite` |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

O `vercel.json` está dentro de `frontend`, assim como `package.json` e o lockfile.
Usar a raiz do repositório impede a leitura dessa configuração e a instalação
das dependências no diretório correto. Vite e TypeScript são dependências de
desenvolvimento necessárias para compilar; `--include=dev` garante sua instalação.
Envie o commit com esses arquivos e crie um deploy desse commit, sem reutilizar
o cache de build. Reimplantar um deploy antigo não inclui alterações posteriores.
No log, confirme a instalação e a execução de `npm run build`.

## Uso e migração

Abra **More → Settings → Account & Sync → Continue with Google**. Marque dispositivo confiável para habilitar cache persistente no IndexedDB e manter o login. Sem essa opção, o cache da conta fica em memória e o login dura a sessão do navegador. A primeira abertura da conta precisa de conexão; dados já carregados podem ser acessados offline no dispositivo confiável.

O modo local continua usando `car_vault_data_v1` no `localStorage`. Entrar em uma conta não envia registros locais nem grava dados da conta nessa chave. Contas e formulários são recriados ao trocar de usuário.

Para migrar, use **Import local garage** e confirme a conta de destino. Apenas IDs ausentes são adicionados; preferências e registros existentes da conta são preservados. Repetir a importação não duplica registros nem sobrescreve uma edição mais recente. Dados de demonstração só entram se você confirmar a importação de uma garagem local que os contenha.

O armazenamento local depende do domínio: para levar dados do localhost à Vercel, exporte JSON no endereço antigo. Na Vercel, entre na conta e use **Merge JSON Backup**. Mantenha o backup original.

## Modelo e sincronização

Cada entidade ocupa um documento em `users/{uid}/records/{kind}~{id}`; as preferências ficam em `users/{uid}/records/settings`. `kind` identifica vehicles, fuelEntries, chargingEntries, expenses, maintenanceRecords, reminders ou documents. O campo `value` contém os dados da entidade. Uma única assinatura da coleção mantém a visão da conta consistente; apenas registros alterados são enviados.

O SDK do Firestore gerencia a fila offline e a sincronização. Edições concorrentes em registros diferentes são preservadas; para o mesmo registro, prevalece a última escrita recebida pelo servidor. Sincronização também replica exclusões e não substitui backup.

O app mostra dados em cache, alterações pendentes e erros. A saída da conta é bloqueada enquanto existem gravações pendentes. Em caso de rejeição, a alteração permanece disponível para exportação e nova tentativa na sessão atual; não feche a página antes de exportar ou resolver o erro. Contas em dispositivos confiáveis deixam dados no cache do navegador após sair; use essa opção somente em dispositivo pessoal.

Importações e exclusões em massa exigem conexão e ausência de gravações pendentes. Cada operação é atômica e aceita até **400 registros alterados**. Operações maiores são rejeitadas antes de escrever; divida backups maiores ou exclua um veículo por vez. Não há promessa de um cache completo em um dispositivo que nunca carregou os dados.

## Validação

```powershell
cd frontend
npm run test:run
npm run build
```

Teste das regras em um projeto fictício, a partir da raiz (requer Firebase CLI e Java):

```powershell
firebase emulators:exec --only firestore --project demo-car-vault "npm --prefix frontend run test:rules"
```

Antes de usar dados reais, valide em `car-vault-one.vercel.app`: login Google, gravação de um veículo de teste, leitura no outro dispositivo, edição offline/reconexão, saída/troca de conta e importação de backup. Os testes locais não comprovam que o provedor Google, os domínios e as regras já foram configurados no console.

## Referências

- [Configuração Web do Firebase](https://firebase.google.com/docs/web/setup)
- [Login Google](https://firebase.google.com/docs/auth/web/google-signin)
- [Persistência offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Regras por usuário](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite)
