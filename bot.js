const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("baileys")
const qrcode = require("qrcode-terminal")
const P = require("pino")
const cron = require("node-cron")

const GUILD_GROUP_ID = "120363423773092117@g.us"

// ADMINS
const ADMINS = [
"916238449727@s.whatsapp.net",
"917994821145@s.whatsapp.net"
]

// leaderboard variable
let leaderboardText = `🏆 GUILD GLORY LEADERBOARD
🥇 ＩＦＣㅤTEDDY — 62158
🥈 ＩＦＣㅤAADUTHOMA — 26089
🥉 ＩＦＣㅤDEVIL GIRL — 23320
4️⃣ ＩＦＣㅤAASHIQ — 15584
5️⃣ ＩＦＣㅤERNESTO APPU — 10604`


// send message and delete after 24 hours
async function sendTemporaryMessage(sock, chatId, text, mentions = []) {

const sentMsg = await sock.sendMessage(chatId, { text, mentions })

setTimeout(async () => {

try {

await sock.sendMessage(chatId, {
delete: {
remoteJid: chatId,
fromMe: true,
id: sentMsg.key.id,
participant: sentMsg.key.participant
}
})

} catch (err) {

console.log("Delete failed:", err)

}

}, 86400000)

}


async function startBot() {

console.log("🚀 Starting Guild Bot...")

const { state, saveCreds } = await useMultiFileAuthState("./auth")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
auth: state,
logger: P({ level: "silent" }),
version,
browser: ["Windows","Chrome","120.0"]
})


// CONNECTION
sock.ev.on("connection.update", (update) => {

const { connection, qr, lastDisconnect } = update

if (qr) {

console.log("📱 Scan QR Code")
qrcode.generate(qr, { small: true })

}

if (connection === "open") {

console.log("✅ Guild Bot Connected")

// Guild war reminder
cron.schedule('0 16 * * 3,6,0', async () => {

await sendTemporaryMessage(sock, GUILD_GROUP_ID,
`⚔️ GUILD WAR REMINDER ⚔️

Guild War is TODAY!

🕖 War Time
7:00 PM – 11:00 PM

⏰ Prepare your teams now!`
)

})

}

if (connection === "close") {

const reason = lastDisconnect?.error?.output?.statusCode

if (reason !== DisconnectReason.loggedOut) {

console.log("Restarting bot...")
startBot()

}

}

})

sock.ev.on("creds.update", saveCreds)


// WELCOME NEW MEMBERS
sock.ev.on("group-participants.update", async (update) => {

if (update.id !== GUILD_GROUP_ID) return

if (update.action === "add") {

const user = update.participants[0]

await sendTemporaryMessage(
sock,
update.id,
`👋 Welcome @${user.split("@")[0]} to the Guild!

⚔️ Please read the rules.
Type:
!rules

Stay active and help the guild!`,
[user]
)

}

})


// MESSAGE HANDLER
sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if (!msg.message) return

const chatId = msg.key.remoteJid
const sender = msg.key.participant || chatId

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if (!text) return

const command = text.split(" ")[0].toLowerCase()
const args = text.split(" ").slice(1)


// =======================
// ADMIN PRIVATE COMMANDS
// =======================

if (!chatId.endsWith("@g.us") && ADMINS.includes(sender)) {

if (command === "!announce") {

let message = args.join(" ")

await sock.sendMessage(GUILD_GROUP_ID, {
text: `📢 GUILD ANNOUNCEMENT\n\n${message}`
})

}

if (command === "!setleaderboard") {

leaderboardText = args.join(" ")

await sock.sendMessage(sender, {
text: "✅ Leaderboard Updated"
})

}

if (command === "!weeklyreport") {

let report = args.join(" ")

await sock.sendMessage(GUILD_GROUP_ID, {
text: `📊 WEEKLY GUILD REPORT\n\n${report}`
})

}

if (command === "!warn") {

let number = args[0]
let reason = args.slice(1).join(" ")

let jid = number + "@s.whatsapp.net"

await sock.sendMessage(GUILD_GROUP_ID, {
text: `⚠️ Warning @${number}\nReason: ${reason}`,
mentions: [jid]
})

}

if (command === "!kick") {

let number = args[0]

await sock.groupParticipantsUpdate(
GUILD_GROUP_ID,
[number + "@s.whatsapp.net"],
"remove"
)

}

return

}


// =======================
// GROUP COMMANDS
// =======================

if (chatId !== GUILD_GROUP_ID) return


// RULES
if (command === "!rules") {

await sendTemporaryMessage(sock, chatId,
`📜 GUILD RULES

1️⃣ Be respectful
2️⃣ Stay active
3️⃣ Help guild members
4️⃣ No spam
5️⃣ Follow leader instructions

⚔️ Fight together, win together!`
)

}


// LEADERBOARD
if (command === "!leaderboard") {

await sendTemporaryMessage(sock, chatId, leaderboardText)

}


// MENU
if (command === "!menu") {

await sendTemporaryMessage(sock, chatId,
`⚔️ MENU

!rules
!leaderboard
!tagall
!menu

⚔️ Guild War Days
Wednesday
Saturday
Sunday

🕖 War Time
7PM – 11PM

Reminder sent at 4PM`
)

}


// TAG ALL
if (command === "!tagall") {

const metadata = await sock.groupMetadata(chatId)

const participants = metadata.participants

let users = participants.map(p => p.id)

let textTag = users.map(u => `@${u.split("@")[0]}`).join("\n")

await sock.sendMessage(chatId, {
text: `📢 TAGGING ALL MEMBERS\n\n${textTag}`,
mentions: users
})

}

})

}

startBot()