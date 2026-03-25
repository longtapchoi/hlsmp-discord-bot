import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";
import express from "express";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN?.trim();
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID?.trim();
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID?.trim();

const API_BASE = "https://hlsmp-topup.onrender.com";

// mở port cho Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Discord bot is running");
});

app.listen(PORT, () => {
  console.log(`Health server running on port ${PORT}`);
});

console.log("ENV check:", {
  hasToken: !!DISCORD_TOKEN,
  clientId: DISCORD_CLIENT_ID || "missing",
  guildId: DISCORD_GUILD_ID || "missing"
});

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
      option
        .setName("player")
        .setDescription("Tên player Minecraft")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
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

client.once("ready", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands }
    );

    console.log("Đã đăng ký slash command.");
  } catch (err) {
    console.error("Lỗi đăng ký slash command:", err);
  }
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
      await interaction.editReply(
        `Tạo link thất bại.\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
      );
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

client.on("error", err => {
  console.error("Discord client error:", err);
});

process.on("unhandledRejection", reason => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", err => {
  console.error("Uncaught Exception:", err);
});

console.log("Bắt đầu login Discord...");
client.login(DISCORD_TOKEN).catch(err => {
  console.error("Login Discord thất bại:", err);
});
