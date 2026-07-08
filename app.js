const { App } = require('@slack/bolt');
const { Client } = require('@notionhq/client');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
});

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const testesPorCategoria = {
  'Acesso / Conectividade': [
    { text: { type: 'plain_text', text: 'Com / sem ExitLag' }, value: 'Com/sem ExitLag' },
    { text: { type: 'plain_text', text: 'WFP' }, value: 'WFP' },
    { text: { type: 'plain_text', text: 'NDIS Legacy' }, value: 'NDIS Legacy' },
    { text: { type: 'plain_text', text: 'Redirect Login' }, value: 'Redirect Login' },
  ],
  'Rota / Performance': [
    { text: { type: 'plain_text', text: 'ExitLag ON/OFF' }, value: 'ExitLag ON/OFF' },
    { text: { type: 'plain_text', text: 'Testado em outras rotas' }, value: 'Outras rotas' },
    { text: { type: 'plain_text', text: 'Diagnostico 15 minutos' }, value: 'Diagnostico 15min' },
    { text: { type: 'plain_text', text: 'Reset Network' }, value: 'Reset Network' },
    { text: { type: 'plain_text', text: 'Config 1 TCP / 3 UDP' }, value: '1TCP 3UDP' },
    { text: { type: 'plain_text', text: 'Instalacao limpa ExitLag' }, value: 'Instalacao limpa' },
  ],
  'Bloqueio / Autenticacao': [
    { text: { type: 'plain_text', text: 'Com / sem VPN' }, value: 'Com/sem VPN' },
    { text: { type: 'plain_text', text: 'Teste sem IPv6' }, value: 'Sem IPv6' },
    { text: { type: 'plain_text', text: 'Launcher do game' }, value: 'Launcher game' },
    { text: { type: 'plain_text', text: 'Redirect DNS' }, value: 'Redirect DNS' },
    { text: { type: 'plain_text', text: 'Redirect Login' }, value: 'Redirect Login' },
    { text: { type: 'plain_text', text: 'Outros servidores' }, value: 'Outros servidores' },
  ],
};

app.command('/gs', async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'step1_categoria',
      title: { type: 'plain_text', text: 'Novo ticket — 1/2' },
      submit: { type: 'plain_text', text: 'Proximo' },
      close: { type: 'plain_text', text: 'Cancelar' },
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'Selecione a categoria do problema para ver os testes especificos.' }
        },
        {
          type: 'input',
          block_id: 'categoria',
          element: {
            type: 'static_select',
            action_id: 'value',
            placeholder: { type: 'plain_text', text: 'Selecionar categoria...' },
            options: [
              { text: { type: 'plain_text', text: 'Acesso / Conectividade' }, value: 'Acesso / Conectividade' },
              { text: { type: 'plain_text', text: 'Rota / Performance' }, value: 'Rota / Performance' },
              { text: { type: 'plain_text', text: 'Bloqueio / Autenticacao' }, value: 'Bloqueio / Autenticacao' },
            ]
          },
          label: { type: 'plain_text', text: 'Categoria' }
        },
      ]
    }
  });
});

