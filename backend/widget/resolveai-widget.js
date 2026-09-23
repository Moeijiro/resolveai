/*!
 * ResolveAI support widget — https://github.com/Moeijiro/resolveai
 *
 * Embed:
 *   <script src="https://YOUR-API/widget.js" data-project="kb_xxxx" async></script>
 *
 * Design notes:
 *  - No dependencies, one file, ~9 KB unminified.
 *  - Renders inside a Shadow DOM, so the host page's CSS cannot break it and
 *    its CSS cannot leak into the host page.
 *  - Every piece of text from the server is inserted with textContent, never
 *    innerHTML: an answer is data, and a knowledge base is not trusted to be
 *    free of markup.
 *  - The public project id is the only identifier. It can ask questions and
 *    nothing else; no API key is ever in the page.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script || window.__resolveaiLoaded) return;
  window.__resolveaiLoaded = true;

  var project = script.getAttribute("data-project");
  var api = (script.getAttribute("data-api") || new URL(script.src).origin).replace(/\/$/, "");
  if (!project) {
    console.warn("[ResolveAI] Missing data-project attribute.");
    return;
  }

  var state = { open: false, busy: false, config: null };

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function css(accent, position) {
    var side = position === "bottom-left" ? "left" : "right";
    return (
      ":host{all:initial}" +
      "*{box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}" +
      ".bubble{position:fixed;" + side + ":20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;" +
      "background:" + accent + ";color:#07121a;cursor:pointer;box-shadow:0 10px 30px -8px rgba(0,0,0,.55);" +
      "display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .2s ease}" +
      ".bubble:hover{transform:scale(1.06)}.bubble:focus-visible{outline:3px solid #fff;outline-offset:3px}" +
      ".panel{position:fixed;" + side + ":20px;bottom:88px;width:370px;height:560px;max-height:calc(100vh - 110px);" +
      "background:#0b0d12;color:#e8ebf1;border:1px solid #1f2430;border-radius:16px;display:flex;flex-direction:column;" +
      "overflow:hidden;z-index:2147483647;box-shadow:0 30px 80px -20px rgba(0,0,0,.7);" +
      "opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}" +
      ".panel.open{opacity:1;transform:none;pointer-events:auto}" +
      ".head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #1f2430;" +
      "background:linear-gradient(180deg," + accent + "22,transparent)}" +
      ".dot{width:8px;height:8px;border-radius:50%;background:" + accent + ";box-shadow:0 0 0 4px " + accent + "33}" +
      ".title{font-size:14px;font-weight:600;flex:1;margin:0}" +
      ".sub{font-size:11px;color:#8a92a6;margin:2px 0 0}" +
      ".close{background:none;border:0;color:#8a92a6;cursor:pointer;font-size:20px;line-height:1;padding:4px 6px;border-radius:6px}" +
      ".close:hover{color:#fff;background:#161a23}" +
      ".log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}" +
      ".msg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}" +
      ".bot{background:#151922;border:1px solid #1f2430;align-self:flex-start;border-bottom-left-radius:4px}" +
      ".me{background:" + accent + ";color:#07121a;align-self:flex-end;border-bottom-right-radius:4px}" +
      ".sources{margin-top:8px;padding-top:8px;border-top:1px solid #232937;font-size:11.5px;color:#8a92a6}" +
      ".sources span{display:inline-block;margin:4px 6px 0 0;padding:2px 8px;border-radius:999px;border:1px solid #2a3141;color:#c9cfdb}" +
      ".note{font-size:11px;color:#e2a54a;margin-top:6px}" +
      ".typing{display:flex;gap:4px;padding:12px 14px}.typing i{width:6px;height:6px;border-radius:50%;background:#8a92a6;" +
      "animation:b 1.2s infinite ease-in-out}.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}" +
      "@keyframes b{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}" +
      ".form{display:flex;gap:8px;padding:12px;border-top:1px solid #1f2430;background:#0b0d12}" +
      ".input{flex:1;background:#11141b;border:1px solid #262c3a;color:#e8ebf1;border-radius:10px;padding:10px 12px;font-size:13.5px;outline:none}" +
      ".input:focus{border-color:" + accent + "}" +
      ".send{background:" + accent + ";color:#07121a;border:0;border-radius:10px;padding:0 14px;font-weight:600;font-size:13px;cursor:pointer}" +
      ".send:disabled{opacity:.5;cursor:not-allowed}" +
      ".foot{text-align:center;font-size:10.5px;color:#5d6578;padding:0 0 10px}" +
      "@media (max-width:480px){.panel{" + side + ":0;bottom:0;width:100vw;height:100dvh;max-height:none;border-radius:0}" +
      ".bubble{" + side + ":16px;bottom:16px}}" +
      "@media (prefers-reduced-motion:reduce){.panel,.bubble{transition:none}.typing i{animation:none}}"
    );
  }

  function icon(open) {
    return open
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
  }

  function mount(config) {
    var host = el("div", { id: "resolveai-widget" });
    document.body.appendChild(host);
    var root = host.attachShadow({ mode: "open" });

    var style = el("style");
    style.textContent = css(config.accent_color, config.position);
    root.appendChild(style);

    var bubble = el("button", { class: "bubble", "aria-label": "Open support chat", "aria-expanded": "false" });
    bubble.innerHTML = icon(false); // static SVG markup, not server data

    var panel = el("section", { class: "panel", role: "dialog", "aria-label": config.title, "aria-hidden": "true" });
    var head = el("header", { class: "head" });
    var titles = el("div", { style: "flex:1;min-width:0" });
    titles.appendChild(el("p", { class: "title" }, config.title));
    titles.appendChild(el("p", { class: "sub" }, "Answers from our documentation"));
    var close = el("button", { class: "close", "aria-label": "Close chat" }, "×");
    head.appendChild(el("span", { class: "dot", "aria-hidden": "true" }));
    head.appendChild(titles);
    head.appendChild(close);

    var log = el("div", { class: "log", role: "log", "aria-live": "polite" });
    var form = el("form", { class: "form" });
    var input = el("input", {
      class: "input",
      type: "text",
      maxlength: "500",
      placeholder: "Ask a question…",
      "aria-label": "Your question",
      autocomplete: "off",
    });
    var send = el("button", { class: "send", type: "submit" }, "Send");
    form.appendChild(input);
    form.appendChild(send);

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(form);
    panel.appendChild(el("div", { class: "foot" }, "Powered by ResolveAI · AI answers can be wrong"));

    root.appendChild(panel);
    root.appendChild(bubble);

    addMessage(log, "bot", config.welcome_message);

    function toggle(open) {
      state.open = open;
      panel.classList.toggle("open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      bubble.setAttribute("aria-expanded", open ? "true" : "false");
      bubble.setAttribute("aria-label", open ? "Close support chat" : "Open support chat");
      bubble.innerHTML = icon(open);
      if (open) setTimeout(function () { input.focus(); }, 60);
      else bubble.focus();
    }

    bubble.addEventListener("click", function () { toggle(!state.open); });
    close.addEventListener("click", function () { toggle(false); });
    root.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.open) toggle(false);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var question = input.value.trim();
      if (question.length < 2 || state.busy) return;
      input.value = "";
      ask(log, question, send);
    });
  }

  function addMessage(log, who, text, sources, unresolved) {
    var bubble = el("div", { class: "msg " + (who === "me" ? "me" : "bot") });
    bubble.textContent = text; // never innerHTML: answers are data
    if (sources && sources.length) {
      var box = el("div", { class: "sources" }, "Sources");
      box.appendChild(el("br"));
      sources.forEach(function (source) {
        box.appendChild(el("span", null, source.title));
      });
      bubble.appendChild(box);
    }
    if (unresolved) {
      bubble.appendChild(el("div", { class: "note" }, "Not in the documentation yet — our team has been notified."));
    }
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function ask(log, question, send) {
    state.busy = true;
    send.disabled = true;
    addMessage(log, "me", question);

    var typing = el("div", { class: "msg bot typing", "aria-label": "Assistant is typing" });
    typing.appendChild(el("i"));
    typing.appendChild(el("i"));
    typing.appendChild(el("i"));
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    // text/plain keeps this a CORS "simple request": no preflight per question.
    fetch(api + "/widget/chat", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ project: project, question: question }),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok, body: body };
        });
      })
      .then(function (result) {
        typing.remove();
        if (!result.ok) {
          var message = (result.body && result.body.error && result.body.error.message) || "Something went wrong.";
          addMessage(log, "bot", message);
          return;
        }
        addMessage(log, "bot", result.body.answer, result.body.sources, result.body.status === "unresolved");
      })
      .catch(function () {
        typing.remove();
        addMessage(log, "bot", "I can't reach the support service right now. Please try again shortly.");
      })
      .finally(function () {
        state.busy = false;
        send.disabled = false;
      });
  }

  fetch(api + "/widget/config/" + encodeURIComponent(project))
    .then(function (response) {
      if (!response.ok) throw new Error("widget unavailable (" + response.status + ")");
      return response.json();
    })
    .then(function (config) {
      state.config = config;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { mount(config); });
      } else {
        mount(config);
      }
    })
    .catch(function (error) {
      console.warn("[ResolveAI] " + error.message);
    });
})();
