using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddCors(opt => opt.AddDefaultPolicy(builder =>
{
    builder.AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader();
}));
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ITextSplitter<SKSplitter>, SplitBySkSplitter>();
builder.Services.AddSingleton<ITextSplitter<SKSplitterTiktoken>, SplitBySkSplitterTiktoken>();
builder.Services.AddSingleton<ITextSplitter<ParagraphSplitter>, SplitByParagraph>();
builder.Services.AddSingleton<ITextSplitter<ParagraphWordsSplitter>, SplitByParagraphWords>();

var tikToken = Tiktoken.Encoding.ForModel("gpt-4");

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors();

//app.UseAuthorization();
var group = app.MapGroup("/api/v1/content");

group.MapPost("/tokenize", ([FromBody] ParseRequest request) =>
{
    if (string.IsNullOrEmpty(request.text))
    {
        return Results.BadRequest(new { message = "Text cannot be empty" });
    }
    return Results.Ok(new ParseResponse(request.text, tikToken.Encode(request.text).Count));
})
.Produces<ParseResponse>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest)
.WithName("PostTokenize")
.WithOpenApi();

group.MapPost("/split", ([FromBody] ParseRequest request, ITextSplitter<SKSplitter> skSplitter,
ITextSplitter<ParagraphSplitter> paragraphSplitter, ITextSplitter<ParagraphWordsSplitter> paragraphWordSplitter, ITextSplitter<SKSplitterTiktoken> skTiktokenSplitter) =>
{
    if (string.IsNullOrEmpty(request.text))
    {
        return Results.BadRequest(new { message = "Text cannot be empty" });
    }

    List<ChunkInfo> chunks = new();
    var splittingMethod = request.method;

    if (string.IsNullOrEmpty(splittingMethod) || request.method == SplitterType.SK.ToString())
    {
        chunks = skSplitter.ChunkText(request.text, request.maxTokensPerLine, request.maxTokensPerParagraph, request.overlapTokens) ?? new List<ChunkInfo>();
    }
    else if (splittingMethod == SplitterType.SKTiktoken.ToString())
    {
        chunks = skTiktokenSplitter.ChunkText(request.text, request.maxTokensPerLine, request.maxTokensPerParagraph, request.overlapTokens) ?? new List<ChunkInfo>();
    }
    else if (splittingMethod == SplitterType.Paragraph.ToString())
    {
        chunks = paragraphSplitter.ChunkText(request.text, request.maxTokensPerLine, request.maxTokensPerParagraph, request.overlapTokens) ?? new List<ChunkInfo>();
    }
    else if (splittingMethod == SplitterType.ParagraphWords.ToString())
    {
        chunks = paragraphWordSplitter.ChunkText(request.text, request.maxTokensPerLine, request.maxTokensPerParagraph, request.overlapTokens) ?? new List<ChunkInfo>();
    }

    return Results.Ok(new ParseCompletion(chunks));
})
.Produces<ParseCompletion>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest)
.WithName("PostSplit")
.WithOpenApi();

group.MapPost("/load", async ([FromBody] UrlFileRequest request, HttpClient client) =>
{
    var fileName = Path.GetFileName(request.url);
    var ext = Path.GetExtension(fileName);
    switch (ext)
    {
        case ".txt":
        case ".md":
            var response = await client.GetAsync(request.url);
            if (!response.IsSuccessStatusCode)
            {
                return Results.BadRequest(new { message = $"Cannot download file from {request.url}" });
            }
            var text = await response.Content.ReadAsStringAsync();
            if (string.IsNullOrEmpty(text))
            {
                return Results.BadRequest(new { message = $"The file is empty: {request.url}" });
            }
            return Results.Ok(new UrlFileResponse(request.url, fileName, text));
        default:
            return Results.BadRequest(new { message = $"The file format is not supported: {fileName}" });
    }
})
.Produces<UrlFileResponse>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest)
.WithName("PostLoad")
.WithOpenApi();

//app.MapControllers();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();
