import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { scan } from '../core/scanner.js';
import { loadConfig } from '../utils/config.js';
import { formatTextReport, formatJSONReport } from '../utils/output.js';
import { toSarif } from '../utils/sarif.js';

export async function startMcpServer() {
  const server = new Server(
    { name: "vibeguard-mcp", version: "0.1.3" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "scan_code",
          description: "Scan a directory or file for security vulnerabilities (Secrets, SQLi, SSRF, XSS, etc.) using VibeGuard. This is perfect for checking if newly generated code is safe.",
          inputSchema: {
            type: "object",
            properties: {
              targetPath: {
                type: "string",
                description: "The path to scan. Defaults to '.' (current directory)."
              },
              format: {
                type: "string",
                enum: ["text", "json", "sarif"],
                description: "Output format of the report. Defaults to 'text'."
              }
            }
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "scan_code") {
      const targetPath = (request.params.arguments?.targetPath as string) || ".";
      const format = (request.params.arguments?.format as string) || "text";
      
      try {
        // Load config from the target path directory so custom settings apply
        const config = await loadConfig({}, targetPath);
        const result = await scan({ rootPath: targetPath, config });
        
        let report = "";
        if (format === 'json') {
          report = formatJSONReport(result);
        } else if (format === 'sarif') {
          report = JSON.stringify(toSarif(result), null, 2);
        } else {
          report = formatTextReport(result);
        }

        return {
          content: [{ type: "text", text: report }]
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error running VibeGuard: ${e.message}` }],
          isError: true
        };
      }
    }
    throw new Error(`Tool not found: ${request.params.name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // MCP requires logging to stderr so it doesn't pollute the JSON-RPC stdio stream
  console.error("VibeGuard MCP Server running on stdio");
}
