import { escapers } from "@telegraf/entity";
import "dotenv/config";
import shortUUID from "short-uuid";
import { Markup, Telegraf } from "telegraf";
import { z } from "zod";
import database, { getInviteLink } from "./database.js";

function getRandomInt(min: number, max: number) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

const BOT_USERNAME = process.env.BOT_USERNAME;
const BOT_USERNAME_ESCAPED = process.env.BOT_USERNAME_ESCAPED;
const INVITE_LINK = "t.me/+VQsPcp4dYGE0YjQ0";
const INVITE_LINK_ESCAPED = "t\\.me/+VQsPcp4dYGE0YjQ0";
const GROUP_CHAT_ID = Number(process.env.CHAT_ID);
const bot = new Telegraf(process.env.TOKEN ?? "");
const translator = shortUUID();

const escape = escapers.MarkdownV2;

bot.command("chatid", async (ctx) => {
  ctx.reply("Chat id: " + ctx.chat.id);
});

// Handle the /start command.
bot.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return;
  }

  const { success, data } = z.string().safeParse(ctx.args[0]);
  if (success) {
    const validShortUuid = translator.validate(data, true);
    if (validShortUuid) {
      console.log("valid");
      const { id, username } = ctx.message.from;
      const longUuid = translator.toUUID(data);
      const result = await database.join(longUuid, id, username ?? "Anonymous");
      const message = `Welcome to the $KAZUI gang 😎

Join our community to participate in periodic giveaways and events, and stay up to date with the latest project updates.`;
      const buttons = Markup.inlineKeyboard([
        Markup.button.url("Join community", INVITE_LINK),
      ]);
      if (result) {
        return ctx.reply(message, buttons);
      }
      return ctx.reply(message, buttons);
    }
  }

  const inCommunity = await bot.telegram
    .getChatMember(GROUP_CHAT_ID, ctx.message.from.id)
    .then(() => true)
    .catch((err) => {
      console.log(err);
      return false;
    });

  console.log(
    (ctx?.message?.from?.username ?? "Anonymous") +
      ` ${inCommunity ? "is" : "is not"} in the kazui group.`
  );

  const messageIn = `Greetings punisher 😼`;
  const messageOut = `Join our community to participate in periodic giveaways and events, and stay up to date with the latest project updates. 😼`;

  const message = inCommunity ? messageIn : messageOut;
  const extra = inCommunity
    ? Markup.inlineKeyboard([
        [
          Markup.button.callback("Create invite", "createinvite"),
          Markup.button.callback("Leaderboard", "leaderboard"),
        ],
        [Markup.button.url("Go to group", INVITE_LINK)],
      ])
    : Markup.inlineKeyboard([Markup.button.url("Join community", INVITE_LINK)]);
  // Normal start command
  ctx.reply(message, extra);
});

bot.command("createinvite", async (ctx) => {
  const { id, username } = ctx.message.from;
  const shortUUID = await getInviteLink(id, username ?? "Anonymous").catch(
    (err) => console.log(err)
  );
  const message = `🎁 *Earn referrals* 🎁
  
Share this link to *earn referrals* and participate in the periodic *giveaways*:

t\\.me/${BOT_USERNAME_ESCAPED}?start\\=${shortUUID}

For *each person* you invite using this link, *you* and the *invited person* get *1 entry point\\!*`;
  ctx.replyWithMarkdownV2(message);
});

bot.action("createinvite", async (ctx) => {
  const { id, username } = ctx.from;
  const shortUUID = await getInviteLink(id, username ?? "Anonymous").catch(
    (err) => console.log(err)
  );
  const message = `🎁 *Earn referrals* 🎁
  
Share this link to *earn referrals* and participate in the periodic *giveaways*:
  
t\\.me/${BOT_USERNAME_ESCAPED}?start\\=${shortUUID}
  
For *each person* you invite using this link, *you* and the *invited person* get *1 entry point\\!*`;
  ctx.replyWithMarkdownV2(message);
});

