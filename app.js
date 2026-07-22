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
  // 'Outros' tem nenhum teste fixo pré-definido — o bloco de checkboxes é
  // simplesmente omitido no modal 2/2 quando essa categoria é selecionada.
};

const aplicavelPorCategoria = {
  'Acesso / Conectividade': '📌 *Aplicável para:*\n• timeout  • disconnect  • não conecta  • erro ao logar  • não cria conexão',
  'Rota / Performance': '📌 *Aplicável para:*\n• ping alto  • packet loss  • instabilidade  • lag  • jitter  • rota ruim',
  'Bloqueio / Autenticacao': '📌 *Aplicável para:*\n• launcher bloqueado  • anti-cheat  • login falhando  • jogo não abre',
  'Outros': '📌 *Aplicável para:*\n• qualquer problema que não se encaixe nas outras categorias',
};

const ticketMap = {};
const timerMap = {};
const TEMPO_AVISO = 30 * 1000;

function agendarAviso(threadTs, channelId) {
  if (timerMap[threadTs]) clearTimeout(timerMap[threadTs]);
  timerMap[threadTs] = setTimeout(async () => {
    if (!ticketMap[threadTs]) return;
    try {
      await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channelId,
        thread_ts: threadTs,
        text: '⚠️ *Lembrete:* Este ticket está sem interação na thread. Alguém pode verificar?'
      });
    } catch (e) {
      console.error('Erro ao enviar aviso:', e.message);
    }
  }, TEMPO_AVISO);
}

function getTodayBRT() {
  const now = new Date();
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return brt.toISOString().split('T')[0];
}

