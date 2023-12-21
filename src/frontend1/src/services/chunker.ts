// type TokenCounter = (input: string) => number;

// class StringBuilder {
//     private readonly _parts: string[] = [];

//     public get length(): number {
//         return this._parts.reduce((sum, part) => sum + part.length, 0);
//     }

//     public append(text: string): void {
//         this._parts.push(text);
//     }

//     public appendLine(text: string): void {
//         this._parts.push(text);
//         this._parts.push('\n');
//     }

//     public clear(): void {
//         this._parts.length = 0;
//     }

//     public toString(): string {
//         return this._parts.join('');
//     }
// }

// class TextChunker {
//     private static readonly s_spaceChar = [' '];
//     private static readonly s_plaintextSplitOptions = ["\n\r", ".", "?!", ";", ":", ",", ")]}", " ", "-", null];
//     private static readonly s_markdownSplitOptions = [".", "?!", ";", ":", ",", ")]}", " ", "-", "\n\r", null];

//     /**
//      * Split plain text into lines.
//      * @param text Text to split
//      * @param maxTokensPerLine Maximum number of tokens per line.
//      * @param tokenCounter Function to count tokens in a string. If not supplied, the default counter will be used.
//      * @returns List of lines.
//      */
//     public static splitPlainTextLines(text: string, maxTokensPerLine: number, tokenCounter?: TokenCounter): string[] {
//         tokenCounter ??= TextChunker.defaultTokenCounter;

//         return TextChunker.internalSplitLines(text, maxTokensPerLine, true, TextChunker.s_plaintextSplitOptions, tokenCounter);
//     }

//     /**
//      * Split markdown text into lines.
//      * @param text Text to split
//      * @param maxTokensPerLine Maximum number of tokens per line.
//      * @param tokenCounter Function to count tokens in a string. If not supplied, the default counter will be used.
//      * @returns List of lines.
//      */
//     public static splitMarkDownLines(text: string, maxTokensPerLine: number, tokenCounter?: TokenCounter): string[] {
//         tokenCounter ??= TextChunker.defaultTokenCounter;

//         return TextChunker.internalSplitLines(text, maxTokensPerLine, true, TextChunker.s_markdownSplitOptions, tokenCounter);
//     }

//     /**
//      * Split plain text into paragraphs.
//      * @param lines Lines of text.
//      * @param maxTokensPerParagraph Maximum number of tokens per paragraph.
//      * @param overlapTokens Number of tokens to overlap between paragraphs.
//      * @param chunkHeader Text to be prepended to each individual chunk.
//      * @param tokenCounter Function to count tokens in a string. If not supplied, the default counter will be used.
//      * @returns List of paragraphs.
//      */
//     public static splitPlainTextParagraphs(lines: string[], maxTokensPerParagraph: number, overlapTokens = 0, chunkHeader?: string, tokenCounter?: TokenCounter): string[] {
//         tokenCounter ??= TextChunker.defaultTokenCounter;

//         return TextChunker.internalSplitTextParagraphs(lines, maxTokensPerParagraph, overlapTokens, chunkHeader, (text, maxTokens) => TextChunker.internalSplitLines(text, maxTokens, false, TextChunker.s_plaintextSplitOptions, tokenCounter), tokenCounter);
//     }

//     /**
//      * Split markdown text into paragraphs.
//      * @param lines Lines of text.
//      * @param maxTokensPerParagraph Maximum number of tokens per paragraph.
//      * @param overlapTokens Number of tokens to overlap between paragraphs.
//      * @param chunkHeader Text to be prepended to each individual chunk.
//      * @param tokenCounter Function to count tokens in a string. If not supplied, the default counter will be used.
//      * @returns List of paragraphs.
//      */
//     public static splitMarkdownParagraphs(lines: string[], maxTokensPerParagraph: number, overlapTokens = 0, chunkHeader?: string, tokenCounter?: TokenCounter): string[] {
//         tokenCounter ??= TextChunker.defaultTokenCounter;

