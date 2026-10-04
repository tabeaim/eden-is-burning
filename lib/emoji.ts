// Emoji-Auswahl des Messengers – bewusst eine handliche Auswahl statt des ganzen
// Unicode-Katalogs (auf dem Handy bringt die Tastatur den Rest mit).
export const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

export const EMOJI_GROUPS: { key: string; icon: string; label: string; emojis: string[] }[] = [
  {
    key: "smileys",
    icon: "😀",
    label: "Smileys",
    emojis: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 👻 🤡 💩 🙈 🙉 🙊".split(" "),
  },
  {
    key: "gestures",
    icon: "👍",
    label: "Gesten",
    emojis: "👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 🙏 ✍️ 💅 🤳 💪 👏 🙌 👐 🤲 🫶 🖕 👀 👁️ 👅 👄 🧠 🫀 🙋 🤷 🤦 🙅 🙆 💁 🧍 🏃 💃 🕺".split(" "),
  },
  {
    key: "hearts",
    icon: "❤️",
    label: "Herzen",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💋 💌 💐 🌹 🥀 ✨ ⭐ 🌟 💫 🔥 💥 💯 💢 💦 💨 💤 🎉 🎊 🎈 🎁".split(" "),
  },
  {
    key: "food",
    icon: "🍕",
    label: "Essen & Trinken",
    emojis: "☕ 🍵 🥤 🧋 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾 🍕 🍔 🍟 🌭 🌮 🌯 🥗 🍝 🍜 🍣 🍱 🥐 🥞 🧇 🥓 🍳 🧀 🍞 🍎 🍓 🍒 🍑 🍋 🍉 🥑 🌶️ 🍫 🍿 🍩 🍪 🎂 🍰 🍦 🍭".split(" "),
  },
  {
    key: "life",
    icon: "🌙",
    label: "Alltag & Orte",
    emojis: "🌙 ☀️ ⛅ 🌧️ ⛈️ ❄️ 🌈 🌊 🌲 🌻 🍂 🐶 🐱 🐭 🦊 🐻 🐼 🐸 🐍 🦋 🐝 🕷️ 🚗 🚕 🚌 🏍️ 🚲 ✈️ 🚀 🏠 🏥 🏫 ⛪ 🌃 🎵 🎶 🎧 🎸 🎬 🎮 🎲 📱 💻 📷 📚 ✏️ 💼 💰 💸 🔑 🔒 🔪 🔫 💣 💊 🚬 ⚰️ ⏰ 📍".split(" "),
  },
  {
    key: "symbols",
    icon: "✅",
    label: "Symbole",
    emojis: "✅ ❌ ❓ ❗ ‼️ ⁉️ ⚠️ 🚫 🆘 🆗 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ ➡️ ⬅️ ⬆️ ⬇️ 🔁 ♻️ ➕ ➖ 💬 💭 🗯️ 🏳️ 🏴 🏁 🚩".split(" "),
  },
];

// Besteht der Text nur aus bis zu drei Emojis? Dann zeigt der Chat sie groß und
// ohne Sprechblase. (RegExp per Konstruktor: \p{…} braucht das u-Flag.)
const ONLY_EMOJI = new RegExp(
  "^(?:[\\p{Extended_Pictographic}\\p{Emoji_Modifier}\\u200d\\ufe0f]|[\\u{1F1E6}-\\u{1F1FF}])+$",
  "u",
);
const PICTO = new RegExp("\\p{Extended_Pictographic}|[\\u{1F1E6}-\\u{1F1FF}]{2}", "gu");
export function isEmojiOnly(text: string): boolean {
  const t = text.replace(/\s+/g, "");
  if (!t || t.length > 40 || !ONLY_EMOJI.test(t)) return false;
  // ZWJ-Folgen (👨‍👩‍👧) zählen grob mehrfach – für „groß anzeigen" genügt das.
  return (t.match(PICTO) ?? []).length <= 3 || t.includes("‍");
}
