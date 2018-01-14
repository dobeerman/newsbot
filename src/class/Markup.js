const Html5Entities = require("html-entities").Html5Entities;

class Markup {
  messages(elements, options) {
    this.messages = getRows(elements).map(element =>
      buildMessage(element, options)
    );

    return this;
  }

  options(options) {
    this.messages = this.messages.map(el => {
      const form = Object.assign(el.form, options);
      return Object.assign({}, { form });
    });

    return this;
  }

  static messages(elements, options) {
    return new Markup().messages(elements, options);
  }

  static options(options) {
    return Markup.options(options);
  }
}

function buildMessage(element, options) {
  let { chat_id, markup, addlink, handler } = options;
  let message = {};

  let msg = [
    getTitle(element),
    getDescription(element, options),
    getCategory(element, handler)
  ];

  if (addlink) msg.push(getLink(element));

  let text = msg.join("\n\n");

  Object.assign(
    message,
    { form: { chat_id, text } },
    { pubDate: element.pubDate }
  );

  if (markup && markup.message_options)
    Object.assign(message.form, markup.message_options);

  return message;
}

function getTitle(element) {
  return element.title;
}

function getDescription(element, options) {
  let { description } = element;
  let { handler, markup } = options;

  if (!description) return "";

  // Sorry. Hardcode.
  if (handler === "zrpress")
    element[markup.description] = element[markup.description].replace(
      "amp;",
      ""
    );

  // MESSAGE_TOO_LONG: Message was too long. Current maximum length is 4096 UTF8 characters
  // Reference: https://core.telegram.org/method/messages.sendMessage
  const bytes = 3 * Buffer.byteLength(element[markup.description]);

  // Unescape HTML entities
  const entities = new Html5Entities();

  description =
    bytes < 4096
      ? entities.decode(element[markup.description]).replace(/\t/g, "\n")
      : description;

  // Some sources has description as an object with lodash property
  if (description._) description = description._;

  // Remove all html tags from the description
  description = description
    .replace(/(<br\s*\/>)|(<\/p>\s*|\n*<p>)/gm, "\n") // Paragraph
    .replace(/<(?:.|\n)*?>/gm, "")
    .trim();

  // Cut off the unnecessary end of the string
  if (markup && markup.cut_text) {
    var idx = description.indexOf(markup.cut_text);
    description = idx > -1 ? description.slice(0, idx) : description;
  }

  return description;
}

function getCategory(element, handler) {
  var { category } = element;

  if (!category) category = "";

  if (category.indexOf("/") > -1)
    category = category.split("/").filter(el => el.trim());

  if (!Array.isArray(category)) category = [category];

  category.unshift(handler);

  category = "#" + category.map(el => removeNonAlphaBetical(el)).join(" #");

  return category;
}

function getLink(element) {
  return element.link;
}

// Remove all spaces and non-alphabetical or digit symbols
function removeNonAlphaBetical(string) {
  return string.toLowerCase().replace(/[^a-zёа-я0-9]/gm, "");
}

function getRows(elements) {
  return Array.isArray(elements) ? elements : [elements];
}

module.exports = Markup;
