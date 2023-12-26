# GPT Tokenizer and Chunking Playground

This is a tool designed to help understand several foundational model concepts when building AI-infused applications with the OpenAI models. These concepts include:

- GPT Models
- Tokens
- Token limits
- Prompts and completions
- Chunking
- Prompt Engineering
- Added context to a prompt

## Chunking methods

- Tokenizer: Use the SK splitter, but override the token counter with a tiktoken token counter
- SK Default: Use the default SK splitter and counter
- Paragraph: Break by paragraphs `\n\n`
- Paragraph words: Break by paragraphs and words. Allow a chunk to be longer than the requested amount until the end of the next paragraph.

## Technologies

UI:

- SolidJS
- SolidJS Primitives/Storage
- Axios
- Vite
- Bun

Backend

- C# SDK 8.0
- Semantic Kernel
- OpenAI SDK

## Running locally

- Create a `.env` file in the `src\backend` folder
- At the project's root folder type: 'make run'

The equivalent `Makefile` commands by hand are:

```bash
rm -rf src/backend/wwwroot
mkdir src/backend/wwwroot
cd src/frontend && bun run build
cp -r src/frontend/dist/* src/backend/wwwroot
cd src/backend && dotnet watch run
```

## Running from Docker

- Type: `make docker`
- Type: `docker run --rm -p 8080:8080 am8850/am8850/gptchunker:${TAG}`
