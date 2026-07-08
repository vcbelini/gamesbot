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
      title: { type: 'plain_text', text: 'Novo Ticket' },
      submit: { type: 'plain_text', text: 'Enviar' },
      close: { type: 'plain_text', text: 'Cancelar' },
      blocks: [
        { type: 'input', block_id: 'jogo', element: { type: 'plain_text_input', action_id: 'value' }, label: { type: 'plain_text', text: 'Nome do Jogo' } },
        { type: 'input', block_id: 'email', element: { type: 'plain_text_input', action_id: 'value' }, label: { type: 'plain_text', text: 'Email do Cliente' } },
        { type: 'input', block_id: 'ticket', element: { type: 'plain_text_input', action_id: 'value' }, label: { type: 'plain_text', text: 'Discord Ticket' } },
        { type: 'input', block_id: 'regiao', element: { type: 'plain_text_input', action_id: 'value' }, label: { type: 'plain_text', text: 'Região' } },
        { type: 'input', block_id: 'categoria', element: { type: 'static_select', action_id: 'value', options: [
          { text: { type: 'plain_text', text: 'Acesso / Conectividade' }, value: 'Acesso / Conectividade' },
          { text: { type: 'plain_text', text: 'Rota / Performance' }, value: 'Rota / Performance' },
          { text: { type: 'plain_text', text: 'Bloqueio / Autenticação' }, value: 'Bloqueio / Autenticação' },
        ]}, label: { type: 'plain_text', text: 'Categoria' } },
        { type: 'input', block_id: 'request', element: { type: 'plain_text_input', action_id: 'value', multiline: true }, label: { type: 'plain_text', text: 'Descrição' } },
        { type: 'input', block_id: 'url', element: { type: 'plain_text_input', action_id: 'value' }, label: { type: 'plain_text', text: 'URL do Ticket' } },
      ]
    }
  });
});

app.view('submit_ticket', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const user = body.user.name;
  const jogo = v.jogo.value.value;
  const email = v.email.value.value;
  const ticket = v.ticket.value.value;
  const regiao = v.regiao.value.value;
  const categoria = v.categoria.value.value;
  const request = v.request.value.value;
  const url = v.url.value.value;

  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      'ID': { title: [{ text: { content: `TS-${Date.now().toString().slice(-4)}` } }] },
      'Status': { select: { name: 'Open' } },
      'Aplicação/Jogo': { rich_text: [{ text: { content: jogo } }] },
