# Jogo da memória do schnauzer: resumo e Firestore

## 1. O que combinamos

**Projeto:** jogo da memória como SPA (single page application), com fotos do seu cachorro schnauzer, publicado no GitHub Pages.

**Evolução**
1. A primeira versão era um jogo com schnauzers desenhados em tema de spa. Você esclareceu que "SPA" era single page application, e a lógica do jogo foi aprovada.
2. A versão atual é um projeto estático (HTML + CSS + JS puro), sem tema de spa, com as regras abaixo.

**Regras e recursos**
- 8 pares de fotos do seu cachorro; os dois cartões de cada par têm a mesma cor de borda.
- Cronômetro que começa na primeira carta virada e para ao achar o último par.
- Erro de par: latido curto. A cada 4 erros: latido alto e contínuo, até a pessoa tocar em "Parar latido" ou começar outro jogo.
- Ao terminar: aparece 1 de 3 fotos especiais, sorteada. Elas não fazem parte das cartas.
- Ranking de tempo com login Google:
  - grava nome, tempo e data;
  - o nome pode ser editado pela pessoa;
  - o ranking geral mostra o top 10 e destaca a posição da pessoa, mesmo fora do top 10;
  - há um botão de compartilhar.
- Navegação por hash (`#/` para o jogo, `#/ranking` para o ranking), o que caracteriza a SPA.

**Arquivos gerados** (pasta `schnauzer-memoria/`)

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página (jogo, ranking, alerta de latido) |
| `style.css` | Visual, modo escuro e animação de virar a carta |
| `config.js` | Nome do cachorro, lista de fotos, chaves do Firebase |
| `app.js` | Lógica do jogo, áudio, login, ranking e rotas |
| `firestore.rules` | Regras de segurança do banco |
| `README.md` | Passo a passo de publicação |
| `img/` | Onde ficam `foto1..8.jpg` e `especial1..3.jpg` |

**Pendências suas**
- Criar o repositório no GitHub e subir as fotos.
- Criar o projeto no Firebase e colar as chaves em `config.js`.
- Opcional: trocar o latido sintetizado por um mp3 real.

Sem Firebase configurado, o jogo funciona em **modo demonstração**, com ranking só no navegador de quem joga.

---

## 2. O que é o Firestore

(O nome correto é **Firestore**, o *Cloud Firestore*.)

É um banco de dados do Firebase/Google. Ele guarda dados na nuvem e entrega o mesmo conteúdo para todos os usuários, sem você precisar manter um servidor. Isso resolve o problema do GitHub Pages, que só serve arquivos estáticos e não guarda nada. O ranking compartilhado precisa de um lugar assim.

### Como ele organiza os dados
É um banco **NoSQL de documentos**, não uma tabela de linhas e colunas.

```
ranking                  ← coleção (como uma pasta)
 ├─ uid_da_maria         ← documento (como um arquivo)
 │    name: "Maria"      ← campos
 │    ms:   42300
 │    date: "2026-11-10T14:00:00Z"
 └─ uid_do_joao
      name: "João"
      ms:   51800
      date: "2026-11-10T15:20:00Z"
```

- **Coleção:** grupo de documentos (aqui, `ranking`).
- **Documento:** um registro com campos. Aqui o ID do documento é o `uid` do usuário no Google, então cada pessoa tem **um** registro, o do melhor tempo.
- **Campo:** cada dado guardado: `name`, `ms` (tempo em milissegundos) e `date`.

### Como o projeto usa
- **Salvar:** `setDoc` cria ou substitui o registro da pessoa. Só substitui se o tempo novo for melhor; se não for, apenas o nome é atualizado.
- **Top 10:** consulta ordenada por `ms` crescente, com `limit(10)`.
- **Posição de quem está fora do top 10:** conta quantos documentos têm `ms` menor que o seu e soma 1 (`getCountFromServer`).
- **Renomear:** `updateDoc` altera só o campo `name`.

### Firebase Authentication
O login com Google é outro serviço do Firebase. Ele devolve um `uid` único por pessoa, e o Firestore usa esse `uid` para decidir quem pode escrever em qual documento.

### Regras de segurança (`firestore.rules`)
Como o código roda no navegador, qualquer pessoa pode ver as chaves de `config.js`. Isso é normal no Firebase: quem protege os dados são as **regras**. As do projeto dizem:
- **Ler:** qualquer pessoa pode ler o ranking.
- **Criar ou atualizar:** só quem está logado, e só o próprio documento (`request.auth.uid == uid`).
- **Atualizar:** o tempo novo não pode ser pior que o antigo.
- **Validar:** os campos são só `name`, `ms` e `date`; o nome tem de 1 a 20 caracteres; o tempo fica entre 3 s e 1 h.
- **Apagar:** ninguém pode.

**Limite:** o tempo é medido no navegador, então alguém técnico ainda pode enviar um valor falso dentro do intervalo permitido. Para um ranking de brincadeira entre amigos isso costuma ser aceitável. Para algo competitivo, seria preciso validar no servidor (Cloud Functions).

### Custo
O Firebase tem um plano gratuito com cota diária de leituras, escritas e armazenamento. Um jogo pequeno dificilmente chega perto, mas **confira os limites atuais** no site do Firebase. Cada vez que alguém abre o ranking, a consulta conta como leituras (até 10 documentos mais a contagem). Se o jogo viralizar, esse é o número a acompanhar.

### Passo a passo (resumo do README)
1. Criar um projeto em console.firebase.google.com.
2. **Authentication** → ativar o provedor **Google**.
3. Em *Authorized domains*, adicionar `SEU-USUARIO.github.io` (e `localhost` para testes).
4. **Firestore Database** → criar o banco → aba *Rules* → colar o `firestore.rules` → Publicar.
5. **Project settings** → app Web → copiar `apiKey`, `authDomain`, `projectId` e `appId` para `config.js`.
6. No GitHub: *Settings* → *Pages* → *Deploy from a branch* → `main` / root.

### Erros comuns
- **Popup do Google não abre ou dá erro de domínio:** faltou adicionar o domínio do GitHub Pages em *Authorized domains*.
- **"Missing or insufficient permissions":** as regras não foram publicadas, ou o documento não passou na validação (nome vazio, tempo fora do limite).
- **Ranking vazio mesmo após salvar:** confira se o `projectId` em `config.js` é o do mesmo projeto onde você publicou as regras.