bot.command("leaderboard", async (ctx) => {
  async function referralsTop10() {
    const top10 = await database.getLeaderboardLeaders();

    return top10.reduce((acc, curr, index) => {
      if (index === 0) {
        return (
          acc + `  🏆 1\\. *${escape(curr.username)}*    ${curr.points} points`
        );
      }
      return (
        acc +
        `\n  🥇 ${index + 1}\\. *${escape(curr.username)}*    ${
          curr.points
        } points`
      );
    }, "");
  }
  const date = await database.getNextGiveawayDate();
  const message = `🎉 *Global ranking \\(referrals\\)*

${await referralsTop10()}

*Next giveaway:* ${escape(date ?? "To be announced soon...")}
`;
  const extra = Markup.inlineKeyboard([
    [
      Markup.button.url(
        "Create invite",
        "t.me/KazuiCoinBot?start=createinvite"
      ),
    ],
  ]);

  ctx.replyWithMarkdownV2(message, extra);
});

bot.action("leaderboard", async (ctx) => {
  async function referralsTop10() {
    const top10 = await database.getLeaderboardLeaders();

    return top10.reduce((acc, curr, index) => {
      if (index === 0) {
        return (
          acc + `  🏆 1\\. *${escape(curr.username)}*    ${curr.points} points`
        );
      }
      return (
        acc +
        `\n  🥇 ${index + 1}\\. *${escape(curr.username)}*    ${
          curr.points
        } points`
      );
    }, "");
  }
  const date = await database.getNextGiveawayDate();
  const message = `🎉 *Global ranking \\(referrals\\)*

${await referralsTop10()}

*Next giveaway:* ${escape(date ?? "To be announced soon...")}
`;

  ctx.replyWithMarkdownV2(message);
});

bot.command("referralsgiveaway", async (ctx) => {
  const [id, reward] = ctx.args;
  if (ctx.args.length !== 2) {
    return;
  }
  const callerid = ctx.message.from.id;
  const caller = await ctx.getChatMember(callerid).catch(() => null);
  if (caller?.status === "administrator" || caller?.status === "creator") {
    setTimeout(() => {
      ctx.replyWithMarkdownV2(
        `${escape(`This is a giveaway based on referrals. In this giveaway each referral point you got will qualify you with 1 entry.
If you invited 5 people, it means you have 5 entries. Consult your points using the command /leaderboard.

The winner gets the prize, but his points go back to zero. All the others keep their points so they have a higher chance in the next giveaway.`)}`
      );
    }, 5000);
    setTimeout(() => {
      ctx.reply("Are you ready?");
    }, 6000);
    setTimeout(() => {
      ctx.reply("The winner is...");
    }, 10000);
    const winner = (async () => {
      const allUsers = await database.getAllUsers();
      let entries = allUsers.reduce(
        (acc, curr) => {
          for (let i = 0; i < curr.points; i++) {
            acc.push(curr);
          }
          return acc;
        },
        [] as {
          userid: number;
          username: string;
          points: number;
        }[]
      );

      const winner = getRandomInt(0, entries.length);
      return entries[winner];
    })();
    console.log("Winner is: ", await winner);
    setTimeout(async () => {
      ctx.replyWithMarkdownV2(`🎉 With a total of *${
        (await winner).points
      }* invites, *@${(await winner).username}*  🎉

\\(id\\: ${(await winner).userid}\\)`);
    }, 15000);
    setTimeout(() => {
      ctx.replyWithMarkdownV2(
        `${escape(`We will contact you soon. 

For those who didn't win, don't worry! The giveaways won't stop, and you might be the upcoming winner. Keep inviting people to raise your chances!

The next date will be revealed in no time.`)}`
      );
    }, 17000);
    return ctx.replyWithMarkdownV2(`🎁 *Giveaway* 🎁
        
Giving away: *${escape(reward)}*`);
  }
});

// Launch
bot.launch(
  { allowedUpdates: ["message", "chat_member", "callback_query"] },
  () => {
    bot.telegram.setMyCommands([
      {
        command: "createinvite",
        description: "Create an invite to earn referral points",
      },
      {
        command: "leaderboard",
        description: "Show the top 10 leaders of the referrals ranking",
      },
    ]);
    bot.telegram.setMyCommands(
      [
        { command: "start", description: "Start the bot" },
        {
          command: "createinvite",
          description: "Create an invite to earn referral points",
        },
        {
          command: "leaderboard",
          description: "Show the top 10 leaders of the referrals ranking",
        },
      ],
      {
        scope: { type: "all_private_chats" },
      }
    );

    console.log("running!");
  }
);

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
