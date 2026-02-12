# Apps SDK Examples Gallery

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

This repository showcases example UI components to be used with the [Apps SDK](https://developers.openai.com/apps-sdk), as well as example MCP servers that expose a collection of components as tools.
It is meant to be used as a starting point and source of inspiration to build your own apps for ChatGPT.

Note: If you are on Chrome and have recently updated to version 142, you will need to disable the [`local-network-access` flag](https://developer.chrome.com/release-notes/142#local_network_access_restrictions) to see the widget UI.

How to disable it:

1. Go to chrome://flags/
2. Find #local-network-access-check
3. Set it to Disabled

⚠️ **Note 🚨 Make sure to restart Chrome after changing this flag for the update to take effect.**

## MCP + Apps SDK overview

The Model Context Protocol (MCP) is an open specification for connecting large language model clients to external tools, data, and user interfaces. An MCP server exposes tools that a model can call during a conversation and returns results according to the tool contracts. Those results can include extra metadata—such as inline HTML—that the Apps SDK uses to render rich UI components (widgets) alongside assistant messages.

Within the Apps SDK, MCP keeps the server, model, and UI in sync. By standardizing the wire format, authentication, and metadata, it lets ChatGPT reason about your connector the same way it reasons about built-in tools. A minimal MCP integration for Apps SDK implements three capabilities:

1. **List tools** – Your server advertises the tools it supports, including their JSON Schema input/output contracts and optional annotations (for example, `readOnlyHint`).
2. **Call tools** – When a model selects a tool, it issues a `call_tool` request with arguments that match the user intent. Your server executes the action and returns structured content the model can parse.
3. **Return widgets** – Alongside structured content, return embedded resources in the response metadata so the Apps SDK can render the interface inline in the Apps SDK client (ChatGPT).

Because the protocol is transport agnostic, you can host the server over Server-Sent Events or streaming HTTP—Apps SDK supports both.

The MCP servers in this demo highlight how each tool can light up widgets by combining structured payloads with `_meta.openai/outputTemplate` metadata returned from the MCP servers.

## Repository structure

- `src/` – Source for each widget example.
- `assets/` – Generated HTML, JS, and CSS bundles after running the build step.
- `pizzaz_server_node/` – MCP server implemented with the official TypeScript SDK (Pizzaz widgets with inlined assets for Render deployment).
- `kitchen_sink_server_node/` – Node MCP server for the kitchen-sink-lite widget.
- `build-all.mts` – Vite build orchestrator that produces hashed bundles for every widget entrypoint.
- `build-pizzaz-inline.mts` – Build script for Pizzaz widgets with inlined assets (single web service, no external asset URLs).

### Pizzaz overview

This example contains multiple components showing multiple types of views and interactions: a list view, a carousel view, a map view. It also contains a "pizzaz shop" showing interactive flows and a checkout page.

This example uses the [Apps SDK UI library](https://github.com/openai/apps-sdk-ui) for simple components such as images, buttons, and badges.

### Kitchen sink lite overview

The kitchen sink lite sample shows the full `window.openai` surface working together:

- Reads host state (`toolInput`, `toolOutput`, `displayMode`, `theme`, `widgetState`).
- Writes host state with `setWidgetState`.
- Calls another MCP tool from the widget with `callTool`.
- Uses host helpers like `requestDisplayMode`, `openExternal`, and `sendFollowUpMessage`.

Use it as a reference for how to wire UI to MCP tool responses and host APIs with the Apps SDK UI components.

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn
- pre-commit for formatting

## Install dependencies

Clone the repository and install the workspace dependencies:

```bash
pnpm install
pre-commit install
```

> Using npm or yarn? Install the root dependencies with your preferred client and adjust the commands below accordingly.

## Build the components gallery

The components are bundled into standalone assets that the MCP servers serve as reusable UI resources.

```bash
pnpm run build
```

This command runs `build-all.mts`, producing versioned `.html`, `.js`, and `.css` files inside `assets/`. Each widget is wrapped with the CSS it needs so you can host the bundles directly or ship them with your own server.

To iterate on your components locally, you can also launch the Vite dev server:

```bash
pnpm run dev
```

## Run the MCP servers

### Pizzaz server (Node, inlined assets)

The Pizzaz server serves widgets with **inlined** JS and CSS—no separate asset server needed. Ideal for single web service deployment (e.g. Render.com).

Build and run:

```bash
pnpm run build:pizzaz
pnpm run start:pizzaz
```

Or from the server directory:

```bash
pnpm run build:pizzaz
cd pizzaz_server_node && pnpm start
```

The server listens on `http://localhost:8000` by default. MCP SSE: `GET /mcp`, POST: `/mcp/messages?sessionId=...`, health: `GET /health`.

### Kitchen sink lite Node server

Requires a separate static asset server. After `pnpm run build`, run:

```bash
pnpm run serve
pnpm --filter kitchen-sink-mcp-node start
```

The assets are exposed at [`http://localhost:4444`](http://localhost:4444) with CORS enabled.

## Testing in ChatGPT

To add these apps to ChatGPT, enable [developer mode](https://platform.openai.com/docs/guides/developer-mode), and add your apps in Settings > Connectors.

To add your local server without deploying it, you can use a tool like [ngrok](https://ngrok.com/) to expose your local server to the internet.

For example, once your mcp servers are running, you can run:

```bash
ngrok http 8000
```

You will get a public URL that you can use to add your local server to ChatGPT in Settings > Connectors.

For example: `https://<custom_endpoint>.ngrok-free.app/mcp`

Once you add a connector, you can use it in ChatGPT conversations.

You can add your app to the conversation context by selecting it in the "More" options.

![more-chatgpt](https://github.com/user-attachments/assets/26852b36-7f9e-4f48-a515-aebd87173399)

You can then invoke tools by asking something related. For example, for the Pizzaz app, you can ask "What are the best pizzas in town?".

## Next steps

- Customize the widget data: edit the handlers in `pizzaz_server_node/src` to fetch data from your systems.
- Create your own components and add them to the gallery: drop new entries into `src/` and they will be picked up automatically by the build script.

### Deploy your MCP server (Render.com)

The Pizzaz server is configured for Render.com via `render.yaml`. Connect your repo to Render; the blueprint will create a web service that builds inlined assets and runs the MCP server.

Render automatically sets `RENDER_EXTERNAL_URL` (e.g. `https://pizzaz-mcp.onrender.com`). The server adds this domain to `openai/widgetCSP` so ChatGPT can load the widgets and external resources (Mapbox, etc.). No extra env vars are required.

## Contributing

You are welcome to open issues or submit PRs to improve this app, however, please note that we may not review all suggestions.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