function buildModal2(categoria) {
  const testes = testesPorCategoria[categoria];
  const today = getTodayBRT();
  // Categoria "Outros" cobre problemas fora do padrão, então as informações
  // detalhadas (jogo, client, email, link, regiao, servidor, descricao)
  // deixam de ser obrigatórias — pode não dar pra preencher tudo isso.
  const isOutros = categoria === 'Outros';
  const aplicavelText = aplicavelPorCategoria[categoria];

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: '*Categoria:* ' + categoria } },
  ];

  if (aplicavelText) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: aplicavelText } });
  }

  blocks.push({ type: 'divider' });

  // Bloco de testes só existe se a categoria tiver uma lista definida
  // (checkboxes do Slack não aceitam "options" vazio)
  if (testes && testes.length > 0) {
    blocks.push({ type: 'input', block_id: 'testes', optional: true, element: { type: 'checkboxes', action_id: 'value', options: testes }, label: { type: 'plain_text', text: 'Testes realizados' } });
    blocks.push({ type: 'divider' });
  }

  blocks.push(
    { type: 'section', block_id: 'solicitacao', text: { type: 'mrkdwn', text: 'Pick a date for the requisition.' }, accessory: { type: 'datepicker', action_id: 'value', initial_date: today, placeholder: { type: 'plain_text', text: 'Select date' } } },
    { type: 'input', block_id: 'jogo', optional: isOutros, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Ex: Valorant' } }, label: { type: 'plain_text', text: 'Nome do jogo' } },
    { type: 'input', block_id: 'client', optional: isOutros, element: { type: 'static_select', action_id: 'value', placeholder: { type: 'plain_text', text: 'Selecionar OS...' }, options: [{ text: { type: 'plain_text', text: 'Windows' }, value: 'Windows' }, { text: { type: 'plain_text', text: 'Android' }, value: 'Android' }, { text: { type: 'plain_text', text: 'iOS' }, value: 'iOS' }, { text: { type: 'plain_text', text: 'Site' }, value: 'Site' }] }, label: { type: 'plain_text', text: 'Client' } },
    { type: 'input', block_id: 'email', optional: isOutros, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'cliente@email.com' } }, label: { type: 'plain_text', text: 'Email do cliente' } },
    { type: 'input', block_id: 'url', optional: isOutros, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'https://...' } }, label: { type: 'plain_text', text: 'Link do ticket' } },
    { type: 'input', block_id: 'id_ticket', optional: true, element: { type: 'plain_text_input', action_id: 'value' }, label: { type: 'plain_text', text: 'Ticket Number' } },
    { type: 'input', block_id: 'discord_ticket', optional: true, element: { type: 'plain_text_input', action_id: 'value' }, label: { type: 'plain_text', text: 'Discord Ticket' } },
    { type: 'input', block_id: 'regiao', optional: isOutros, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Ex: Brasil' } }, label: { type: 'plain_text', text: 'Regiao' } },
    { type: 'input', block_id: 'isp', optional: true, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Ex: Claro, Vivo, Tim...' } }, label: { type: 'plain_text', text: 'ISP' } },
    { type: 'input', block_id: 'servidor', optional: isOutros, element: { type: 'static_select', action_id: 'value', placeholder: { type: 'plain_text', text: 'Selecionar...' }, options: [{ text: { type: 'plain_text', text: 'Official Server' }, value: 'Official Server' }, { text: { type: 'plain_text', text: 'Private Server' }, value: 'Private Server' }] }, label: { type: 'plain_text', text: 'Tipo de servidor' } },
    { type: 'input', block_id: 'link_private', optional: true, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'somente Private Server' } }, label: { type: 'plain_text', text: 'Link servidor private' } },
    { type: 'input', block_id: 'gb', optional: isOutros, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'https://...' } }, label: { type: 'plain_text', text: 'Link GB Analytics' } },
    { type: 'input', block_id: 'tags', optional: true, element: { type: 'multi_static_select', action_id: 'value', placeholder: { type: 'plain_text', text: 'Selecionar tags...' }, options: [{ text: { type: 'plain_text', text: 'Tecnico' }, value: 'Tecnico' }, { text: { type: 'plain_text', text: 'Adicao de jogos' }, value: 'Adicao de jogos' }, { text: { type: 'plain_text', text: 'Adicao de FS/BS' }, value: 'Adicao de FS/BS' }, { text: { type: 'plain_text', text: 'Login' }, value: 'Login' }, { text: { type: 'plain_text', text: 'Bypass' }, value: 'Bypass' }, { text: { type: 'plain_text', text: 'Outros' }, value: 'Outros' }] }, label: { type: 'plain_text', text: 'Tags' } },
    { type: 'input', block_id: 'request', optional: isOutros, element: { type: 'plain_text_input', action_id: 'value', multiline: true, placeholder: { type: 'plain_text', text: 'Descreva o problema...' } }, label: { type: 'plain_text', text: 'Descricao detalhada' } },
    // Analista responsavel permanece obrigatorio em todas as categorias -
    // define quem vai atender o ticket, independente do tipo de problema.
    { type: 'input', block_id: 'analista', element: { type: 'static_select', action_id: 'value', placeholder: { type: 'plain_text', text: 'Selecionar analista...' }, options: [{ text: { type: 'plain_text', text: 'Diego' }, value: 'Diego' }, { text: { type: 'plain_text', text: 'Evan' }, value: 'Evan' }, { text: { type: 'plain_text', text: 'Marcao' }, value: 'Marcao' }, { text: { type: 'plain_text', text: 'Thay' }, value: 'Thay' }, { text: { type: 'plain_text', text: 'Vinicyus' }, value: 'Vinicyus' }] }, label: { type: 'plain_text', text: 'Analista responsavel' } },
  );

  return {
    type: 'modal',
    callback_id: 'submit_ticket',
    private_metadata: categoria,
    title: { type: 'plain_text', text: 'Novo ticket — 2/2' },
    submit: { type: 'plain_text', text: 'Enviar ticket' },
    close: { type: 'plain_text', text: 'Cancelar' },
    blocks,
  };
}

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
        { type: 'section', text: { type: 'mrkdwn', text: '*Selecione a categoria do problema:*' } },
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: '🌐 *Acesso / Conectividade*\n• timeout  • disconnect  • não conecta  • erro ao logar  • não cria conexão' } },
        { type: 'section', text: { type: 'mrkdwn', text: '📉 *Rota / Performance*\n• ping alto  • packet loss  • instabilidade  • lag  • jitter  • rota ruim' } },
        { type: 'section', text: { type: 'mrkdwn', text: '🚫 *Bloqueio / Autenticação*\n• launcher bloqueado  • anti-cheat  • login falhando  • jogo não abre' } },
        { type: 'section', text: { type: 'mrkdwn', text: '🗂️ *Outros*\n• qualquer problema que não se encaixe nas outras categorias' } },
        { type: 'divider' },
        { type: 'input', block_id: 'categoria', element: { type: 'static_select', action_id: 'value', placeholder: { type: 'plain_text', text: 'Selecionar categoria...' }, options: [{ text: { type: 'plain_text', text: 'Acesso / Conectividade' }, value: 'Acesso / Conectividade' }, { text: { type: 'plain_text', text: 'Rota / Performance' }, value: 'Rota / Performance' }, { text: { type: 'plain_text', text: 'Bloqueio / Autenticacao' }, value: 'Bloqueio / Autenticacao' }, { text: { type: 'plain_text', text: 'Outros' }, value: 'Outros' }] }, label: { type: 'plain_text', text: 'Categoria' } },
      ]
    }
  });
});