//         return TextChunker.internalSplitTextParagraphs(lines, maxTokensPerParagraph, overlapTokens, chunkHeader, (text, maxTokens) => TextChunker.internalSplitLines(text, maxTokens, false, TextChunker.s_markdownSplitOptions, tokenCounter), tokenCounter);
//     }

//     private static internalSplitTextParagraphs(lines: string[], maxTokensPerParagraph: number, overlapTokens: number, chunkHeader: string | undefined, longLinesSplitter: (text: string, maxTokens: number) => string[], tokenCounter: TokenCounter): string[] {
//         if (maxTokensPerParagraph <= 0) {
//             throw new Error("maxTokensPerParagraph should be a positive number");
//         }

//         if (maxTokensPerParagraph <= overlapTokens) {
//             throw new Error("overlapTokens cannot be larger than maxTokensPerParagraph");
//         }

//         if (lines.length === 0) {
//             return [];
//         }

//         const chunkHeaderTokens = chunkHeader?.length ? tokenCounter(chunkHeader) : 0;
//         const adjustedMaxTokensPerParagraph = maxTokensPerParagraph - overlapTokens - chunkHeaderTokens;

//         // Split long lines first
//         const truncatedLines = lines.flatMap(line => longLinesSplitter(line, adjustedMaxTokensPerParagraph));

//         const paragraphs = TextChunker.buildParagraph(truncatedLines, adjustedMaxTokensPerParagraph, longLinesSplitter, tokenCounter);
//         const processedParagraphs = TextChunker.processParagraphs(paragraphs, adjustedMaxTokensPerParagraph, overlapTokens, chunkHeader, longLinesSplitter, tokenCounter);

//         return processedParagraphs;
//     }

//     private static buildParagraph(truncatedLines: string[], maxTokensPerParagraph: number, longLinesSplitter: (text: string, maxTokens: number) => string[], tokenCounter: TokenCounter): string[] {
//         const paragraphBuilder = new StringBuilder();
//         const paragraphs: string[] = [];

//         for (const line of truncatedLines) {
//             if (paragraphBuilder.length > 0 && tokenCounter(paragraphBuilder.toString()) + tokenCounter(line) + 1 >= maxTokensPerParagraph) {
//                 // Complete the paragraph and prepare for the next
//                 paragraphs.push(paragraphBuilder.toString().trim());
//                 paragraphBuilder.clear();
//             }

//             paragraphBuilder.appendLine(line);
//         }

//         if (paragraphBuilder.length > 0) {
//             // Add the final paragraph if there's anything remaining
//             paragraphs.push(paragraphBuilder.toString().trim());
//         }

//         return paragraphs;
//     }

//     private static processParagraphs(paragraphs: string[], adjustedMaxTokensPerParagraph: number, overlapTokens: number, chunkHeader: string | undefined, longLinesSplitter: (text: string, maxTokens: number) => string[], tokenCounter: TokenCounter): string[] {
//         const processedParagraphs: string[] = [];
//         const paragraphStringBuilder = new StringBuilder();

//         // distribute text more evenly in the last paragraphs when the last paragraph is too short.
//         if (paragraphs.length > 1) {
//             const lastParagraph = paragraphs[paragraphs.length - 1];
//             const secondLastParagraph = paragraphs[paragraphs.length - 2];

//             if (tokenCounter(lastParagraph) < adjustedMaxTokensPerParagraph / 4) {
//                 const lastParagraphTokens = lastParagraph.split(TextChunker.s_spaceChar);
//                 const secondLastParagraphTokens = secondLastParagraph.split(TextChunker.s_spaceChar);

//                 const lastParagraphTokensCount = lastParagraphTokens.length;
//                 const secondLastParagraphTokensCount = secondLastParagraphTokens.length;

//                 if (lastParagraphTokensCount + secondLastParagraphTokensCount <= adjustedMaxTokensPerParagraph) {
//                     const newSecondLastParagraph = secondLastParagraphTokens.join(" ");
//                     const newLastParagraph = lastParagraphTokens.join(" ");

//                     paragraphs[paragraphs.length - 2] = `${newSecondLastParagraph} ${newLastParagraph}`;
//                     paragraphs.pop();
//                 }
//             }
//         }

