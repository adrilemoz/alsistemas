# Guia de Deploy — AL Sistemas

## 1. Ativar API Key do Render

A `RENDER_API_KEY` permite que o painel admin mostre seus serviços e histórico de deploys.

### Passo a passo

1. Acesse [dashboard.render.com](https://dashboard.render.com) e faça login

2. Clique no **avatar** no canto superior direito → **Account Settings**

3. No menu lateral, clique em **API Keys**

4. Clique em **Create API Key**
   - Name: `alsistemas-admin` (ou qualquer nome)
   - Clique em **Create API Key**
   - **Copie a chave agora** — ela não será exibida novamente

5. Vá para o seu **serviço backend** no Render
   - Dashboard → selecione o serviço `alsistemas` (backend)
   - Menu lateral → **Environment**

6. Clique em **Add Environment Variable**
   - Key: `RENDER_API_KEY`
   - Value: *(cole a chave copiada)*

7. Clique em **Save Changes** → o serviço irá redeployar automaticamente

---

## 2. Ativar Token do Vercel

O `VERCEL_TOKEN` permite que o painel admin mostre seus projetos e deploys no Vercel.

### Passo a passo

1. Acesse [vercel.com](https://vercel.com) e faça login

2. Clique no **avatar** no canto superior direito → **Settings**

3. No menu lateral, clique em **Tokens**

4. Clique em **Create Token**
   - Name: `alsistemas-admin`
   - Scope: **Full Account**
   - Expiration: escolha conforme preferir (ou "No Expiration")
   - Clique em **Create**
   - **Copie o token agora** — ele não será exibido novamente

5. Vá para o Render → seu serviço backend → **Environment**

6. Clique em **Add Environment Variable**
   - Key: `VERCEL_TOKEN`
   - Value: *(cole o token copiado)*

7. Clique em **Save Changes** → redeploy automático

---

## 3. Gerar APK Android via GitHub Actions

O workflow `.github/workflows/build-apk.yml` gera o APK automaticamente.

### 3a. APK Debug (sem keystore — para testes)

Dispara automaticamente em todo push para `main`. Para disparar manualmente:

1. Vá para o repositório no GitHub
2. Aba **Actions** → selecione **🤖 Build Android APK**
3. Clique em **Run workflow**
   - Branch: `main`
   - Tipo de build: `debug`
4. Clique em **Run workflow**
5. Aguarde ~5–8 minutos
6. Ao concluir, clique no run → **Artifacts** → baixe `alsistemas-debug-<sha>`

> ⚠️ O APK debug só pode ser instalado com **Depuração USB ativa** no Android
> (Configurações → Sobre → Tocar 7x no número de build → Opções do desenvolvedor → Depuração USB)

---

### 3b. APK Release (assinado — para distribuição)

Requer configurar o keystore como secrets no GitHub.

#### Pré-requisito: ter um keystore

Se ainda não tem um keystore, gere um:

```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias alsistemas \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

> ⚠️ **Guarde o arquivo `release.keystore` e as senhas em local seguro.**
> Se perder o keystore, não poderá atualizar o app na Play Store.

#### Configurar os secrets no GitHub

1. No repositório GitHub → **Settings** → **Secrets and variables** → **Actions**

2. Clique em **New repository secret** para cada um abaixo:

| Secret | Valor |
|---|---|
| `KEYSTORE_BASE64` | Keystore em base64 (veja abaixo como gerar) |
| `KEYSTORE_PASSWORD` | Senha do keystore (digitada ao gerar) |
| `KEY_ALIAS` | `alsistemas` |
| `KEY_PASSWORD` | Senha da chave (digitada ao gerar) |

**Como gerar o base64 do keystore:**

```bash
# Linux
base64 -w 0 release.keystore

# macOS
base64 release.keystore

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore"))
```

Cole o resultado completo como valor do secret `KEYSTORE_BASE64`.

#### Disparar o build Release

1. GitHub → **Actions** → **🤖 Build Android APK**
2. **Run workflow**
   - Tipo de build: `release`
3. Aguarde ~8–12 minutos
4. Ao concluir → **Artifacts** → baixe `alsistemas-release-<sha>`

O APK release pode ser instalado em qualquer Android sem precisar de modo desenvolvedor.

---

## 4. Resumo das variáveis de ambiente

### Backend (Render — Environment Variables)

| Variável | Obrigatório | Descrição |
|---|---|---|
| `MONGO_URI` | ✅ | URI de conexão do MongoDB |
| `JWT_SECRET` | ✅ | Chave secreta para tokens JWT |
| `FRONTEND_URL` | ✅ | `https://alsistemas.vercel.app` |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `3001` (ou deixe o Render definir) |
| `RENDER_API_KEY` | ⭐ | Para mostrar serviços no painel admin |
| `VERCEL_TOKEN` | ⭐ | Para mostrar projetos no painel admin |
| `CLOUDINARY_*` | ⭐ | Para upload de imagens |
| `REDIS_URL` | ⭐ | Para cache Redis |
| `GROQ_API_KEY` | ⭐ | Para funcionalidades de IA |

### Frontend (Vercel — Environment Variables)

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://alsistemas.onrender.com/api` |
| `VITE_APP_NAME` | `AL Sistemas` |
| `VITE_APP_TAGLINE` | `Painel de Gerenciamento` |
| `VITE_APP_VERSION` | versão atual |

### GitHub Actions (Secrets — apenas para APK Release)

| Secret | Descrição |
|---|---|
| `KEYSTORE_BASE64` | `release.keystore` em base64 |
| `KEYSTORE_PASSWORD` | Senha do keystore |
| `KEY_ALIAS` | `alsistemas` |
| `KEY_PASSWORD` | Senha da chave |
