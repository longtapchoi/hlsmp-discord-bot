import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

const API_BASE = "https://hlsmp-topup.onrender.com";

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
  console.error("Thiếu biến môi trường Discord.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("nap")
    .setDescription("Tạo link nạp payOS")
    .addStringOption(option =>
      option.setName("player")
        .setDescription("Tên player Minecraft")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("Số tiền nạp")
        .setRequired(true)
        .addChoices(
          { name: "10k", value: 10000 },
          { name: "20k", value: 20000 },
          { name: "50k", value: 50000 },
          { name: "100k", value: 100000 },
          { name: "200k", value: 200000 },
          { name: "500k", value: 500000 }
        )
    )
].map(cmd => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
    { body: commands }
  );
  console.log("Đã đăng ký slash command.");
}

client.once("ready", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "nap") return;

  const player = interaction.options.getString("player", true);
  const amount = interaction.options.getInteger("amount", true);

  await interaction.reply({
    content: "Đang tạo link nạp...",
    ephemeral: true
  });

  try {
    const response = await fetch(`${API_BASE}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ player, amount })
    });

    const data = await response.json();

    if (!response.ok || !data.payUrl) {
      await interaction.editReply(`Tạo link thất bại: ${JSON.stringify(data)}`);
      return;
    }

    await interaction.editReply(
      `Nạp cho **${player}**\n` +
      `Số tiền: **${amount.toLocaleString("vi-VN")}đ**\n` +
      `Mã đơn: **${data.orderId}**\n` +
      `Link thanh toán:\n${data.payUrl}`
    );
  } catch (err) {
    await interaction.editReply(`Lỗi: ${err.message}`);
  }
});

await registerCommands();
client.login(DISCORD_TOKEN);
