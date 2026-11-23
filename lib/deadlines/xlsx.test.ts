import { describe, expect, it } from "vitest";
import { readCsvRows, readXlsxRows } from "./xlsx";

/** A tiny zip (stored or deflated entries), enough to test the reader without a real file. */
async function zip(files: Record<string, string>, deflate: boolean): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = enc.encode(text);
    const data = deflate
      ? new Uint8Array(
          await new Response(
            new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw")),
          ).arrayBuffer(),
        )
      : raw;
    const nameBytes = enc.encode(name);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, deflate ? 8 : 0, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    const entry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, deflate ? 8 : 0, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    parts.push(local, data);
    central.push(entry);
    offset += local.length + data.length;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out.buffer;
}

const sharedStrings = `<?xml version="1.0"?><sst><si><t>Due Date</t></si><si><t>Description</t></si><si><r><t>3rd Installment </t></r><r><t>3ª Prestação</t></r></si></sst>`;
const sheet = `<?xml version="1.0"?><worksheet><sheetData>
<row r="1"><c r="B1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>
<row r="2"><c r="B2" t="inlineStr"><is><t>05/12/2026</t></is></c><c r="C2" t="s"><v>2</v></c><c r="D2"><v>3650</v></c></row>
</sheetData></worksheet>`;

describe("readXlsxRows", () => {
  for (const deflate of [false, true]) {
    it(`reads shared, inline and number cells (${deflate ? "compressed" : "stored"})`, async () => {
      const file = await zip(
        { "xl/sharedStrings.xml": sharedStrings, "xl/worksheets/sheet1.xml": sheet },
        deflate,
      );
      expect(await readXlsxRows(file)).toEqual([
        ["", "Due Date", "Description"],
        ["", "05/12/2026", "3rd Installment 3ª Prestação", "3650"],
      ]);
    });
  }

  it("refuses files that aren't Excel", async () => {
    await expect(readXlsxRows(new TextEncoder().encode("hello").buffer)).rejects.toThrow(/Excel/);
  });
});

describe("readCsvRows", () => {
  it("reads commas or semicolons and quoted cells", () => {
    expect(readCsvRows('a;b\n"1,5 €";"x ""y"""\n')).toEqual([
      ["a", "b"],
      ["1,5 €", 'x "y"'],
    ]);
    expect(readCsvRows("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
