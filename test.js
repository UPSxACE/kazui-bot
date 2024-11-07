this.telegraf.action("11", (ctx) => {
  ctx.answerCbQuery();
  ctx.telegram.sendMessage(ctx.from.id, "Muestran algun error las pantallas?", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Si", callback_data: "111" },
          { text: "No", callback_data: "112" },
        ],
      ],
    },
  });
});
