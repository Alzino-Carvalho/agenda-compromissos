# Agenda Compromissos

Pequena aplicação de agenda diária/semana com HTML/CSS/JS (vanilla) — salva eventos e notas no localStorage.

## Como usar
- Abra `index.html` no navegador para ver a visão semanal (segunda–sábado).
- Clique em um dia para abrir a página do dia (`day.html?date=YYYY-MM-DD`).
- Adicione eventos por horário (slots de 30 min) e notas semanais.
- Export/Import em JSON disponível no rodapé.

## Reset (iniciar em branco)
Para limpar os dados locais, abra o Console do navegador e rode:
```js
localStorage.removeItem('agendaEvents');
localStorage.removeItem('agendaNotes');
```

## Distribuição
Inclui os arquivos principais: `index.html`, `day.html`, `script.js`, e `styles.css`.

## Contribuição
Sinta-se à vontade para abrir issues/PRs no GitHub.
