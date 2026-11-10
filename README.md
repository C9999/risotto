# Jogo da memória do Risotto

Site estático (HTML + CSS + JavaScript puro), pronto para publicação no GitHub Pages ou Vercel.

## Fotos

Coloque na pasta `img/`:
- `foto1.jpg` a `foto8.jpg`: imagens usadas nas 16 cartas (8 pares).
- `especial1.jpg` a `especial3.jpg`: imagens especiais sorteadas ao concluir o jogo.

As imagens não vieram no pacote inicial. Adicione fotos do Risotto com esses nomes para substituir os espaços reservados/ícones de cachorro. O nome e as configurações ficam em `config.js`.

Dica: prefira fotos quadradas, com até aproximadamente 300 KB cada.

## Testar localmente

Execute `python -m http.server 8000` na pasta do projeto e abra http://localhost:8000.

Sem Firebase configurado, o ranking funciona em modo demonstração e fica salvo somente no navegador.

## Ativar login Google e ranking geral (Firebase)

1. Crie um projeto em https://console.firebase.google.com.
2. Em Authentication → Sign-in method, ative Google.
3. Em Authentication → Settings → Authorized domains, adicione o domínio publicado e `localhost`.
4. Crie um banco Firestore e publique as regras de `firestore.rules`.
5. Em Project settings → Your apps → Web, copie `apiKey`, `authDomain`, `projectId` e `appId` para `config.js`.

As chaves de configuração do Firebase para aplicações web são públicas por natureza; as regras do Firestore controlam o acesso aos dados.

## Publicar no GitHub Pages

No repositório, abra Settings → Pages → Build and deployment → Deploy from a branch. Selecione `main` e a pasta `/(root)`.

## Observações

- Cada pessoa tem um registro de melhor tempo, nome e data.
- Jogar novamente só substitui o registro quando o novo tempo é melhor; o nome pode ser atualizado.
- O tempo é medido no navegador e pode ser manipulado por um cliente malicioso.
- Os latidos são sintetizados pelo navegador, sem arquivos de áudio externos.
