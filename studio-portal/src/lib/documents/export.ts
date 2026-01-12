import puppeteer from "puppeteer";

export async function exportDocumentToPDF(
  title: string,
  content: string
): Promise<Buffer> {
  // Content is already HTML from rich text editor
  const htmlContent = content || "<p>No content</p>";

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          h1 {
            font-size: 2em;
            margin-top: 0;
            margin-bottom: 0.5em;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.3em;
          }
          h2 {
            font-size: 1.5em;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.2em;
          }
          h3 {
            font-size: 1.25em;
            margin-top: 1.25em;
            margin-bottom: 0.5em;
          }
          p {
            margin-bottom: 1em;
          }
          ul, ol {
            margin-bottom: 1em;
            padding-left: 2em;
          }
          li {
            margin-bottom: 0.5em;
          }
          code {
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          pre {
            background-color: #f1f5f9;
            padding: 1em;
            border-radius: 6px;
            overflow-x: auto;
            margin-bottom: 1em;
          }
          pre code {
            background-color: transparent;
            padding: 0;
          }
          blockquote {
            border-left: 4px solid #cbd5e1;
            padding-left: 1em;
            margin-left: 0;
            color: #64748b;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1em;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f8fafc;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${htmlContent}
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