app.view('step1_categoria', async ({ ack, body, view, client }) => {
  const categoria = view.state.values.categoria.value.selected_option.value;
  const testes = testesPorCategoria[categoria];

  await ack({
    response_action: 'push',
    view: {
      type: 'modal',
      callback_id: 'submit_ticket',
      private_metadata: categoria,
      title: { type: 'plain_text', text: 'Novo ticket — 2/2' },
      submit: { type: 'plain_text', text: 'Enviar ticket' },
      close: { type: 'plain_text', text: 'Voltar' },
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '*Categoria:* ' + categoria }
        },
        {
          type: 'input',
          block_id: 'testes',
          optional: true,
          element: {
            type: 'checkboxes',
            action_id: 'value',
            options: testes
          },
          label: { type: 'plain_text', text: 'Testes realizados' }
        },
        { type: 'divider' },
        {
          type: 'input',
          block_id: 'jogo',
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Ex: Valorant' } },
          label: { type: 'plain_text', text: 'Nome do jogo' }
        },
        {
          type: 'input',
          block_id: 'email',
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'cliente@email.com' } },
          label: { type: 'plain_text', text: 'Email do cliente' }
        },
        {
          type: 'input',
          block_id: 'url',
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'https://...' } },
          label: { type: 'plain_text', text: 'Link do ticket' }
        },
        {
          type: 'input',
          block_id: 'id_ticket',
          optional: true,
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: '' } },
          label: { type: 'plain_text', text: 'ID Ticket (site ExitLag)' }
        },
        {
          type: 'input',
          block_id: 'discord_ticket',
          optional: true,
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: '' } },
          label: { type: 'plain_text', text: 'Discord Ticket' }
        },
        {
          type: 'input',
          block_id: 'regiao',
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Ex: Brasil' } },
          label: { type: 'plain_text', text: 'Regiao' }
        },
        {
          type: 'input',
          block_id: 'servidor',
          element: {
            type: 'static_select',
            action_id: 'value',
            placeholder: { type: 'plain_text', text: 'Selecionar...' },
            options: [
              { text: { type: 'plain_text', text: 'Official Server' }, value: 'Official Server' },
              { text: { type: 'plain_text', text: 'Private Server' }, value: 'Private Server' },
            ]
          },
          label: { type: 'plain_text', text: 'Tipo de servidor' }
        },
        {
          type: 'input',
          block_id: 'link_private',
          optional: true,
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'https://... (somente Private Server)' } },
          label: { type: 'plain_text', text: 'Link servidor private' }
        },
        {
          type: 'input',
          block_id: 'gb',
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'https://...' } },
          label: { type: 'plain_text', text: 'Link GB Analytics' }
        },
        {
          type: 'input',
          block_id: 'request',
          element: { type: 'plain_text_input', action_id: 'value', multiline: true, placeholder: { type: 'plain_text', text: 'Descreva o problema...' } },
          label: { type: 'plain_text', text: 'Descricao detalhada' }
        },
        {
          type: 'input',
          block_id: 'analista',
          element: {
            type: 'static_select',
            action_id: 'value',
            placeholder: { type: 'plain_text', text: 'Selecionar analista...' },
            options: [
              { text: { type: 'plain_text', text: 'Diego' }, value: 'Diego' },
              { text: { type: 'plain_text', text: 'Evan' }, value: 'Evan' },
              { text: { type: 'plain_text', text: 'Marcao' }, value: 'Marcao' },
              { text: { type: 'plain_text', text: 'Thay' }, value: 'Thay' },
              { text: { type: 'plain_text', text: 'Vinicyus' }, value: 'Vinicyus' },
            ]
          },
          label: { type: 'plain_text', text: 'Analista responsavel' }
        },
      ]
    }
  });
});

app.view('submit_ticket', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const categoria = view.private_metadata;
  const testesArr = v.testes.value.selected_options || [];
  const testes = testesArr.map(o => o.value).join(', ') || 'Nenhum';
  const jogo = v.jogo.value.value;
  const email = v.email.value.value;
  const url = v.url.value.value;
  const id_ticket = v.id_ticket.value.value || '';
  const discord_ticket = v.discord_ticket.value.value || '';
  const regiao = v.regiao.value.value;
  const servidor = v.servidor.value.selected_option.value;
  const link_private = v.link_private.value.value || '';
  const gb = v.gb.value.value;
  const request = v.request.value.value;
  const analista = v.analista.value.selected_option.value;

  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      'ID': { title: [{ text: { content: 'TS-' + Date.now().toString().slice(-4) } }] },
      'Status': { select: { name: 'Open' } },
      'Categoria': { select: { name: categoria } },
      'Testes Realizados': { rich_text: [{ text: { content: testes } }] },
      'Aplicacao/Jogo': { rich_text: [{ text: { content: jogo } }] },
      'Email': { email: email },
      'Ticket Number': { rich_text: [{ text: { content: id_ticket } }] },
      'Discord Ticket': { rich_text: [{ text: { content: discord_ticket } }] },
      'Regiao': { rich_text: [{ text: { content: regiao } }] },
      'Tipo do Servidor': { select: { name: servidor } },
      'URL': { url: url },
      'Link Private Server': { url: link_private || null },
      'GB Analytics': { url: gb },
      'Request': { rich_text: [{ text: { content: request } }] },
      'Assigned By': { rich_text: [{ text: { content: analista } }] },
      'Criacao': { date: { start: new Date().toISOString().split('T')[0] } }
    }
  });

  await client.chat.postMessage({
    channel: body.user.id,
    text: 'Ticket criado!\nJogo: ' + jogo + '\nCategoria: ' + categoria + '\nAnalista: ' + analista + '\nTestes: ' + testes
  });
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('GamesBot rodando!');
})();