app.view('step1_categoria', async ({ ack, body, view, client }) => {
  const categoria = view.state.values.categoria.value.selected_option.value;
  await ack({ response_action: 'update', view: buildModal2(categoria) });
});

app.view('submit_ticket', async ({ ack, body, view, client }) => {
  await ack();
  const v = view.state.values;
  const categoria = view.private_metadata;

  const testesArr = (v.testes && v.testes.value && v.testes.value.selected_options) ? v.testes.value.selected_options : [];
  const testes = testesArr.map(o => o.value).join(', ') || 'Nenhum';
  const tagsArr = (v.tags.value && v.tags.value.selected_options) ? v.tags.value.selected_options : [];
  const tags = tagsArr.map(o => o.value);
  const solicitacao = (v.solicitacao && v.solicitacao.value && v.solicitacao.value.selected_date) ? v.solicitacao.value.selected_date : getTodayBRT();

  // Campos que agora podem vir vazios quando a categoria for "Outros" -
  // extraidos com guarda para nao quebrar quando o input ficou em branco.
  const jogo = (v.jogo.value && v.jogo.value.value) || '';
  const clientOS = (v.client.value && v.client.value.selected_option && v.client.value.selected_option.value) || '';
  const email = (v.email.value && v.email.value.value) || '';
  const url = (v.url.value && v.url.value.value) || '';
  const id_ticket = (v.id_ticket.value && v.id_ticket.value.value) || '';
  const discord_ticket = (v.discord_ticket.value && v.discord_ticket.value.value) || '';
  const regiao = (v.regiao.value && v.regiao.value.value) || '';
  const isp = (v.isp.value && v.isp.value.value) || '';
  const servidor = (v.servidor.value && v.servidor.value.selected_option && v.servidor.value.selected_option.value) || '';
  const gb = (v.gb.value && v.gb.value.value) || '';
  const request = (v.request.value && v.request.value.value) || '';
  const analista = v.analista.value.selected_option.value;
  const tsId = 'TS-' + Date.now().toString().slice(-4);

  // Propriedades sempre presentes (aceitam string vazia sem problema no Notion)
  const properties = {
    'ID': { title: [{ text: { content: tsId } }] },
    'Status': { select: { name: 'Open' } },
    'Categoria': { select: { name: categoria } },
    'Testes Realizados': { rich_text: [{ text: { content: testes } }] },
    'Solicitação': { date: { start: solicitacao } },
    'Aplicacao': { rich_text: [{ text: { content: jogo } }] },
    'Ticket Number': { rich_text: [{ text: { content: id_ticket } }] },
    'Discord Ticket': { rich_text: [{ text: { content: discord_ticket } }] },
    'Regiao': { rich_text: [{ text: { content: regiao } }] },
    'ISP': { rich_text: [{ text: { content: isp } }] },
    'Tags': { multi_select: tags.map(t => ({ name: t })) },
    'Request': { rich_text: [{ text: { content: request } }] },
    'Assigned By': { rich_text: [{ text: { content: analista } }] },
    'Criação': { date: { start: new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T') } },
  };

  // Propriedades com formato estrito (select/email/url) só são enviadas
  // se tiverem valor - campo vazio nelas pode ser rejeitado pela API do Notion.
  if (clientOS) properties['Client'] = { select: { name: clientOS } };
  if (email) properties['Email'] = { email: email };
  if (servidor) properties['Tipo do Servidor'] = { select: { name: servidor } };
  if (url) properties['URL'] = { url: url };
  if (gb) properties['GB Analytics'] = { url: gb };

  const notionPage = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });

  const msg = await client.chat.postMessage({
    channel: 'games-suporte',
    text: '@gamessupport um novo ticket foi criado!',
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: '*@gamessupport* um novo ticket foi criado! :thumbsup:' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*This document has been added to the Notion database*' } },
      { type: 'section', text: { type: 'mrkdwn', text: '📁 *Document Page* - ' + tsId + '\n• *Assigned by:* ' + analista + '\n• *Aplicacao:* ' + (jogo || 'não informado') + '\n• *Client:* ' + (clientOS || 'não informado') + '\n• *Email:* ' + (email || 'não informado') + '\n• *Ticket Number:* ' + (id_ticket || 'empty') + '\n• *Discord Ticket:* ' + (discord_ticket || 'empty') + '\n• *Categoria:* ' + categoria + '\n• *ISP:* ' + (isp || 'empty') + '\n• *Regiao:* ' + (regiao || 'não informado') + '\n• *Tipo Servidor:* ' + (servidor || 'não informado') + '\n• *Testes:* ' + testes } },
      { type: 'section', text: { type: 'mrkdwn', text: '📋 *Request:*\n' + (request || '_não informado_') } },
      { type: 'section', text: { type: 'mrkdwn', text: '_Use os comandos na thread:_ `$done` _resolvido_ | `$pending` _aguardando_ | `$inactive` _inativo_ | `$notsolved` _não resolvido_ | `$escalated` _escalado_' } },
    ]
  });

  ticketMap[msg.ts] = notionPage.id;
  agendarAviso(msg.ts, msg.channel);
});

