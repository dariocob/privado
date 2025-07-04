require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  Partials
} = require('discord.js');
const xlsx = require('xlsx');
const fs = require('fs');

// Cargar preguntas desde Excel
const workbook = xlsx.readFile('preguntas.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const preguntas = xlsx.utils.sheet_to_json(sheet);

// Crear cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// Guardar preguntas enviadas por usuario
const preguntasEnviadas = new Map();

// Bot listo
client.once(Events.ClientReady, () => {
  console.log(`Bot iniciado como ${client.user.tag}`);
});

// Comando !examen
client.on(Events.MessageCreate, async message => {
  if (message.content === '!examen') {
    const embed = new EmbedBuilder()
      .setTitle('Field Training Officers')
      .setDescription('Bienvenido al menú interactivo del STO. A continuación, por favor indique qué es lo que busca realizar.')
      .setImage('attachment://examen.jpg')
      .setColor(0x3498db)
      .setFooter({ text: 'Developed by M. Vega y JJ Cámpora' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('generar_examen')
        .setLabel('Generar nuevo examen cadetes')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('preguntas_extra')
        .setLabel('+5 preguntas extra')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({
      embeds: [embed],
      components: [row],
      files: ['./examen.jpg']
    });
  }
});

// Interacción con los botones
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const usuario = interaction.user;
  const userId = usuario.id;

  if (!preguntasEnviadas.has(userId)) {
    preguntasEnviadas.set(userId, new Set());
  }

  const seleccionarPreguntas = (cantidad) => {
    const yaEnviadas = preguntasEnviadas.get(userId);
    const disponibles = preguntas
      .map((p, i) => ({ ...p, __id: i }))
      .filter(p => !yaEnviadas.has(p.__id));

    const seleccionadas = disponibles
      .sort(() => 0.5 - Math.random())
      .slice(0, cantidad);

    seleccionadas.forEach(p => yaEnviadas.add(p.__id));
    return seleccionadas;
  };

  const formatear = (lista) => lista.map((row, i) => {
    let msg = `**${row.__num || ''}${row.Pregunta}**`;
    if (row['Opción A']) msg += `\nA) ${row['Opción A']}`;
    if (row['Opción B']) msg += `\nB) ${row['Opción B']}`;
    if (row['Opción C']) msg += `\nC) ${row['Opción C']}`;
    if (row['Opción D']) msg += `\nD) ${row['Opción D']}`;
    return msg;
  });

  if (interaction.customId === 'generar_examen') {
    const preguntasSeleccionadas = seleccionarPreguntas(18);
    preguntasSeleccionadas.forEach((p, i) => p.__num = `${i + 1}. `);

    try {
      await interaction.deferReply({ ephemeral: true });

      const contenido = formatear(preguntasSeleccionadas).join('\n\n');

      await interaction.editReply({
        ephemeral: true,
        content: '⚠️ Recordá indicarle que no utilice ningún tipo de bodycam.\n\n**Preguntas del examen:**\n\n' + contenido
      });
    } catch (err) {
      await interaction.editReply({
        ephemeral: true,
        content: 'Ocurrió un error al mostrar las preguntas.'
      });
    }
  }

  if (interaction.customId === 'preguntas_extra') {
    const extras = seleccionarPreguntas(5);
    extras.forEach((p, i) => p.__num = `Extra ${i + 1}. `);

    try {
      await interaction.deferReply({ ephemeral: true });

      if (extras.length === 0) {
        return await interaction.editReply({ 
          ephemeral: true,
          content: 'Ya no quedan preguntas disponibles para enviarte 😅' 
        });
      }

      const contenido = formatear(extras).join('\n\n');

      await interaction.editReply({
        ephemeral: true,
        content: '**⚠️ Recordá indicarle que no utilice ningún tipo de bodycam.**\n\n' + contenido
      });

    } catch (err) {
      await interaction.editReply({
        ephemeral: true,
        content: 'Ocurrió un error al mostrar las preguntas.'
      });
    }
  }
});

// Login del bot
client.login(process.env.TOKEN);
