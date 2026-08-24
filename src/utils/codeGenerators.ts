import type { EnvironmentItem, RequestItem } from '../types'
import { generateCurlCommand } from './curlHelper'
import { buildFinalHeaders, resolveTemplates } from '../services/templateService'

export type CodeSnippetLang =
  | 'curl'
  | 'js_fetch'
  | 'js_axios'
  | 'node_native'
  | 'python_requests'
  | 'python_http'
  | 'go_native'
  | 'dart_http'

export interface CodeSnippetOption {
  id: CodeSnippetLang
  label: string
  language: 'javascript' | 'json' | 'text'
}

export const CODE_SNIPPET_OPTIONS: CodeSnippetOption[] = [
  { id: 'curl', label: 'cURL', language: 'text' },
  { id: 'js_fetch', label: 'JavaScript - Fetch', language: 'javascript' },
  { id: 'js_axios', label: 'JavaScript - Axios', language: 'javascript' },
  { id: 'node_native', label: 'Node.js - Native https', language: 'javascript' },
  { id: 'python_requests', label: 'Python - Requests', language: 'text' },
  { id: 'python_http', label: 'Python - http.client', language: 'text' },
  { id: 'go_native', label: 'Go - net/http', language: 'text' },
  { id: 'dart_http', label: 'Dart / Flutter - http', language: 'text' },
]

function getResolvedHeaders(
  request: RequestItem,
  environment?: EnvironmentItem | null,
): Record<string, string> {
  return buildFinalHeaders(request, environment)
}

function getRequestBodyString(
  request: RequestItem,
  environment?: EnvironmentItem | null,
): string | null {
  if (request.mode === 'GRAPHQL') {
    let vars: Record<string, unknown> = {}
    try {
      vars = request.gqlVariables.trim()
        ? JSON.parse(resolveTemplates(request.gqlVariables, environment))
        : {}
    } catch {
      // ignore
    }
    return JSON.stringify({
      query: resolveTemplates(request.gqlQuery, environment),
      variables: vars,
    })
  }

  if (['GET', 'DELETE'].includes(request.method)) return null

  if (request.bodyType === 'json' && request.restBody.trim()) {
    return resolveTemplates(request.restBody, environment)
  }

  if (request.bodyType === 'raw' && request.rawText) {
    return resolveTemplates(request.rawText, environment)
  }

  if (request.bodyType === 'x-www-form-urlencoded') {
    const p = new URLSearchParams()
    request.urlencoded
      .filter((r) => r.enabled && r.key.trim())
      .forEach((r) => {
        p.append(
          resolveTemplates(r.key.trim(), environment),
          resolveTemplates(r.value, environment),
        )
      })
    return p.toString()
  }

  return null
}

export function generateCodeSnippet(
  lang: CodeSnippetLang,
  request: RequestItem,
  environment?: EnvironmentItem | null,
): string {
  const url = resolveTemplates(request.url, environment)
  const method = request.mode === 'GRAPHQL' ? 'POST' : request.method
  const headers = getResolvedHeaders(request, environment)
  const bodyStr = getRequestBodyString(request, environment)

  switch (lang) {
    case 'curl':
      return generateCurlCommand(request, environment)

    case 'js_fetch': {
      const options: Record<string, unknown> = { method }
      if (Object.keys(headers).length > 0) options.headers = headers
      if (bodyStr) options.body = bodyStr

      return `const url = "${url}";
const options = ${JSON.stringify(options, null, 2)};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error("Fetch error:", error);
}`
    }

    case 'js_axios': {
      const config: Record<string, unknown> = {
        method: method.toLowerCase(),
        url,
      }
      if (Object.keys(headers).length > 0) config.headers = headers
      if (bodyStr) {
        try {
          config.data = JSON.parse(bodyStr)
        } catch {
          config.data = bodyStr
        }
      }

      return `import axios from "axios";

const config = ${JSON.stringify(config, null, 2)};

axios(config)
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error("Axios error:", error);
  });`
    }

    case 'node_native': {
      return `const https = require("https");

const url = new URL("${url}");
const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname + url.search,
  method: "${method}",
  headers: ${JSON.stringify(headers, null, 2)}
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log(JSON.parse(data));
  });
});

req.on("error", (e) => {
  console.error(e);
});

${bodyStr ? `req.write(${JSON.stringify(bodyStr)});\n` : ''}req.end();`
    }

    case 'python_requests': {
      return `import requests
import json

url = "${url}"
headers = ${JSON.stringify(headers, null, 4)}
${bodyStr ? `payload = ${bodyStr.startsWith('{') ? bodyStr : JSON.stringify(bodyStr)}\n` : ''}
response = requests.request(
    "${method}",
    url,
    headers=headers,
    ${bodyStr ? (bodyStr.startsWith('{') ? 'json=payload' : 'data=payload') : ''}
)

print(response.status_code)
print(response.text)`
    }

    case 'python_http': {
      return `import http.client
import urllib.parse
import json

parsed_url = urllib.parse.urlparse("${url}")
conn = http.client.HTTPSConnection(parsed_url.netloc)

headers = ${JSON.stringify(headers, null, 4)}
${bodyStr ? `payload = ${JSON.stringify(bodyStr)}\n` : ''}
conn.request("${method}", parsed_url.path + ("?" + parsed_url.query if parsed_url.query else ""), ${bodyStr ? 'payload' : 'None'}, headers)
res = conn.getresponse()
data = res.read()

print(res.status, res.reason)
print(data.decode("utf-8"))`
    }

    case 'go_native': {
      return `package main

import (
	"fmt"
	"io"
	"net/http"
	${bodyStr ? '"strings"' : ''}
)

func main() {
	url := "${url}"
	method := "${method}"

	${bodyStr ? `payload := strings.NewReader(${JSON.stringify(bodyStr)})\n\treq, err := http.NewRequest(method, url, payload)` : `req, err := http.NewRequest(method, url, nil)`}
	if err != nil {
		panic(err)
	}

	${Object.entries(headers)
    .map(([k, v]) => `req.Header.Add("${k}", "${v}")`)
    .join('\n\t')}

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(body))
}`
    }

    case 'dart_http': {
      return `import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  final url = Uri.parse("${url}");
  final headers = ${JSON.stringify(headers, null, 4)};
  ${bodyStr ? `final body = ${JSON.stringify(bodyStr)};\n` : ''}
  final response = await http.${method.toLowerCase()}(
    url,
    headers: headers,
    ${bodyStr ? 'body: body,' : ''}
  );

  print('Status: \${response.statusCode}');
  print('Body: \${response.body}');
}`
    }

    default:
      return ''
  }
}