// Handler unificado de mensagens na thread
app.event('message', async ({ event, client }) => {
  try {
    if (event.bot_id) return;
    if (event.subtype === 'bot_message') return;
    if (!event.thread_ts) return;
    if (event.thread_ts === event.ts) return;

    const threadTs = event.thread_ts;
    const notionPageId = ticketMap[threadTs];
    if (!notionPageId) return;

    const comandos = {
      '$done':      { status: 'Done',       emoji: 'white_check_mark' },
      '$pending':   { status: 'Pending',    emoji: 'hourglass_flowing_sand' },
      '$inactive':  { status: 'Inactive',   emoji: 'zzz' },
      '$notsolved': { status: 'Not Solved', emoji: 'x' },
      '$escalated': { status: 'Escalated',  emoji: 'rocket' }
    };
    const textoMsg = event.text && event.text.trim().toLowerCase();
    const match = comandos[textoMsg];
    const statusFinal = match && match.status;
    const emojiCmd = match && match.emoji;
    const isCommand = !!statusFinal;
    const isFinalCommand = textoMsg === '$done';

    if (isCommand) {
      // Atualiza Notion com o novo status
      await notion.pages.update({
        page_id: notionPageId,
        properties: {
          'Status': { select: { name: statusFinal } },
          'Finalização': { date: { start: new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T') } }
        }
      });

      // Remove reacoes anteriores de comandos da mensagem principal
      const todosEmojis = ['white_check_mark', 'hourglass_flowing_sand', 'zzz', 'x', 'rocket'];
      for (const e of todosEmojis) {
        try { await client.reactions.remove({ channel: event.channel, name: e, timestamp: threadTs }); } catch (_) {}
      }

      // Adiciona nova reacao com emoji especifico do comando
      await client.reactions.add({ channel: event.channel, name: emojiCmd, timestamp: event.ts });
      await client.reactions.add({ channel: event.channel, name: emojiCmd, timestamp: threadTs });

      // Só encerra o ticket completamente no $done
      if (isFinalCommand) {
        if (timerMap[threadTs]) {
          clearTimeout(timerMap[threadTs]);
          delete timerMap[threadTs];
        }
        delete ticketMap[threadTs];
      }

      return;
    }

    // Reseta timer de inatividade
    agendarAviso(threadTs, event.channel);

    // Busca nome do usuario
    let userName = event.user || 'Desconhecido';
    try {
      const userInfo = await client.users.info({ user: event.user });
      userName = userInfo.user.real_name || userInfo.user.name || event.user;
    } catch (e) {}

    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Atualiza status para In Progress
    try {
      await notion.pages.update({
        page_id: notionPageId,
        properties: { 'Status': { select: { name: 'In Progress' } } }
      });
    } catch (e) {}

    // Sincroniza mensagem de texto
    if (event.text && event.text.trim()) {
      await notion.comments.create({
        parent: { page_id: notionPageId },
        rich_text: [{ type: 'text', text: { content: '💬 ' + userName + ' — ' + now + '\n' + event.text } }]
      });
    }

    // Sincroniza arquivos
    if (event.files && event.files.length > 0) {
      for (const file of event.files) {
        const tipo = file.mimetype || '';
        let emoji = '📎';
        if (tipo.startsWith('image/')) emoji = '🖼️';
        else if (tipo.startsWith('video/')) emoji = '🎥';
        else if (tipo.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.log')) emoji = '📄';

        await notion.comments.create({
          parent: { page_id: notionPageId },
          rich_text: [
            { type: 'text', text: { content: emoji + ' ' + userName + ' — ' + now + '\n' } },
            { type: 'text', text: { content: file.name + ' | Type: ' + (file.mimetype || 'desconhecido'), link: { url: file.permalink } } }
          ]
        });
      }
    }
  } catch (err) {
    console.error('Erro ao processar mensagem:', err.message);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('GamesBot rodando!');
})();
