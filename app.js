const { App } = require('@slack/bolt');
const { Client } = require('@notionhq/client');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
});

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

app.command('/gs', async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'submit_ticket',
      title: { type: 'plain_text', text: 'Novo ticket' },
      submit: { type: 'plain_text', text: 'Enviar ticket' },
      close: { type: 'plain_text', text: 'Cancelar' },
      blocks: [
        {
          type: 'input',
          block_id: 'categoria',
          element: {
            type: 'static_select',
            action_id: 'value',
            placeholder: { type: 'plain_text', text: 'Selecionar categoria...' },
            options: [
              { text: { type: 'plain_text', text: '🌐 Acesso / Conectividade' }, value: 'Acesso / Conectividade' },
              { text: { type: 'plain_text', text: '📉 Rota / Performance' }, value: 'Rota / Performance' },
              { text: { type: 'plain_text', text: '🚫 Bloqueio / Autenticação' }, value: 'Bloqueio / Autenticação' },
            ]
          },
          label: { type: 'plain_text', text: 'Categoria' }
        },
        {
          type: 'input',
          block_id: 'testes',
          element: {
            type: 'checkboxes',
            action_id: 'value',
            options: [
              { text: { type: 'plain_text', text: 'Com / sem ExitLag' }, value: 'Com / sem ExitLag' },
              { text: { type: 'plain_text', text: 'WFP' }, value: 'WFP' },
              { text: { type: 'plain_text', text: 'NDIS Legacy' }, value: 'NDIS Legacy' },
              { text: { type: 'plain_text', text: 'Redirect Login' }, value: 'Redirect Login' },
              { text: { type: 'plain_text', text: 'ExitLag ON/OFF' }, value: 'ExitLag ON/OFF' },
              { text: { type: 'plain_text', text: 'Testado em outras rotas' }, value: 'Testado em outras rotas' },
              { text: { type: 'plain_text', text: 'Diagnóstico de 15 minutos' }, value: 'Diagnóstico de 15 minutos' },
              { text: { type: 'plain_text', text: 'Reset Network' }, value: 'Reset Network' },
              { text: { type: 'plain_text', text: 'Config 1 TCP / 3 UDP' }, value: 'Config 1 TCP / 3 UDP' },
              { text: { type: 'plain_text', text: 'Instalação limpa do ExitLag' }, value: 'Instalação limpa do ExitLag' },
              { text: { type: 'plain_text', text: 'Com / sem VPN' }, value: 'Com / sem VPN' },
              { text: { type: 'plain_text', text: 'Teste sem IPv6' }, value: 'Teste sem IPv6' },
              { text: { type: 'plain_text', text: 'Adicionado Launcher do game' }, value: 'Adicionado Launcher do game' },
              { text: { type: 'plain_text', text: 'Redirect DNS' }, value: 'Redirect DNS' },
            ]
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
          block_id: 'ticket',
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Tech-0063' } },
          label: { type: 'plain_text', text: 'Discord Ticket' }
        },
        {
          type: 'input',
          block_id: 'regiao',
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Ex: Brasil' } },
          label: { type: 'plain_text', text: 'Região' }
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
          block_id: 'url',
          element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'https://...' } },
          label: { type: 'plain_text', text: 'Link do ticket' }
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
          label: { type: 'plain_text', text: 'Descrição detalhada' }
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
              { text: { type: 'plain_text', text: 'Marcão' }, value: 'Marcão' },
              { text: { type: 'plain_text', text: 'Thay' }, value: 'Thay' },
              { text: { type: 'plain_text', text: 'Vinicyus' }, value: 'Vinicyus' },
            ]
          },
          label: { type: 'plain_text', text: 'Analista responsável' }
        },
      ]
    }
  });
});

app.view('submit_ticket', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const categoria = v.categoria.value.selected_option.value;
  const testes = v.testes.value.selected_options.map(o => o.value).join(', ');
  const jogo = v.jogo.value.value;
  const email = v.email.value.value;
  const ticket = v.ticket.value.value;
  const regiao = v.regiao.value.value;
  const servidor = v.servidor.value.selected_option.value
