import axios from "axios"
import { For, createSignal } from "solid-js"
import { encode } from 'gpt-tokenizer'
import { makePersisted } from "@solid-primitives/storage"

interface ISettings {
  maxTokensPerLine: string
  maxTokensPerParagraph: string
  overlapTokens: string
  wordCount: string
  method: string
  chunks: string
  prompt: string
  max_tokens: string
  temperature: string
  url: string
}

const SplitMethod = {
  SK: "SK",
  SKTIKTOKEN: "SKTiktoken",
  Paragraph: "Paragraph",
  ParagraphWords: "ParagraphWords"
}

const DefaultSettings: ISettings = {
  maxTokensPerLine: "100",
  maxTokensPerParagraph: "1024",
  overlapTokens: "0",
  wordCount: "512",
  method: SplitMethod.SK,
  chunks: "3",
  prompt: "",
  max_tokens: "500",
  temperature: "0.3",
  url: ""
}

interface IChunk {
  text: string
  tokenCount: number
}

interface IParseCompletion {
  chunks: IChunk[]
}

//const URI_TOKENIZE = "http://localhost:5096/api/v1/content/tokenize"
const URI_CHUNK = "api/v1/content/split"
const URI_LOAD = "api/v1/content/load"
const URI_COMPLETION = "api/v1/content/completion"