//         for (let i = 0; i < paragraphs.length; i++) {
//             paragraphStringBuilder.clear();

//             if (chunkHeader) {
//                 paragraphStringBuilder.append(chunkHeader);
//             }

//             const paragraph = paragraphs[i];

//             if (overlapTokens > 0 && i < paragraphs.length - 1) {
//                 const nextParagraph = paragraphs[i + 1];
//                 const split = longLinesSplitter(nextParagraph, overlapTokens);

//                 paragraphStringBuilder.append(paragraph);

//                 if (split[0]) {
//                     paragraphStringBuilder.append(' ');
//                     paragraphStringBuilder.append(split[0]);
//                 }
//             } else {
//                 paragraphStringBuilder.append(paragraph);
//             }

//             processedParagraphs.push(paragraphStringBuilder.toString());
//         }

//         return processedParagraphs;
//     }

//     private static internalSplitLines(text: string, maxTokensPerLine: number, trim: boolean, splitOptions: (string | null)[], tokenCounter: TokenCounter): string[] {
//         const result: string[] = [];

//         text = text.normalizeLineEndings();
//         result.push(text);
//         for (let i = 0; i < splitOptions.length; i++) {
//             const count = result.length; // track where the original input left off
//             const [splits2, inputWasSplit2] = TextChunker.split(result, maxTokensPerLine, splitOptions[i], trim, tokenCounter);
//             result.push(...splits2);
//             result.splice(0, count); // remove the original input
//             if (!inputWasSplit2) {
//                 break;
//             }
//         }
//         return result;
//     }

//     private static split(input: string[], maxTokens: number, separators: string | null, trim: boolean, tokenCounter: TokenCounter): [string[], boolean] {
//         let inputWasSplit = false;
//         const result: string[] = [];
//         const count = input.length;
//         for (let i = 0; i < count; i++) {
//             const [splits, split] = TextChunker.split(input[i], input[i], maxTokens, separators, trim, tokenCounter);
//             result.push(...splits);
//             inputWasSplit |= split;
//         }
//         return [result, inputWasSplit];
//     }

//     private static split(input: string, inputString: string | undefined, maxTokens: number, separators: string | null, trim: boolean, tokenCounter: TokenCounter): [string[], boolean] {
//         const result: string[] = [];
//         let inputWasSplit = false;
//         if (tokenCounter(input) > maxTokens) {
//             inputWasSplit = true;

//             const half = input.length / 2;
//             let cutPoint = -1;

//             if (!separators) {
//                 cutPoint = half;
//             } else if (input.length > 2) {
//                 let pos = 0;
//                 while (true) {
//                     const index = input.slice(pos, input.length - 1 - pos).indexOfAny(separators);
//                     if (index < 0) {
//                         break;
//                     }

//                     const newIndex = index + pos;

//                     if (Math.abs(half - newIndex) < Math.abs(half - cutPoint)) {
//                         cutPoint = newIndex + 1;
//                     }

//                     pos = newIndex + 1;
//                 }
//             }

//             if (cutPoint > 0) {
//                 let firstHalf = input.slice(0, cutPoint);
//                 let secondHalf = input.slice(cutPoint);
//                 if (trim) {
//                     firstHalf = firstHalf.trim();
//                     secondHalf = secondHalf.trim();
//                 }

//                 // Recursion
//                 const [splits1, split1] = TextChunker.split(firstHalf, undefined, maxTokens, separators, trim, tokenCounter);
//                 result.push(...splits1);
//                 const [splits2, split2] = TextChunker.split(secondHalf, undefined, maxTokens, separators, trim, tokenCounter);
//                 result.push(...splits2);

//                 inputWasSplit = split1 || split2;
//                 return [result, inputWasSplit];
//             }
//         }

//         result.push((inputString !== undefined && trim) ? inputString.trim() : input);

//         return [result, inputWasSplit];
//     }

//     private static defaultTokenCounter(input: string): number {
//         return input.length / 4;
//     }
// }