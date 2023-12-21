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

function App() {
  const [settings, setSettings] = makePersisted(createSignal<ISettings>(DefaultSettings))
  const [text, setText] = makePersisted(createSignal(''))
  const [tokens, setTokens] = createSignal(0)
  const [parseCompletion, setParseCompletion] = createSignal<IParseCompletion>({ chunks: [] })

  const getTokenCountAfterTyping = async (text: string) => {
    setText(text)
    setTokens((encode(text)).length);
    // const payload = {
    //   text
    // }
    // try {
    //   const resp = await axios.post(URI_TOKENIZE, payload)
    //   const tokenCount = (encode(text)).length
    //   setTokens(resp.data.count);
    // } catch (err) {
    //   console.error(err)
    // }
  }

  const Process = async () => {
    setParseCompletion({ chunks: [] })
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
      const data = resp.data
      console.info(data)
      setParseCompletion(data);
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
      setTokens((encode(content)).length);
      setText(content)
    } catch (err) {
      console.error(err)
    } finally {
      setSettings({ ...settings(), url: "" })
    }
  }

  return (
    <>
      <nav class="p-2 bg-blue-950 text-white font-bold">
        <h1 class="text-lg">Text Splitter and Token Counter</h1>
      </nav>
      <nav class="flex flex-row flex-wrap space-x-2 p-2 bg-blue-900 text-white">
        <label>Method:</label>
        <div class="space-x-2">
          <input type='radio' name="method"
            checked={settings().method === SplitMethod.SKTIKTOKEN}
            onChange={(e) => setSettings({ ...settings(), method: e.currentTarget.value })}
            value={SplitMethod.SKTIKTOKEN} />
          <label>SK/GPT Encoder</label>
        </div>
        <div class="space-x-2">
          <input type='radio' name="method"
            checked={settings().method === SplitMethod.SK}
            onChange={(e) => setSettings({ ...settings(), method: e.currentTarget.value })}
            value={SplitMethod.SK} />
          <label>SK Default</label>
        </div>
        <div class="space-x-2">
          <input type='radio' name="method"
            checked={settings().method === SplitMethod.Paragraph}
            onChange={(e) => setSettings({ ...settings(), method: e.currentTarget.value })}
            value={SplitMethod.Paragraph} />
          <label>Paragraphs</label>
        </div>
        <div class="space-x-2">
          <input type='radio' name="method"
            checked={settings().method === SplitMethod.ParagraphWords}
            onChange={(e) => setSettings({ ...settings(), method: e.currentTarget.value })}
            value={SplitMethod.ParagraphWords} />
          <label>Paragraph/Words</label>
        </div>
      </nav>
      <nav class="flex flex-row flex-wrap space-x-2 p-2 bg-blue-900 text-white">
        <div class={"space-x-2"} hidden={settings().method == SplitMethod.Paragraph || settings().method == SplitMethod.ParagraphWords}>
          <label>Tokens/Line:</label>
          <input
            value={settings().maxTokensPerLine}
            onChange={(e) => setSettings({ ...settings(), maxTokensPerLine: e.currentTarget.value })}
            class="w-20 px-1 text-black" type="text" />
        </div>
        <div class="space-x-2" hidden={settings().method == SplitMethod.Paragraph || settings().method == SplitMethod.ParagraphWords}>
          <label>Tokens/Paragraph:</label>
          <input
            value={settings().maxTokensPerParagraph}
            onChange={(e) => setSettings({ ...settings(), maxTokensPerParagraph: e.currentTarget.value })}
            class="w-20 px-1 text-black" type="text" />
        </div>
        <div class="space-x-2" hidden={settings().method == SplitMethod.Paragraph || settings().method == SplitMethod.ParagraphWords}>
          <label>Overlap Tokens:</label>
          <input
            value={settings().overlapTokens}
            onChange={(e) => setSettings({ ...settings(), overlapTokens: e.currentTarget.value })}
            class="w-20 px-1 text-black" type="text" />
        </div>
        <div class="space-x-2" hidden={settings().method == SplitMethod.Paragraph || settings().method == SplitMethod.SK || settings().method == SplitMethod.SKTIKTOKEN}>
          <label>Word Count:</label>
          <input
            value={settings().wordCount}
            onChange={(e) => setSettings({ ...settings(), wordCount: e.currentTarget.value })}
            class="w-20 px-1 text-black" type="text" />
        </div>
      </nav>
      <nav class="flex flex-row flex-wrap space-x-2 p-2 bg-blue-800 text-white">
        <div class="space-x-2 space-y-2">
          <label>Document URL:</label>
          <input
            value={settings().url}
            onChange={(e) => setSettings({ ...settings(), url: e.currentTarget.value })}
            class="px-1 w-[500px] text-black" type="text" />
          <button
            onClick={LoadFile}
            class="p-2 bg-green-800 hover:bg-green-700 font-semibold rounded">Load</button>
        </div>
      </nav>
      <div class="container mx-auto flex flex-row flex-wrap">
        <div class="flex flex-col w-full md:w-1/2 p-2 space-y-2">
          <div class="space-x-2">
            <label class="font-bold uppercase">Input Text:</label>
            <span title="Total Tokens" class='px-2 bg-blue-600 text-white rounded-xl'>{tokens()}</span>
          </div>
          <button
            onClick={Process}
            class="w-20 p-2 bg-blue-800 hover:bg-blue-700 text-white font-semibold">Process</button>
          <textarea
            class="border border-black p-2 round-lg"
            value={text()}
            onChange={(e) => { getTokenCountAfterTyping(e.currentTarget.value) }}
            onkeypress={(e) => { getTokenCountAfterTyping(e.currentTarget.value) }}
            rows={20}></textarea>
          {/* <button
            onClick={Process}
            class="w-20 p-2 bg-blue-800 hover:bg-blue-700 text-white font-semibold">Process</button> */}
        </div>
        <div class="flex flex-col w-full md:w-1/2 p-2 space-y-2">
          <div class="space-x-2">
            <label class="font-bold uppercase">Output Chunks: </label> <span title="Total Chunks" class='px-2 bg-blue-600 text-white rounded-xl'>{parseCompletion().chunks.length}</span> -
            <span title="Total Tokens" class='px-2 bg-blue-600 text-white rounded-xl'>{parseCompletion().chunks.reduce((acc, chunk) => acc + chunk.tokenCount, 0)}</span>
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