function App() {
  const [settings, setSettings] = makePersisted(createSignal<ISettings>(DefaultSettings))
  const [text, setText] = makePersisted(createSignal(''))
  const [tokens, setTokens] = createSignal(0)
  const [tokensContext, setTokensContext] = createSignal(0)
  const [tokensPrompt, setTokensPrompt] = createSignal(0)
  const [parseCompletion, setParseCompletion] = createSignal<IParseCompletion>({ chunks: [] })
  const [context, setContext] = createSignal('')
  const [completion, setCompletion] = createSignal('')
  const [processing, setProcessing] = createSignal(false)
  const [submitLabel, setSubmitLabel] = createSignal("Submit")

  const getTokenCountAfterTyping = (text: string, control: string) => {
    if (control === "chunk") {
      setText(text)
      setTokens((encode(text)).length);
    }
    if (control === "context") {
      setContext(text)
      setTokensContext(encode(text).length);
    }
    if (control === "prompt") {
      setSettings({ ...settings(), prompt: text })
      setTokensPrompt((encode(text + context())).length);
    }
  }

  const UpdateTokenCounts = () => {
    setTokens((encode(text())).length);
    setTokensPrompt((encode(settings().prompt + context())).length);
    setTokensContext(encode(context()).length);
  }

  const Process = async () => {
    setParseCompletion({ chunks: [] })
    getTokenCountAfterTyping(text(), "chunk")
    const maxTokensPerParagraph = settings().method == SplitMethod.Paragraph ? parseInt(settings().wordCount) : parseInt(settings().maxTokensPerLine)
    const payload = {
      text: text(),
      maxTokensPerLine: parseInt(settings().maxTokensPerLine),
      maxTokensPerParagraph,
      overlapTokens: parseInt(settings().overlapTokens),
      method: settings().method
    }
    try {
      const resp = await axios.post(URI_CHUNK, payload)
      const data: IParseCompletion = resp.data
      console.info(data)
      setParseCompletion(data)
      const totalChunks = parseInt(settings().chunks)
      if (totalChunks > 0 && data.chunks.length > 0) {
        let chunkText = ""
        for (let i = 0; i < totalChunks; i++) {
          if (i == data.chunks.length) break;
          chunkText += data.chunks[i].text + "\n\n"
        }
        setContext(chunkText)
      }
      UpdateTokenCounts()
    } catch (err) {
      console.error(err)
    }
  }

  const LoadFile = async () => {
    const payload = { url: settings().url }
    setSettings({ ...settings(), url: "Loading ..." })
    try {
      const resp = await axios.post(URI_LOAD, payload)
      const content = resp.data.content;
      setText(content)
      UpdateTokenCounts()
    } catch (err) {
      console.error(err)
    } finally {
      setSettings({ ...settings(), url: "" })
    }
  }

  const Submit = async () => {
    if (processing()) return
    const payload = {
      prompt: settings().prompt + "\n\n" + context(),
      max_tokens: parseInt(settings().max_tokens),
      temperature: parseFloat(settings().temperature)
    }
    try {
      setProcessing(true)
      setSubmitLabel("Busy...")
      const resp = await axios.post(URI_COMPLETION, payload)
      const data = resp.data
      setCompletion(data.text)
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
      setSubmitLabel("Submit")
    }
  }

  return (
    <>
      <nav class="p-2 bg-purple-950 text-white font-bold">
        <h1 class="text-lg">GPT Tokenizer & Chunking Playground</h1>
      </nav>

      <nav class="flex flex-row flex-wrap space-x-2 p-2 bg-purple-800 text-white">
        <div class="space-x-2 space-y-2">
          <label>Document URL:</label>
          <input
            value={settings().url}
            onInput={(e) => setSettings({ ...settings(), url: e.currentTarget.value })}
            class="px-1 w-[500px] text-black" type="text" />
          <button
            onClick={LoadFile}
            class="p-2 bg-green-800 hover:bg-green-700 font-semibold rounded">Load</button>
        </div>
      </nav>
      <div class="flex flex-row flex-wrap p-3">
        <div class="flex flex-col w-full md:w-3/4 p-2 space-y-2">
          <div class="p-2 bg-yellow-100">
            <p>This tool helps to understand tokens, text chunking, setting context in a Prompt, and to gage the quality of a response based on different chunking settings for a document. To use this tool:</p>
            <div class="p-2">
              <ul>
                <li>- First paste the document content into the <strong>INPUT TEXT</strong> area, set the chunking method and sizes, and then click the <strong>Chunk</strong> button.</li>
                <li>- The document will be split into chunks and displayed to the right.</li>
                <li>- Chunks will be added to the <strong>ADDITIONAL CONTEXT</strong> area based on the Chunk limit.</li>
                <li>- Enter the prompt, max tokens, and temperature, then click the <strong>Submit</strong> button. The additional context will be added to the prompt automatically.</li>
                <li>- The response will be displayed in the <strong>COMPLETION</strong> area.</li>
              </ul>
            </div>
          </div>
          <div>
            <div class="bg-slate-900 p-1 text-white space-x-2">
              <label class="font-bold uppercase">Input Text:</label>
              <span title="Total Tokens" class='px-2 bg-purple-900 text-white rounded-xl'>{tokens()}</span>
            </div>
            <div class="flex flex-row flex-wrap space-x-2 p-2 bg-purple-900 text-white">
              <label>Method:</label>
              <div class="space-x-2">
                <input type='radio' name="method"
                  checked={settings().method === SplitMethod.SKTIKTOKEN}
                  onInput={(e) => setSettings({ ...settings(), method: e.currentTarget.value })}
                  value={SplitMethod.SKTIKTOKEN} />
                <label>SK/GPT Encoder</label>
              </div>
              <div class="space-x-2">
                <input type='radio' name="method"
                  checked={settings().method === SplitMethod.SK}
                  onInput={(e) => setSettings({ ...settings(), method: e.currentTarget.value })}
                  value={SplitMethod.SK} />
                <label>SK Default</label>
              </div>
              <div class="space-x-2">
                <input type='radio' name="method"
                  checked={settings().method === SplitMethod.Paragraph}
                  onInput={(e) => setSettings({ ...settings(), method: e.currentTarget.value })}
                  value={SplitMethod.Paragraph} />
                <label>Paragraphs</label>
              </div>
              <div class="space-x-2">
                <input type='radio' name="method"
                  checked={settings().method === SplitMethod.ParagraphWords}
                  onInput={(e) => setSettings({ ...settings(), method: e.currentTarget.value })}
                  value={SplitMethod.ParagraphWords} />
                <label>Paragraph/Words</label>
              </div>
            </div>
            <div class="flex flex-row flex-wrap space-x-2 p-2 bg-purple-900 text-white">
              <div class={"space-x-2"} hidden={settings().method == SplitMethod.Paragraph || settings().method == SplitMethod.ParagraphWords}>
                <label>Tokens/Line:</label>
                <input
                  value={settings().maxTokensPerLine}
                  onInput={(e) => setSettings({ ...settings(), maxTokensPerLine: e.currentTarget.value })}
                  class="w-20 px-1 text-black" type="text" />
              </div>
              <div class="space-x-2" hidden={settings().method == SplitMethod.Paragraph || settings().method == SplitMethod.ParagraphWords}>
                <label>Tokens/Paragraph:</label>
                <input
                  value={settings().maxTokensPerParagraph}
                  onInput={(e) => setSettings({ ...settings(), maxTokensPerParagraph: e.currentTarget.value })}
                  class="w-20 px-1 text-black" type="text" />
              </div>
              <div class="space-x-2" hidden={settings().method == SplitMethod.Paragraph || settings().method == SplitMethod.ParagraphWords}>
                <label>Overlap Tokens:</label>
                <input
                  value={settings().overlapTokens}
                  onInput={(e) => setSettings({ ...settings(), overlapTokens: e.currentTarget.value })}
                  class="w-20 px-1 text-black" type="text" />
              </div>
              <div class="space-x-2" hidden={settings().method == SplitMethod.Paragraph || settings().method == SplitMethod.SK || settings().method == SplitMethod.SKTIKTOKEN}>
                <label>Word Count:</label>
                <input
                  value={settings().wordCount}
                  onInput={(e) => setSettings({ ...settings(), wordCount: e.currentTarget.value })}
                  class="w-20 px-1 text-black" type="text" />
              </div>
            </div>
          </div>
          <button
            onClick={Process}
            class="w-20 p-2 bg-purple-950 hover:bg-purple-900 text-white font-semibold">Chunk</button>
          <textarea
            class="border border-black p-2 round-lg"
            value={text()}
            onInput={(e) => { getTokenCountAfterTyping(e.currentTarget.value, "chunk") }}
            rows={10}></textarea>
          <div>
            <div class="bg-slate-900 p-1 text-white space-x-2">
              <label class='font-bold uppercase'>Additional Context</label>
              <span title="Total Tokens" class='px-2 bg-purple-900 text-white rounded-xl'>{tokensContext()}</span>
            </div>
            <div class="bg-purple-900 p-1 text-white space-x-1">
              <label class='font-bold uppercase'>Chunks:</label>
              <input class="px-1 w-10 text-black"
                value={settings().chunks}
                onInput={(e) => setSettings({ ...settings(), chunks: e.currentTarget.value })}
              />
            </div>
          </div>
          <button class="p-2 w-20 bg-purple-950 text-white">Load</button>
          <textarea
            class="border border-black p-2 round-lg"
            value={context()}
            onInput={(e) => getTokenCountAfterTyping(e.currentTarget.value, "context")}
            rows={10}></textarea>
          <div>
            <div class="bg-slate-900 text-white p-1 space-x-2">
              <label class='font-bold uppercase'>Prompt</label>
              <span title="Total Tokens" class='px-2 bg-purple-900 text-white rounded-xl'>{tokensPrompt()}</span>
            </div>
            <div class="bg-purple-900 p-1 text-white space-x-1">
              <label class='font-bold uppercase'>Max Tokens:</label>
              <input class="w-20 px-1 text-black"
                value={settings().max_tokens}
                oninput={(e) => setSettings({ ...settings(), max_tokens: e.currentTarget.value })}
              />
              <label class='font-bold uppercase'>Temperature:</label>
              <input class="w-20 px-1 text-black"
                value={settings().temperature}
                oninput={(e) => setSettings({ ...settings(), temperature: e.currentTarget.value })}
              />
            </div>
          </div>
          <button class="p-2 w-24 bg-purple-950 text-white"
            onclick={Submit}
          >{submitLabel()}</button>
          <textarea
            class="border border-black p-2 round-lg"
            value={settings().prompt}
            onInput={(e) => getTokenCountAfterTyping(e.currentTarget.value, "prompt")}
            rows={5}></textarea>
          <div class="bg-slate-900 p-1 text-white">
            <label class='font-bold uppercase'>Completion</label>
          </div>
          <textarea
            readOnly
            value={completion()}
            class="border bg-slate-200 border-black p-2 round-lg"
            rows={10}></textarea>
          {/* <button
            onClick={Process}
            class="w-20 p-2 bg-blue-800 hover:bg-blue-700 text-white font-semibold">Process</button> */}
        </div>
        <div class="flex flex-col w-full md:w-1/4 p-2 space-y-2">
          <div class="space-x-2 bg-slate-900 text-white p-1">
            <label class="font-bold uppercase">Output Chunks: </label> <span title="Total Chunks" class='px-2 bg-purple-900 text-white rounded-xl'>{parseCompletion().chunks.length}</span> -
            <span title="Total Tokens" class='px-2 bg-purple-900 text-white rounded-xl'>{parseCompletion().chunks.reduce((acc, chunk) => acc + chunk.tokenCount, 0)}</span>
          </div>

          <For each={parseCompletion().chunks}>
            {(chunk, idx) => (
              <div class="flex flex-col rounded-lg p-2 space-y-3 border-2 border-slate-300 hover:border-2 hover:border-slate-800 shadow">
                <div>
                  <span class="text-sm font-bold uppercase">Chunk: </span>{idx() + 1} <span class="text-sm font-bold uppercase">Tokens: </span>{chunk.tokenCount}
                </div>
                <hr class="border-black" />
                {/* <span class="">{chunk.text}</span> */}
                <textarea class="bg-slate-200 p-2" rows={6} value={chunk.text} readOnly></textarea>
              </div>
            )}
          </For>
        </div>
      </div>
    </>
  )
}

export default App
